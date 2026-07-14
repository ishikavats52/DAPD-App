const { body, param, query, validationResult } = require('express-validator');

const createRules = [
  body('tag').optional().isString().trim(),
  body('nomenclature').optional().isString().trim(),
  body('quantity').optional(),
  body('totalValue').optional(),
  body('gstExclusive').optional(),
  body('gstInclusive').optional(),
  body('grandTotal').optional(),
  body('companyName').optional().isString().trim(),
  body('vendorName').optional().isString().trim(),
  body('location').optional().isString().trim(),
  body('organisation').optional().isString().trim(),
  body('supplyOrder').optional().isString().trim(),
  body('supplyDate').optional().isString().trim(),
  body('uoNumber').optional().isString().trim(),
  body('narration').optional().isString().trim(),
  body('lineItems').optional().customSanitizer(value => {
    if (typeof value === 'string') {
      try { return JSON.parse(value); } catch(e) { return value; }
    }
    return value;
  }).isArray(),
  body('imageUrl').optional().isString().trim()
];

const updateRules = [
  param('id').isUUID(4).withMessage('Invalid ID'),
  ...createRules
];

const listRules = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
];

const searchRules = [
  query('q').optional().isString().trim(),
  query('filterBy').optional().isString().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
];

const tagParamRules = [
  param('tag').notEmpty().isString().trim()
];

const getOneParamRules = [
  param('id').isUUID(4).withMessage('Invalid ID')
];

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
}

module.exports = {
  createRules,
  updateRules,
  listRules,
  searchRules,
  tagParamRules,
  getOneParamRules,
  validate
};
