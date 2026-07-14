const { body } = require('express-validator');
const { normalizePhoneToE164 } = require('./phone');

const phoneRequiredValidator = body('phone')
  .trim()
  .notEmpty().withMessage('Phone number is required')
  .custom((value) => {
    if (!normalizePhoneToE164(value)) {
      throw new Error('Invalid phone number format');
    }
    return true;
  });

module.exports = { phoneRequiredValidator };
