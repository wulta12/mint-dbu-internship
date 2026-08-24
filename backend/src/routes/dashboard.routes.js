const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');

// Public statistics (home page + admin dashboard)
router.get('/stats', dashboardController.getStats);

module.exports = router;
