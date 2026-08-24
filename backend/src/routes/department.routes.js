const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/department.controller');
const { auth, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  createDepartmentValidation,
  updateDepartmentValidation,
  toggleValidation
} = require('../validators/department.validator');

// Public routes
router.get('/', departmentController.getActive);
router.get('/all', departmentController.getAll);
router.get('/:id', departmentController.getById);
router.get('/:id/subjects', departmentController.getSubjects);

// Admin only
router.post('/', auth, authorize('admin'), createDepartmentValidation, validate, departmentController.create);
router.put('/:id', auth, authorize('admin'), updateDepartmentValidation, validate, departmentController.update);
router.put('/:id/toggle', auth, authorize('admin'), toggleValidation, validate, departmentController.toggleActive);

module.exports = router;
