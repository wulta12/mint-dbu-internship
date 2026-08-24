const { body } = require('express-validator');

exports.createSubjectValidation = [
  body('department_id')
    .notEmpty().withMessage('Department is required').bail()
    .isInt({ min: 1 }).withMessage('Invalid department'),

  body('name')
    .trim()
    .notEmpty().withMessage('Subject name is required')
    .isLength({ max: 150 }).withMessage('Subject name must be at most 150 characters'),

  body('description').optional({ nullable: true }).isLength({ max: 1000 }).withMessage('Description too long'),

  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean')
];

exports.updateSubjectValidation = [
  body('department_id').optional().isInt({ min: 1 }).withMessage('Invalid department'),

  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Subject name cannot be empty')
    .isLength({ max: 150 }).withMessage('Subject name must be at most 150 characters'),

  body('description').optional({ nullable: true }).isLength({ max: 1000 }).withMessage('Description too long')
];
