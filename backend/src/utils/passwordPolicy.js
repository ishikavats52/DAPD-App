const { body } = require('express-validator');

function strongPasswordRequired(field) {
  return body(field)
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters');
}

function strongPasswordOptional(field) {
  return body(field).optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters');
}

module.exports = { strongPasswordRequired, strongPasswordOptional };
