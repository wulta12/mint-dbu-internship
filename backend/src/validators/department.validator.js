const { body } = require('express-validator');

exports.createDepartmentValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Department name is required')
    .isLength({ max: 100 }).withMessage('Department name must be at most 100 characters'),

  body('description').optional({ nullable: true }).isLength({ max: 1000 }).withMessage('Description too long'),

  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean')
];

exports.updateDepartmentValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Department name is required')
    .isLength({ max: 100 }).withMessage('Department name must be at most 100 characters'),

  body('description').optional({ nullable: true }).isLength({ max: 1000 }).withMessage('Description too long')
];

exports.toggleValidation = [
  body('is_active').isBoolean().withMessage('is_active must be a boolean')
];
