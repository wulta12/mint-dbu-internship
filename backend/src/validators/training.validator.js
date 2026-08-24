const { body } = require('express-validator');

exports.createTrainingValidation = [
  body('subject_id')
    .notEmpty().withMessage('Subject is required').bail()
    .isInt({ min: 1 }).withMessage('Invalid subject'),

  body('is_all_departments')
    .optional()
    .isBoolean().withMessage('Invalid value for all departments flag'),

  body('training_title')
    .trim()
    .notEmpty().withMessage('Training title is required')
    .isLength({ min: 3, max: 200 }).withMessage('Training title must be between 3 and 200 characters'),

  body('training_description')
    .optional({ nullable: true })
    .isLength({ max: 2000 }).withMessage('Training description must be at most 2000 characters'),

  body('training_type')
    .notEmpty().withMessage('Training type is required')
    .isIn(['Online', 'Offline', 'Hybrid']).withMessage('Training type must be Online, Offline, or Hybrid'),

  body('location_or_meeting_link')
    .optional({ nullable: true })
    .isLength({ max: 255 }).withMessage('Location/link must be at most 255 characters'),

  body('start_date')
    .notEmpty().withMessage('Start date is required')
    .isISO8601().withMessage('Start date must be a valid date'),

  body('end_date')
    .notEmpty().withMessage('End date is required')
    .isISO8601().withMessage('End date must be a valid date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.start_date)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),

  body('capacity')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('Capacity must be a positive number'),

  body('status')
    .optional()
    .isIn(['draft', 'open', 'closed', 'in_progress', 'completed']).withMessage('Invalid status'),

  body('trainer_id').optional({ values: 'falsy' }).isInt().withMessage('Invalid trainer')
];

exports.updateTrainingValidation = [
  body('subject_id').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Invalid subject'),
  body('is_all_departments').optional().isBoolean().withMessage('Invalid value for all departments flag'),
  body('training_title').optional().trim().isLength({ min: 3, max: 200 }).withMessage('Training title must be between 3 and 200 characters'),
  body('training_description').optional({ nullable: true }).isLength({ max: 2000 }).withMessage('Description too long'),
  body('training_type').optional().isIn(['Online', 'Offline', 'Hybrid']).withMessage('Training type must be Online, Offline, or Hybrid'),
  body('location_or_meeting_link').optional({ nullable: true }).isLength({ max: 255 }).withMessage('Location/link too long'),
  body('start_date').optional().isISO8601().withMessage('Start date must be a valid date'),
  body('end_date').optional().isISO8601().withMessage('End date must be a valid date'),
  body('capacity').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Capacity must be a positive number'),
  body('status').optional().isIn(['draft', 'open', 'closed', 'in_progress', 'completed']).withMessage('Invalid status'),
  body('trainer_id').optional({ values: 'falsy' }).isInt().withMessage('Invalid trainer')
];
