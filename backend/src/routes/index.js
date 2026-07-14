const express = require('express');
const authRoutes = require('./auth.routes');
const medicineRoutes = require('./medicine.routes');
const userRoutes = require('./user.routes');
const auditRoutes = require('./audit.routes');

function mountRoutes(app) {
  const router = express.Router();

  router.use('/auth', authRoutes);
  router.use('/medicines', medicineRoutes);
  router.use('/users', userRoutes);
  router.use('/audit', auditRoutes);

  app.use('/api', router);
}

module.exports = { mountRoutes };
