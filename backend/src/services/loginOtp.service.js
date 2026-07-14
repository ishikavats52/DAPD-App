const crypto = require('crypto');
const AppError = require('../utils/AppError');
const { maskEmail } = require('../utils/email');
const { maskPhone, normalizePhoneToE164 } = require('../utils/phone');
const { ROLES, normalizeRole } = require('../constants/roles');
const {
  isConsoleOtpEnabled,
  isOtpDeliveryEnabled,
  logOtpToConsole,
  sendLoginOtpSms,
  sendResetPasswordOtpSms,
  sendChangePasswordOtpSms,
  verifyOtpViaTwilioVerify
} = require('./twilio.service');
const {
  isSmtpConfigured,
  sendLoginOtpEmail
} = require('./email.service');

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;
const OTP_PURPOSE = {
  LOGIN: 'login',
  RESET: 'reset',
  CHANGE: 'change'
};
const challenges = new Map();

function otpSecret() {
  return process.env.JWT_SECRET?.trim() || 'login-otp-dev-secret';
}

function hashOtp(otp, challengeId) {
  return crypto.createHmac('sha256', otpSecret()).update(`${challengeId}:${otp}`).digest('hex');
}

function generateOtp() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

function purgeExpired() {
  const now = Date.now();
  for (const [id, row] of challenges.entries()) {
    if (row.expiresAt <= now) challenges.delete(id);
  }
}

/** Only one active challenge per user + purpose (latest OTP wins). */
function revokeUserChallenges(userId, purpose) {
  for (const [id, row] of challenges.entries()) {
    if (row.userId === userId && row.purpose === purpose) {
      challenges.delete(id);
    }
  }
}

function roleUsesOtp(role) {
  const r = normalizeRole(role);
  return r === ROLES.ADMIN || r === ROLES.EMPLOYEE || r === ROLES.SUPERADMIN;
}

function isAdminOrEmployee(user) {
  const r = normalizeRole(user?.role);
  return r === ROLES.ADMIN || r === ROLES.EMPLOYEE;
}

function isLoginOtpRequired(user) {
  return roleUsesOtp(user?.role) && isOtpDeliveryEnabled();
}

function superadminDualChannel(role) {
  return normalizeRole(role) === ROLES.SUPERADMIN;
}

function purposeMessages(purpose) {
  if (purpose === OTP_PURPOSE.RESET) {
    return {
      invalid: 'Reset code expired or invalid. Request a new one.',
      expired: 'Reset code expired. Request a new one.',
      tooMany: 'Too many incorrect codes. Request a new reset code.',
      wrong: 'Incorrect reset code.',
      sendFailure: 'Could not send reset code. Try again later.'
    };
  }
  if (purpose === OTP_PURPOSE.CHANGE) {
    return {
      invalid: 'Verification code expired or invalid. Request a new one.',
      expired: 'Verification code expired. Request a new one.',
      tooMany: 'Too many incorrect codes. Request a new code.',
      wrong: 'Incorrect verification code.',
      sendFailure: 'Could not send verification code. Try again later.'
    };
  }
  return {
    invalid: 'Login code expired or invalid. Sign in again.',
    expired: 'Login code expired. Sign in again.',
    tooMany: 'Too many incorrect codes. Sign in again.',
    wrong: 'Incorrect login code.',
    sendFailure: 'Could not send login code. Try again later.'
  };
}

