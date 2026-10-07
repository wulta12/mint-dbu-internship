const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { auth, authorize } = require('../middleware/auth');

// Public statistics (home page + admin dashboard)
router.get('/stats', dashboardController.getStats);

// Trainee's own summary. Always derived from the authenticated user, never from
// a request parameter, so one trainee cannot read another's numbers.
router.get('/trainee', auth, authorize('trainee'), dashboardController.getTraineeStats);

module.exports = router;
