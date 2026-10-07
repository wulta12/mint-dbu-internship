const TrainingRequest = require('../models/TrainingRequest.model');
const Training = require('../models/Training.model');
const TrainingMeeting = require('../models/TrainingMeeting.model');
const Notification = require('../models/Notification.model');
const emailService = require('../services/email.service');
const { ApiError } = require('../middleware/error');

// Renders a timestamp as a readable date, falling back to the raw value when
// the driver hands back something unparseable. `trainings.start_date` is a
// timezone-naive TIMESTAMP, so format in UTC; converting to server-local time
// would shift a midnight start date back by a day in negative-offset zones.
const formatDate = (value) => {
  if (!value) return 'n/a';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-GB', { timeZone: 'UTC' });
};

// Trainee requests enrollment for a training (status = pending).
// The trainee's department is derived from the authenticated user.
exports.requestForTraining = async (req, res, next) => {
  try {
    const trainingId = req.params.trainingId;
    const trainee = req.user;

    if (!trainee.department_id) {
      throw new ApiError(400, 'Please select your department in your profile first');
    }

    const training = await Training.findById(trainingId);
    if (!training) {
      throw new ApiError(404, 'Training not found');
    }

    if (training.status !== 'open') {
      throw new ApiError(400, 'Training is not open for registration');
    }

    // Department security: the training must be open to the trainee's department.
    // Handles all three assignment types:
    //   - all departments
    //   - explicit multi-department assignment (training_departments)
    //   - legacy single department (the subject's department)
    const allowed = await Training.isDepartmentAllowed(training, trainee.department_id);
    if (!allowed) {
      throw new ApiError(403, 'This training is not assigned to your department');
    }

    // Duplicate request prevention: only one active request per trainee per training.
    const hasActive = await TrainingRequest.hasActiveRequest(trainingId, trainee.id);
    if (hasActive) {
      throw new ApiError(400, 'You already have an active request for this training');
    }

    // Capacity check against actively enrolled trainees.
    const enrolledCount = await TrainingRequest.getEnrolledCount(trainingId);
    if (enrolledCount >= training.capacity) {
      throw new ApiError(400, 'Training is full');
    }

    const request = await TrainingRequest.request(trainingId, trainee.id);

    // Best effort: a failed bell write must not fail the enrollment.
    // Carries the whole request so admins can triage without opening the page.
    Notification.notifyAdmins({
      type: 'enrollment_request',
      title: 'New enrollment request',
      message: [
        `${trainee.full_name} requested "${training.training_title}".`,
        `Email: ${trainee.email || 'n/a'}`,
        trainee.phone ? `Phone: ${trainee.phone}` : null,
        `Department: ${trainee.department_name || 'n/a'}`,
        training.subject_name ? `Subject: ${training.subject_name}` : null,
        `Type: ${training.training_type || 'n/a'}`,
        `Starts: ${formatDate(training.start_date)}`,
        `Ends: ${formatDate(training.end_date)}`,
        training.location_or_meeting_link
          ? `Location / link: ${training.location_or_meeting_link}`
          : null,
        `Seats: ${training.approved_count}/${training.capacity} filled`,
        `Requested at: ${new Date().toISOString()}`
      ].filter(Boolean).join('\n'),
      link: '/admin/enrollments'
    }).catch((err) => console.error('Notification error:', err.message));

    res.status(201).json({
      success: true,
      message: 'Enrollment request submitted. Waiting for admin approval.',
      data: { request }
    });
  } catch (error) {
    next(error);
  }
};

// Trainee: all of their requests with training details
exports.getMy = async (req, res, next) => {
  try {
    const requests = await TrainingRequest.getByTrainee(req.user.id);
    res.json({ success: true, data: { requests } });
  } catch (error) {
    next(error);
  }
};

// Trainee deletes their own PENDING enrollment request. The request row is
// removed entirely, freeing the trainee to request the training again.
exports.cancel = async (req, res, next) => {
  try {
    const request = await TrainingRequest.findById(req.params.id);
    if (!request) {
      throw new ApiError(404, 'Request not found');
    }
    if (request.trainee_id !== req.user.id) {
      throw new ApiError(403, 'You can only delete your own enrollment request');
    }
    if (request.status !== 'pending') {
      throw new ApiError(400, 'Only pending requests can be deleted');
    }

    const deleted = await TrainingRequest.remove(request.id);
    if (!deleted) {
      throw new ApiError(404, 'Request not found');
    }
    res.json({
      success: true,
      message: 'Enrollment request deleted successfully',
      data: { deleted: deleted.id }
    });
  } catch (error) {
    next(error);
  }
};

// Admin: request queue with filters (status, department, training, search)
exports.getAll = async (req, res, next) => {
  try {
    const { status, department_id, training_id, search } = req.query;
    const requests = await TrainingRequest.getAll({
      status,
      department_id,
      training_id,
      search
    });
    res.json({ success: true, data: { requests } });
  } catch (error) {
    next(error);
  }
};

// Admin or the requesting trainee can view a single request
exports.getById = async (req, res, next) => {
  try {
    const request = await TrainingRequest.findById(req.params.id);
    if (!request) {
      throw new ApiError(404, 'Request not found');
    }

    if (req.user.role !== 'admin' && request.trainee_id !== req.user.id) {
      throw new ApiError(403, 'You do not have permission to view this request');
    }

    res.json({ success: true, data: { request } });
  } catch (error) {
    next(error);
  }
};

