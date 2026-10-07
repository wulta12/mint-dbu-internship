const { body } = require('express-validator');

// Zoom join URLs are http(s) and can carry a long ?pwd= token, so the
// only rule enforced here is scheme + length. The routes and controller
// already restrict WHO may store a link; this stops the stored value
// from becoming a javascript:/data: vector when rendered.
const isHttpUrl = (value) => {
  if (!/^https?:\/\//i.test(String(value).trim())) {
    throw new Error('Meeting link must start with http:// or https://');
  }
  return true;
};

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

// NOTE ON OPTIONAL FIELDS.
//
// Two express-validator behaviours bite here (v7.3.2):
//   1. .trim()/.toLowerCase() are SANITISERS and run even on an absent
//      field, rewriting undefined into ''. That would defeat .optional().
//   2. .optional() only works as a CHAIN METHOD, which is the pattern the
//      rest of this codebase uses. Passing {optional:true} as body()'s
//      second argument is silently ignored.
// So every optional field gets a normaliser that preserves undefined plus a
// chain-level .optional(), and an explicit skip-when-absent guard.
const normalize = (fn) => (value) => (value === undefined ? undefined : fn(value));
const trim = normalize((v) => String(v).trim());
const lower = normalize((v) => String(v).trim().toLowerCase());

// Per-field rules shared by create and update. On update each is
// optional, so editing just the title stays valid.
const fieldRules = (optional) => {
  const maybe = (chain) => (optional ? chain.optional() : chain);

  return {
    title: maybe(
      body('title')
        .customSanitizer(trim)
        .bail({ level: 'end' })
        .isLength({ min: 3, max: 200 })
        .withMessage('Meeting title must be between 3 and 200 characters')
    ),

    platform: maybe(
      body('platform')
        .customSanitizer(lower)
        .bail()
        .isIn(['zoom'])
        .withMessage('Only Zoom is supported')
    ),

    meeting_link: maybe(
      body('meeting_link')
        .customSanitizer(trim)
        .bail()
        .isLength({ min: 8, max: 1000 })
        .withMessage('Meeting link must be between 8 and 1000 characters')
        .bail()
        .custom(isHttpUrl)
    ),

    meeting_date: maybe(
      body('meeting_date').bail().isISO8601().withMessage('Meeting date must be a valid date')
    ),

    start_time: maybe(
      body('start_time').bail().matches(TIME_PATTERN).withMessage('Start time must be in HH:MM format')
    ),

    end_time: maybe(
      body('end_time').bail().matches(TIME_PATTERN).withMessage('End time must be in HH:MM format')
    )
  };
};

// Both times are guaranteed present on create, so compare directly.
exports.createMeetingValidation = [
  ...Object.values(fieldRules(false)),
  body('end_time').custom((value, { req }) => {
    if (value <= req.body.start_time) {
      throw new Error('End time must be after start time');
    }
    return true;
  })
];

exports.updateMeetingValidation = [
  ...Object.values(fieldRules(true)),
  // On update either time may be absent, and the controller falls back
  // to the stored value for the comparison it performs.
  body('end_time').custom((value, { req }) => {
    if (!value || !req.body.start_time) return true;
    if (value <= req.body.start_time) {
      throw new Error('End time must be after start time');
    }
    return true;
  })
];

exports.saveMeetingAttendanceValidation = [
  body('records').isArray({ min: 1 }).withMessage('At least one attendance record is required'),
  body('records.*.trainee_id')
    .isInt({ min: 1 })
    .withMessage('Each attendance record needs a valid trainee'),
  body('records.*.status')
    .isIn(['present', 'absent', 'late', 'excused'])
    .withMessage('Attendance status must be present, absent, late or excused')
];