const express = require('express');
const { query } = require('express-validator');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { ROLES } = require('../constants/roles');
const requirePasswordCurrent = require('../middleware/requirePasswordCurrent');
const validateRequest = require('../middleware/validateRequest');
const AuditController = require('../controllers/audit.controller');

const router = express.Router();

router.use(auth, requirePasswordCurrent, authorize(ROLES.SUPERADMIN));

router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validateRequest,
  AuditController.list
);

module.exports = router;
