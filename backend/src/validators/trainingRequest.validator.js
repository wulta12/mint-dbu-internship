const { body } = require('express-validator');

exports.approveValidation = [
  body('status').optional().isIn(['approved', 'completed']).withMessage('Invalid status')
];

exports.rejectValidation = [
  body('reason')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 1000 }).withMessage('Rejection reason must be at most 1000 characters')
];