// Admin approves a pending request -> trainee becomes officially enrolled.
exports.approve = async (req, res, next) => {
  try {
    const request = await TrainingRequest.findById(req.params.id);
    if (!request) {
      throw new ApiError(404, 'Request not found');
    }

    if (request.status === 'approved') {
      throw new ApiError(400, 'This request is already approved');
    }
    if (request.status === 'completed') {
      throw new ApiError(400, 'This request is already completed');
    }
    // pending, rejected, and cancelled requests can all be approved:
    //   - rejected  -> re-approval
    //   - cancelled -> admin re-activation

    const training = await Training.findById(request.training_id);
    if (training && training.status !== 'open') {
      throw new ApiError(400, 'Cannot approve: training is not open for registration');
    }

    const enrolledCount = await TrainingRequest.getEnrolledCount(request.training_id);
    if (training && enrolledCount >= training.capacity) {
      throw new ApiError(400, 'Training is full');
    }

    const updated = await TrainingRequest.approve(request.id, req.user.id);

    // Best effort: the trainee is told they are enrolled even if the bell write fails.
    Notification.notifyUser(request.trainee_id, {
      type: 'enrollment_approved',
      title: 'Enrollment approved',
      message: `You are now enrolled in "${request.training_title}".`,
      link: '/trainee/my-trainings'
    }).catch((err) => console.error('Notification error:', err.message));

    // In addition to the bell notification above, email the trainee the
    // confirmation and the training details. For an online training where the
    // trainer has already prepared the Zoom meeting, the link and session
    // details ride along in the same mail.
    //
    // Awaited rather than fire-and-forget: the admin clicked "Approve" and the
    // response is the natural place to report whether the mail went out. Neither
    // this nor the bell write can fail the approval itself - the enrollment is
    // already committed above, and the try/catch keeps a mail outage from
    // turning a successful approval into a 500.
    let email = null;
    try {
      const nextMeeting = await TrainingMeeting.getNextUpcoming(request.training_id);
      email = await emailService.sendEnrollmentApprovedEmail({
        to: request.trainee_email,
        fullName: request.trainee_name,
        training: training || {
          training_title: request.training_title,
          training_description: request.training_description,
          training_type: request.training_type,
          start_date: request.start_date,
          end_date: request.end_date,
          location_or_meeting_link: request.location_or_meeting_link,
          subject_name: request.subject_name
        },
        meeting: nextMeeting
      });
    } catch (err) {
      console.error('Enrollment approval email error:', err.message);
      email = { delivered: false, reason: 'send_error' };
    }

    res.json({
      success: true,
      message: 'Enrollment approved. Trainee is now officially enrolled.',
      data: {
        request: updated,
        // Informational only: the enrollment succeeded regardless. A false here
        // means the trainee got the bell notification but not the email.
        email_sent: Boolean(email && email.delivered)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Admin rejects a pending request (optionally with a reason).
exports.reject = async (req, res, next) => {
  try {
    const request = await TrainingRequest.findById(req.params.id);
    if (!request) {
      throw new ApiError(404, 'Request not found');
    }

    if (request.status === 'rejected') {
      throw new ApiError(400, 'This request is already rejected');
    }
    if (request.status === 'completed') {
      throw new ApiError(400, 'This request is already completed');
    }
    // pending, approved, and cancelled requests can all be rejected:
    //   - approved -> admin revokes the enrollment
    //   - cancelled -> admin downgrades a withdrawn request

    const updated = await TrainingRequest.reject(request.id, req.user.id, req.body.reason);

    // Best effort: include the admin's reason so the trainee has it in the bell.
    Notification.notifyUser(request.trainee_id, {
      type: 'enrollment_rejected',
      title: 'Enrollment rejected',
      message: req.body.reason
        ? `Your request for "${request.training_title}" was rejected: ${req.body.reason}`
        : `Your request for "${request.training_title}" was rejected.`,
      link: '/trainee/my-trainings'
    }).catch((err) => console.error('Notification error:', err.message));

    res.json({
      success: true,
      message: 'Enrollment request rejected',
      data: { request: updated }
    });
  } catch (error) {
    next(error);
  }
};

// Admin / Trainer marks an approved participant as completed
exports.markCompleted = async (req, res, next) => {
  try {
    const request = await TrainingRequest.findById(req.params.id);
    if (!request) {
      throw new ApiError(404, 'Request not found');
    }
    if (request.status !== 'approved') {
      throw new ApiError(400, 'Only approved enrollments can be marked as completed');
    }

    const updated = await TrainingRequest.markCompleted(request.id);
    res.json({
      success: true,
      message: 'Enrollment marked as completed',
      data: { request: updated }
    });
  } catch (error) {
    next(error);
  }
};

// Participants for a training (admin, trainer)
exports.getByTraining = async (req, res, next) => {
  try {
    const requests = await TrainingRequest.getByTraining(req.params.trainingId);
    res.json({ success: true, data: { participants: requests } });
  } catch (error) {
    next(error);
  }
};

// Trainees who have completed one of the authenticated trainer's trainings.
// Feeds both the dashboard Completed card and its drill-down list, so they
// always agree.
exports.getCompletedByTrainer = async (req, res, next) => {
  try {
    const participants = await TrainingRequest.getCompletedByTrainer(req.user.id);
    res.json({ success: true, data: { participants } });
  } catch (error) {
    next(error);
  }
};
