const express = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { ROLES_ALL } = require('../constants/roles');
const requirePasswordCurrent = require('../middleware/requirePasswordCurrent');
const { uploadMultipleImages } = require('../middleware/uploadImage');
const MedicineController = require('../controllers/medicine.controller');
const {
  createRules,
  updateRules,
  listRules,
  searchRules,
  tagParamRules,
  getOneParamRules,
  validate
} = require('../utils/validateMedicine');

const router = express.Router();
router.use(auth, authorize(...ROLES_ALL));

// Read routes
router.get('/', listRules, validate, MedicineController.listActive);
router.get('/search', searchRules, validate, MedicineController.searchActive);
router.get('/by-tag/:tag', tagParamRules, validate, MedicineController.getByTag);
router.get('/:id', getOneParamRules, validate, MedicineController.getOne);

// Write routes
router.use(requirePasswordCurrent);

router.post(
  '/scan-image',
  uploadMultipleImages,
  MedicineController.scanImage
);

router.post(
  '/',
  uploadMultipleImages, // form-data if they upload image here directly
  createRules,
  validate,
  MedicineController.create
);

router.put(
  '/:id',
  uploadMultipleImages,
  updateRules,
  validate,
  MedicineController.update
);

router.delete('/:id', getOneParamRules, validate, MedicineController.softDelete);

module.exports = router;
