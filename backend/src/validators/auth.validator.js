const { body } = require('express-validator');

exports.registerValidation = [
  body('full_name')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ max: 100 }).withMessage('Full name must be at most 100 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Valid email is required'),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

  body('phone').optional({ nullable: true }).isLength({ max: 50 }).withMessage('Phone must be at most 50 characters'),

  body('role').optional().isIn(['trainee', 'trainer']).withMessage('Invalid role'),

  body('department_id')
    .if(body('role').equals('trainee'))
    .notEmpty().withMessage('Please select your department').bail()
    .isInt({ min: 1 }).withMessage('Invalid department'),

  body('department').optional(),
  body('specialization').optional(),
  body('qualification').optional(),
  body('biography').optional()
];

exports.loginValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

exports.changePasswordValidation = [
  body('current_password').notEmpty().withMessage('Current password is required'),
  body('new_password')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
];

exports.updateProfileValidation = [
  body('full_name').optional().trim().isLength({ max: 100 }).withMessage('Full name must be at most 100 characters'),
  body('phone').optional({ nullable: true }).isLength({ max: 50 }).withMessage('Phone must be at most 50 characters'),
  body('department_id').optional({ nullable: true }),
  body('specialization').optional({ nullable: true }).isLength({ max: 200 }).withMessage('Specialization must be at most 200 characters'),
  body('qualification').optional({ nullable: true }).isLength({ max: 200 }).withMessage('Qualification must be at most 200 characters'),
  body('biography').optional({ nullable: true })
];

// Forgot Password: only the email is taken. The response is deliberately the
// same whether or not the address is registered.
exports.forgotPasswordValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Valid email is required'),
  body('lang').optional().isIn(['en', 'am']).withMessage('Invalid language')
];

// Resend takes the same body as the first request.
exports.resendOtpValidation = exports.forgotPasswordValidation;

// OTP verification. The code is exactly six digits: validating the shape here
// keeps obviously malformed input out of the database, and the remaining
// guessing is bounded by the per-code attempt counter in the model.
exports.verifyOtpValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Valid email is required'),
  body('otp')
    .trim()
    .notEmpty().withMessage('Verification code is required')
    .isLength({ min: 6, max: 6 }).withMessage('Verification code must be 6 digits')
    .isNumeric().withMessage('Verification code must be 6 digits')
];

// Reset Password: the token comes from the emailed link, not the body, so it
// is validated in the controller. New password must match the confirmation.
exports.resetPasswordValidation = [
  body('password')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
    .isLength({ max: 100 }).withMessage('New password must be at most 100 characters'),
  body('confirm_password')
    .notEmpty().withMessage('Please confirm your new password')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match')
];
