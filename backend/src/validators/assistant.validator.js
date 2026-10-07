const { body } = require('express-validator');

const chatValidation = [
  body('trainingId')
    .exists().withMessage('trainingId is required')
    .isInt({ gt: 0 }).withMessage('trainingId must be a valid training id'),
  body('lessonId')
    .optional({ nullable: true })
    .isInt({ gt: 0 }).withMessage('lessonId must be a valid lesson id'),
  body('message')
    .exists().withMessage('Message is required')
    .isString().withMessage('Message must be text')
    .trim().isLength({ min: 1, max: 2000 }).withMessage('Message must be between 1 and 2000 characters')
    .bail()
    .customSanitizer((value) => value.trim())
];

const trainerGenerationValidation = [
  body('trainingId')
    .exists().withMessage('trainingId is required')
    .isInt({ gt: 0 }).withMessage('trainingId must be a valid training id'),
  body('contentType')
    .exists().withMessage('contentType is required')
    .isIn(['module', 'lesson', 'assessment'])
    .withMessage('contentType must be module, lesson or assessment'),
  body('topic')
    .exists().withMessage('topic is required')
    .isString().withMessage('topic must be text')
    .trim().isLength({ min: 3, max: 200 })
    .withMessage('topic must be between 3 and 200 characters')
    .bail()
    .customSanitizer((value) => value.trim()),
  body('questionCount')
    .optional({ nullable: true })
    .isInt({ min: 3, max: 10 })
    .withMessage('questionCount must be between 3 and 10')
];

module.exports = { chatValidation, trainerGenerationValidation };