async function deliverOtp(user, otp, purpose) {
  const phone = normalizePhoneToE164(user.phone);
  if (!phone) {
    throw new AppError('No valid phone number on file. Contact your administrator.', 400);
  }

  const dualLogin = purpose === OTP_PURPOSE.LOGIN && superadminDualChannel(user.role);
  if (dualLogin && !isSmtpConfigured() && !isConsoleOtpEnabled()) {
    throw new AppError('Superadmin login requires SMTP email configuration.', 503);
  }
  if (dualLogin && !user.email?.trim()) {
    throw new AppError('No email on file. Contact your administrator.', 400);
  }

  let useLocalVerify = false;

  if (purpose === OTP_PURPOSE.LOGIN) {
    if (dualLogin) {
      // Superadmin: Twilio Verify on phone, SMTP on email (separate codes; either works)
      const result = await sendLoginOtpSms(phone, otp);
      useLocalVerify = result.useLocalVerify;
      const email = user.email.trim().toLowerCase();
      if (isSmtpConfigured()) {
        try {
          await sendLoginOtpEmail(email, otp);
        } catch (err) {
          console.error(`[loginOtp] Email OTP failed for ${email}:`, err?.message || err);
          if (isConsoleOtpEnabled()) {
            logOtpToConsole({
              kind: 'login (email — SMTP failed, console fallback)',
              toPhone: phone,
              toEmail: email,
              otp
            });
          } else {
            throw err;
          }
        }
      } else if (isConsoleOtpEnabled()) {
        logOtpToConsole({
          kind: 'login (email)',
          toPhone: phone,
          toEmail: email,
          otp
        });
      } else {
        throw new AppError('Superadmin login requires SMTP email configuration.', 503);
      }
    } else {
      // Regular admin/employee: use Twilio Verify
      const result = await sendLoginOtpSms(phone, otp);
      useLocalVerify = result.useLocalVerify;
    }
  } else if (purpose === OTP_PURPOSE.CHANGE) {
    const result = await sendChangePasswordOtpSms(phone, otp);
    useLocalVerify = result.useLocalVerify;
  } else {
    const result = await sendResetPasswordOtpSms(phone, otp);
    useLocalVerify = result.useLocalVerify;
  }

  const otpChannels = dualLogin ? ['phone', 'email'] : ['phone'];
  return {
    maskedPhone: maskPhone(phone),
    maskedEmail: dualLogin ? maskEmail(user.email) : undefined,
    otpChannels,
    dualChannel: dualLogin,
    useLocalVerify,
    phone
  };
}

async function createOtpChallenge(user, purpose) {
  purgeExpired();
  revokeUserChallenges(user._id, purpose);
  const messages = purposeMessages(purpose);

  const challengeId = crypto.randomUUID();
  const otp = generateOtp();
  const expiresAt = Date.now() + OTP_TTL_MS;
  const phone = normalizePhoneToE164(user.phone);

  challenges.set(challengeId, {
    userId: user._id,
    purpose,
    otpHash: hashOtp(otp, challengeId),
    expiresAt,
    attempts: 0,
    useLocalVerify: true,
    phone
  });

  try {
    const delivery = await deliverOtp(user, otp, purpose);
    
    challenges.get(challengeId).useLocalVerify = delivery.useLocalVerify;
    challenges.get(challengeId).dualChannel = Boolean(delivery.dualChannel);

    const base = {
      maskedPhone: delivery.maskedPhone,
      maskedEmail: delivery.maskedEmail,
      otpChannels: delivery.otpChannels,
      expiresInSeconds: Math.floor(OTP_TTL_MS / 1000)
    };

    if (purpose === OTP_PURPOSE.RESET) {
      return { resetChallengeId: challengeId, ...base };
    }
    if (purpose === OTP_PURPOSE.CHANGE) {
      return { changeChallengeId: challengeId, ...base };
    }
    return { loginChallengeId: challengeId, ...base };
  } catch (err) {
    challenges.delete(challengeId);
    if (err instanceof AppError) throw err;
    console.error(`[loginOtp] OTP delivery failed (${purpose}):`, err?.message || err);
    throw new AppError(messages.sendFailure, 503);
  }
}

