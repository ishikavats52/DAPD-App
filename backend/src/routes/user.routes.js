const express = require('express');
const { body, param, query } = require('express-validator');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validateRequest = require('../middleware/validateRequest');
const requirePasswordCurrent = require('../middleware/requirePasswordCurrent');
const { ROLES } = require('../constants/roles');
const { phoneRequiredValidator } = require('../utils/phoneValidators');
const { strongPasswordOptional } = require('../utils/passwordPolicy');
const UserController = require('../controllers/user.controller');

const router = express.Router();

router.use(auth, requirePasswordCurrent);

const employeeCreationRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  phoneRequiredValidator,
  strongPasswordOptional('password') // If omitted, provisioned password generated
];

const adminCreationRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  phoneRequiredValidator,
  strongPasswordOptional('password'),
  body('officeName').optional().trim(),
  body('designation').optional().trim(),
  body('location').optional().trim(),
  body('address').optional().trim(),
  body('state').optional().trim(),
  body('pincode').optional().trim()
];

const employeeUpdateRules = [
  param('id').isUUID(4).withMessage('Invalid ID'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().trim().isEmail().withMessage('Valid email is required'),
  body('phone').optional().trim(),
  body('isActive').optional().isBoolean(),
  strongPasswordOptional('password')
];

// Employee management by Admin/Superadmin
router.post(
  '/employees',
  authorize(ROLES.ADMIN, ROLES.SUPERADMIN),
  employeeCreationRules,
  validateRequest,
  UserController.createEmployee
);

// Admin management by Superadmin
router.post(
  '/admins',
  authorize(ROLES.SUPERADMIN),
  adminCreationRules,
  validateRequest,
  UserController.createAdmin
);

router.get(
  '/employees',
  authorize(ROLES.ADMIN, ROLES.SUPERADMIN),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validateRequest,
  UserController.listEmployees
);

router.put(
  '/employees/:id',
  authorize(ROLES.ADMIN, ROLES.SUPERADMIN),
  employeeUpdateRules,
  validateRequest,
  UserController.updateEmployee
);

router.delete(
  '/employees/:id',
  authorize(ROLES.ADMIN, ROLES.SUPERADMIN),
  [param('id').isUUID(4).withMessage('Invalid ID')],
  validateRequest,
  UserController.deleteEmployee
);

// Admin approvals by Superadmin
router.get(
  '/pending-admins',
  authorize(ROLES.SUPERADMIN),
  UserController.listPendingAdmins
);

router.post(
  '/admins/:id/approve',
  authorize(ROLES.SUPERADMIN),
  [param('id').isUUID(4).withMessage('Invalid ID')],
  validateRequest,
  UserController.approveAdmin
);

router.post(
  '/admins/:id/reject',
  authorize(ROLES.SUPERADMIN),
  [param('id').isUUID(4).withMessage('Invalid ID')],
  validateRequest,
  UserController.rejectAdmin
);

router.get(
  '/admins',
  authorize(ROLES.SUPERADMIN),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validateRequest,
  UserController.listApprovedAdmins
);

module.exports = router;
