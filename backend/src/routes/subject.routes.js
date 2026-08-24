const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subject.controller');
const { auth, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  createSubjectValidation,
  updateSubjectValidation
} = require('../validators/subject.validator');
const { toggleValidation } = require('../validators/department.validator');

// Public routes
router.get('/', subjectController.getActive);
router.get('/all', subjectController.getAll);
router.get('/department/:departmentId', subjectController.getByDepartment);
router.get('/:id', subjectController.getById);
router.get('/:id/trainings', subjectController.getTrainings);

// Admin only
router.post('/', auth, authorize('admin'), createSubjectValidation, validate, subjectController.create);
router.put('/:id', auth, authorize('admin'), updateSubjectValidation, validate, subjectController.update);
router.put('/:id/toggle', auth, authorize('admin'), toggleValidation, validate, subjectController.toggleActive);

module.exports = router;
