const { body } = require('express-validator');

exports.contactValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 150 }).withMessage('Name must be at most 150 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required').bail()
    .isEmail().withMessage('Please provide a valid email address')
    .isLength({ max: 150 }).withMessage('Email must be at most 150 characters'),

  body('subject')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 200 }).withMessage('Subject must be at most 200 characters'),

  body('message')
    .trim()
    .notEmpty().withMessage('Message is required')
    .isLength({ max: 2000 }).withMessage('Message must be at most 2000 characters')
];

// Admin: the body of a reply to a contact-form message.
exports.contactReplyValidation = [
  body('replyMessage')
    .trim()
    .notEmpty().withMessage('Reply message is required')
    .isLength({ max: 2000 }).withMessage('Reply message must be at most 2000 characters')
];
