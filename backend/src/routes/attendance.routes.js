const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');
const { auth, authorize } = require('../middleware/auth');

// Admin and trainer can manage attendance
router.get('/training/:trainingId', auth, authorize('admin', 'trainer'), attendanceController.getByTraining);
router.get('/training/:trainingId/summary', auth, authorize('admin', 'trainer'), attendanceController.getSummary);
router.post('/training/:trainingId', auth, authorize('admin', 'trainer'), attendanceController.saveBulk);

module.exports = router;
