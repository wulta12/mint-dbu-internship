const express = require('express');
const router = express.Router();
const meetingController = require('../controllers/meeting.controller');
const { auth, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  createMeetingValidation,
  updateMeetingValidation,
  saveMeetingAttendanceValidation
} = require('../validators/meeting.validator');

// =============================================
// Live meetings for existing trainings.
//
// authorize() is the coarse role gate. The fine-grained rules —
// "trainer only for trainings assigned to them", "trainee only when
// approved" — are enforced in the controller, because they need the
// training/enrollment rows and cannot be expressed as a role check.
// =============================================

// Trainee: the training must have an approved enrollment for this user.
router.get(
  '/training/:trainingId',
  auth,
  authorize('trainee'),
  meetingController.getForParticipant
);

// Trainee's own meeting-attendance history (never includes meeting_link).
router.get('/my/attendance', auth, authorize('trainee'), meetingController.getMyAttendance);

// Management listing: admin for any training, trainer only for their own.
router.get(
  '/training/:trainingId/manage',
  auth,
  authorize('admin', 'trainer'),
  meetingController.getForManagement
);

router.post(
  '/training/:trainingId',
  auth,
  authorize('admin', 'trainer'),
  createMeetingValidation,
  validate,
  meetingController.create
);

// Single meeting + Zoom link. Authorised per meeting: admin, the owning
// trainer, or an approved participant of that meeting's training.
router.get('/:id', auth, meetingController.getById);

router.put(
  '/:id',
  auth,
  authorize('admin', 'trainer'),
  updateMeetingValidation,
  validate,
  meetingController.update
);

router.delete('/:id', auth, authorize('admin', 'trainer'), meetingController.remove);

// Per-meeting attendance: roster of approved participants + summary.
router.get('/:id/attendance', auth, authorize('admin', 'trainer'), meetingController.getAttendance);

router.put(
  '/:id/attendance',
  auth,
  authorize('admin', 'trainer'),
  saveMeetingAttendanceValidation,
  validate,
  meetingController.saveAttendance
);

module.exports = router;