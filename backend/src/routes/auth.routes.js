const express = require('express');
const { body } = require('express-validator');

const validateRequest = require('../middleware/validateRequest');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { ROLES } = require('../constants/roles');
const { strongPasswordRequired, strongPasswordOptional } = require('../utils/passwordPolicy');
const { phoneRequiredValidator } = require('../utils/phoneValidators');
const AuthController = require('../controllers/auth.controller');
const requirePasswordCurrent = require('../middleware/requirePasswordCurrent');

const router = express.Router();

// Public
router.post(
  '/admin-signup',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').trim().isEmail().withMessage('Valid email is required'),
    strongPasswordRequired('password'),
    phoneRequiredValidator
  ],
  validateRequest,
  AuthController.registerAdmin
);

router.post(
  '/login',
  [
    body('identifier').trim().notEmpty().withMessage('Phone or email is required'),
    body('password').trim().notEmpty().withMessage('Password is required')
  ],
  validateRequest,
  AuthController.login
);

router.post(
  '/verify-login-otp',
  [
    body('loginChallengeId').trim().notEmpty().withMessage('loginChallengeId is required'),
    body('otp').trim().notEmpty().withMessage('OTP is required')
  ],
  validateRequest,
  AuthController.verifyLoginOtp
);

router.post(
  '/resend-login-otp',
  [
    body('loginChallengeId').trim().notEmpty().withMessage('loginChallengeId is required')
  ],
  validateRequest,
  AuthController.resendLoginOtp
);

router.post(
  '/forgot-password',
  [
    body('phone').trim().notEmpty().withMessage('Phone is required')
  ],
  validateRequest,
  AuthController.forgotPassword
);

router.post(
  '/reset-password',
  [
    body('resetChallengeId').trim().notEmpty().withMessage('resetChallengeId is required'),
    body('otp').trim().notEmpty().withMessage('OTP is required'),
    strongPasswordRequired('newPassword')
  ],
  validateRequest,
  AuthController.resetPassword
);

// Authenticated
router.use(authMiddleware);

router.get('/me', AuthController.getCurrentUser);
router.post('/logout', AuthController.logout);

// Change password flow
router.post(
  '/change-password/request-otp',
  AuthController.requestChangePasswordOtp
);

router.post(
  '/change-password',
  [
    body('changeChallengeId').trim().notEmpty().withMessage('changeChallengeId is required'),
    body('otp').trim().notEmpty().withMessage('OTP is required'),
    strongPasswordRequired('newPassword')
  ],
  validateRequest,
  AuthController.changePassword
);

router.post(
  '/setup-password',
  authMiddleware,
  [
    body('newPassword').trim().notEmpty().withMessage('New password is required'),
    strongPasswordRequired('newPassword')
  ],
  validateRequest,
  AuthController.setupPassword
);

module.exports = router;
