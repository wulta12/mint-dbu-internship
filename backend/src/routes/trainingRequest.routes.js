const express = require('express');
const router = express.Router();
const trainingRequestController = require('../controllers/trainingRequest.controller');
const { auth, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  approveValidation,
  rejectValidation
} = require('../validators/trainingRequest.validator');

// Trainee routes
// Request enrollment for a training (always starts as pending)
router.post('/:trainingId/request', auth, authorize('trainee'), trainingRequestController.requestForTraining);
// My enrollment requests with status
router.get('/my', auth, authorize('trainee'), trainingRequestController.getMy);

// Admin routes
// Request queue with filters: ?status= &department_id= &training_id= &search=
router.get('/', auth, authorize('admin'), trainingRequestController.getAll);
router.get('/:id', auth, trainingRequestController.getById);
router.put('/:id/approve', auth, authorize('admin'), approveValidation, validate, trainingRequestController.approve);
router.put('/:id/reject', auth, authorize('admin'), rejectValidation, validate, trainingRequestController.reject);

// Admin / Trainer
// Participants of a single training
router.get('/training/:trainingId', auth, authorize('admin', 'trainer'), trainingRequestController.getByTraining);
// Mark an approved enrollment as completed
router.put('/:id/complete', auth, authorize('admin', 'trainer'), trainingRequestController.markCompleted);

module.exports = router;