async function verifyPhoneOtpChallenge(challengeId, otp, purpose) {
  purgeExpired();
  const messages = purposeMessages(purpose);

  const row = challenges.get(challengeId);
  if (!row || row.purpose !== purpose) {
    throw new AppError(messages.invalid, 401);
  }
  if (row.expiresAt <= Date.now()) {
    challenges.delete(challengeId);
    throw new AppError(messages.expired, 401);
  }

  const candidate = String(otp || '').trim();
  if (!/^\d{6}$/.test(candidate)) {
    const hint = row.dualChannel
      ? 'Enter the 6-digit code from your phone or email.'
      : 'Enter the 6-digit code from your phone.';
    throw new AppError(hint, 422);
  }

  row.attempts += 1;
  if (row.attempts > MAX_VERIFY_ATTEMPTS) {
    challenges.delete(challengeId);
    throw new AppError(messages.tooMany, 429);
  }

  let ok = false;

  if (row.dualChannel && !row.useLocalVerify) {
    const expected = hashOtp(candidate, challengeId);
    const localOk =
      expected.length === row.otpHash.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(row.otpHash));
    if (localOk) {
      ok = true;
    } else {
      try {
        ok = await verifyOtpViaTwilioVerify(row.phone, candidate);
      } catch (err) {
        console.error(`[loginOtp] Twilio verify failed:`, err?.message || err);
        ok = false;
      }
    }
  } else if (row.useLocalVerify) {
    const expected = hashOtp(candidate, challengeId);
    ok =
      expected.length === row.otpHash.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(row.otpHash));
  } else {
    try {
      ok = await verifyOtpViaTwilioVerify(row.phone, candidate);
    } catch (err) {
      console.error(`[loginOtp] Twilio verify failed:`, err?.message || err);
      ok = false;
    }
  }

  if (!ok) {
    throw new AppError(messages.wrong, 401);
  }

  challenges.delete(challengeId);
  return row.userId;
}

async function createLoginOtpChallenge(user) {
  return createOtpChallenge(user, OTP_PURPOSE.LOGIN);
}

async function verifyLoginOtpChallenge(loginChallengeId, otp) {
  return verifyPhoneOtpChallenge(loginChallengeId, otp, OTP_PURPOSE.LOGIN);
}

async function resendLoginOtpChallenge(loginChallengeId, user) {
  purgeExpired();
  const messages = purposeMessages(OTP_PURPOSE.LOGIN);

  const existingRow = challenges.get(loginChallengeId);
  if (!existingRow || existingRow.purpose !== OTP_PURPOSE.LOGIN) {
    throw new AppError(messages.invalid, 401);
  }
  if (existingRow.expiresAt <= Date.now()) {
    challenges.delete(loginChallengeId);
    throw new AppError(messages.expired, 401);
  }
  if (existingRow.userId !== user._id) {
    throw new AppError(messages.invalid, 401);
  }

  const otp = generateOtp();
  const expiresAt = Date.now() + OTP_TTL_MS;
  const phone = normalizePhoneToE164(user.phone);

  existingRow.otpHash = hashOtp(otp, loginChallengeId);
  existingRow.expiresAt = expiresAt;
  existingRow.attempts = 0;

  try {
    const delivery = await deliverOtp(user, otp, OTP_PURPOSE.LOGIN);
    existingRow.useLocalVerify = delivery.useLocalVerify;
    existingRow.dualChannel = Boolean(delivery.dualChannel);

    return {
      loginChallengeId,
      maskedPhone: delivery.maskedPhone,
      maskedEmail: delivery.maskedEmail,
      otpChannels: delivery.otpChannels,
      expiresInSeconds: Math.floor(OTP_TTL_MS / 1000)
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error(`[loginOtp] OTP resend failed:`, err?.message || err);
    throw new AppError(messages.sendFailure, 503);
  }
}

function getChallengeUserId(challengeId, purpose) {
  const row = challenges.get(challengeId);
  if (!row || row.purpose !== purpose) return null;
  if (row.expiresAt <= Date.now()) return null;
  return row.userId;
}

async function createResetOtpChallenge(user) {
  return createOtpChallenge(user, OTP_PURPOSE.RESET);
}

async function verifyResetOtpChallenge(resetChallengeId, otp) {
  return verifyPhoneOtpChallenge(resetChallengeId, otp, OTP_PURPOSE.RESET);
}

async function createChangePasswordOtpChallenge(user) {
  return createOtpChallenge(user, OTP_PURPOSE.CHANGE);
}

async function verifyChangePasswordOtpChallenge(changeChallengeId, otp) {
  return verifyPhoneOtpChallenge(changeChallengeId, otp, OTP_PURPOSE.CHANGE);
}

module.exports = {
  isLoginOtpRequired,
  isAdminOrEmployee,
  createLoginOtpChallenge,
  verifyLoginOtpChallenge,
  resendLoginOtpChallenge,
  getChallengeUserId,
  createResetOtpChallenge,
  verifyResetOtpChallenge,
  createChangePasswordOtpChallenge,
  verifyChangePasswordOtpChallenge
};
