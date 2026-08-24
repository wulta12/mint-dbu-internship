const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports.controller');
const { auth, authorize } = require('../middleware/auth');

// Admin only
router.get('/overview', auth, authorize('admin'), reportsController.getOverview);

module.exports = router;
