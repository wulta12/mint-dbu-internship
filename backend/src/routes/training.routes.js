const express = require('express');
const router = express.Router();
const trainingController = require('../controllers/training.controller');
const { auth, optionalAuth, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  createTrainingValidation,
  updateTrainingValidation
} = require('../validators/training.validator');

// Public routes
router.get('/', trainingController.getAll);
router.get('/available', trainingController.getAvailable);

// Authenticated routes
// Trainee: trainings for the trainee's own department (backend-enforced)
router.get('/department/mine', auth, authorize('trainee'), trainingController.getByDepartment);
// Trainer: trainings assigned to the trainer
router.get('/my-trainings', auth, authorize('trainer'), trainingController.getByTrainer);

// Public training detail (authenticated trainees restricted to their department in controller)
router.get('/:id', optionalAuth, trainingController.getById);

// Admin only
router.post('/', auth, authorize('admin'), createTrainingValidation, validate, trainingController.create);
router.put('/:id', auth, authorize('admin'), updateTrainingValidation, validate, trainingController.update);
router.delete('/:id', auth, authorize('admin'), trainingController.delete);

module.exports = router;
