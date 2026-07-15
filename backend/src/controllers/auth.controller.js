const User = require('../models/User');
const { signUserToken } = require('../utils/jwt');
const { ROLES } = require('../constants/roles');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { logAudit } = require('../utils/auditLogger');
const { sendAdminSignupNotification } = require('../services/email.service');
const { normalizePhoneToE164 } = require('../utils/phone');
const {
  isLoginOtpRequired,
  createLoginOtpChallenge,
  verifyLoginOtpChallenge,
  resendLoginOtpChallenge,
  createResetOtpChallenge,
  verifyResetOtpChallenge,
  createChangePasswordOtpChallenge,
  verifyChangePasswordOtpChallenge,
  getChallengeUserId
} = require('../services/loginOtp.service');

exports.registerAdmin = asyncHandler(async (req, res) => {
  const { name, email, phone, password, officeName, designation, location, address, state, pincode } = req.body;

  const emailTaken = await User.emailTaken(email);
  if (emailTaken) {
    throw new AppError('Email is already registered', 400);
  }

  const phoneNorm = normalizePhoneToE164(phone);
  if (!phoneNorm) {
    throw new AppError('Invalid phone number format', 400);
  }

  const phoneTaken = await User.phoneTaken(phoneNorm);
  if (phoneTaken) {
    throw new AppError('Phone number is already registered', 400);
  }

  const user = await User.create({
    name,
    email,
    password,
    phone: phoneNorm,
    role: ROLES.ADMIN,
    isApproved: false,
    officeName,
    designation,
    location,
    address,
    state,
    pincode
  });

  const superadmins = await User.findByRole(ROLES.SUPERADMIN);
  for (const sa of superadmins) {
    if (sa.email) {
      sendAdminSignupNotification(sa.email, name).catch(console.error);
    }
  }

  await logAudit({
    userId: user._id,
    action: 'CREATE_USER',
    resource: 'User',
    resourceId: user._id,
    details: 'Self-registered admin (pending)',
    req
  });

  res.status(201).json({
    message: 'Registration successful. Waiting for superadmin approval.',
    user: User.toPublicUser(user)
  });
});

exports.login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  const lower = identifier.trim().toLowerCase();

  let user = null;
  if (lower.includes('@')) {
    user = await User.findByEmail(lower);
  } else {
    user = await User.findByPhone(identifier);
  }

  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  const isMatch = await User.comparePassword(user, password);
  if (!isMatch) {
    throw new AppError('Invalid credentials', 401);
  }

  if (!user.isActive) {
    throw new AppError('Account deactivated', 403);
  }
  if (!user.isApproved) {
    throw new AppError('Account pending superadmin approval', 403);
  }

  if (isLoginOtpRequired(user)) {
    const challenge = await createLoginOtpChallenge(user);
    return res.json({
      message: 'OTP sent',
      otpRequired: true,
      ...challenge
    });
  }

  const token = signUserToken(user);
  await logAudit({ userId: user._id, action: 'LOGIN', resource: 'User', req });

  res.json({
    message: 'Logged in successfully',
    token,
    user: User.toPublicUser(user)
  });
});

exports.verifyLoginOtp = asyncHandler(async (req, res) => {
  const { loginChallengeId, otp } = req.body;
  const userId = await verifyLoginOtpChallenge(loginChallengeId, otp);
  const user = await User.getById(userId);

  if (!user || !user.isActive || !user.isApproved) {
    throw new AppError('Account no longer active or approved', 403);
  }

  const token = signUserToken(user);
  await logAudit({ userId: user._id, action: 'LOGIN', resource: 'User', req });

  res.json({
    message: 'Logged in successfully',
    token,
    user: User.toPublicUser(user)
  });
});

exports.resendLoginOtp = asyncHandler(async (req, res) => {
  const { loginChallengeId } = req.body;
  const userId = getChallengeUserId(loginChallengeId, 'login');
  if (!userId) {
    throw new AppError('Login session expired. Please sign in again.', 401);
  }

  const user = await User.getById(userId);
  if (!user || !user.isActive || !user.isApproved) {
    throw new AppError('Account no longer active or approved', 403);
  }

  const challenge = await resendLoginOtpChallenge(loginChallengeId, user);
  res.json({
    message: 'OTP resent',
    ...challenge
  });
});

exports.logout = asyncHandler(async (req, res) => {
  await logAudit({ userId: req.user.id, action: 'LOGOUT', resource: 'User', req });
  res.json({ message: 'Logged out successfully' });
});

exports.getCurrentUser = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  const norm = normalizePhoneToE164(phone);
  if (!norm) {
    throw new AppError('Invalid phone number', 400);
  }

  const user = await User.findByPhone(norm);
  if (!user || !user.isActive) {
    return res.json({
      message: 'If an active account exists, a reset code was sent.',
      resetChallengeId: 'dummy'
    });
  }

  const challenge = await createResetOtpChallenge(user);
  res.json({
    message: 'If an active account exists, a reset code was sent.',
    ...challenge
  });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { resetChallengeId, otp, newPassword } = req.body;

  if (resetChallengeId === 'dummy') {
    throw new AppError('Incorrect reset code.', 401);
  }

  const userId = await verifyResetOtpChallenge(resetChallengeId, otp);
  const user = await User.getById(userId);
  if (!user || !user.isActive) {
    throw new AppError('Account no longer active.', 403);
  }

  await User.updatePasswordPlain(userId, newPassword);

  if (user.role === ROLES.SUPERADMIN) {
    await User.incrementSuperadminAuthVersion(userId);
  }

  await logAudit({
    userId,
    action: 'PASSWORD_RESET',
    resource: 'User',
    resourceId: userId,
    details: 'Password reset via OTP',
    req
  });

  res.json({ message: 'Password reset successfully. You can now log in.' });
});

exports.requestChangePasswordOtp = asyncHandler(async (req, res) => {
  const user = await User.getById(req.user.id);
  const challenge = await createChangePasswordOtpChallenge(user);
  res.json({ message: 'Verification code sent', ...challenge });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { changeChallengeId, otp, newPassword } = req.body;
  const userId = await verifyChangePasswordOtpChallenge(changeChallengeId, otp);
  
  if (userId !== req.user.id) {
    throw new AppError('Invalid verification session', 401);
  }

  await User.updatePasswordPlain(userId, newPassword);

  if (req.user.role === ROLES.SUPERADMIN) {
    await User.incrementSuperadminAuthVersion(userId);
  }

  await logAudit({
    userId,
    action: 'UPDATE_USER',
    resource: 'User',
    resourceId: userId,
    details: 'User changed their own password',
    req
  });

  res.json({ message: 'Password changed successfully. Please log in again.' });
});

exports.setupPassword = asyncHandler(async (req, res) => {
  const user = await User.getById(req.user.id);
  if (!user.mustChangePassword) {
    throw new AppError('Password change not required', 400);
  }

  const { newPassword } = req.body;
  
  // updatePasswordPlain hashes the password, clears mustChangePassword, and saves to DB
  await User.updatePasswordPlain(req.user.id, newPassword);

  await logAudit({
    userId: req.user.id,
    action: 'PASSWORD_RESET',
    resource: 'User',
    resourceId: req.user.id,
    details: 'Initial password setup',
    req
  });

  res.json({ message: 'Password updated successfully.', user: User.toPublicUser(user) });
});
