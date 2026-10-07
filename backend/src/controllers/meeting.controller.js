const TrainingMeeting = require('../models/TrainingMeeting.model');
const MeetingAttendance = require('../models/MeetingAttendance.model');
const Training = require('../models/Training.model');
const TrainingRequest = require('../models/TrainingRequest.model');
const Notification = require('../models/Notification.model');
const emailService = require('../services/email.service');
const { formatMeetingWhen } = emailService;
const { ApiError } = require('../middleware/error');

// =============================================
// Authorisation for live meetings.
//
// Two independent questions, deliberately kept apart:
//
//   1. MANAGE  - admin for any training; a trainer only
//                for trainings assigned to them.
//   2. JOIN    - a trainee whose enrollment request is
//                approved (or completed).
//
// JOIN depends on the enrollment record ONLY. There is no
// learning-progress test anywhere, so a trainee at 0% and a
// trainee at 100% are treated identically. Progress and
// certificates keep their own separate rules, untouched.
//
// Every check is enforced here, server-side. Hiding a button
// in the frontend is presentation, never the control.
// =============================================

// Admin manages anything; a trainer manages only their own
// trainings. Returns the training or throws.
async function assertCanManageTraining(user, trainingId) {
  const training = await Training.findById(trainingId);
  if (!training) {
    throw new ApiError(404, 'Training not found');
  }

  if (user.role === 'admin') {
    return training;
  }

  if (user.role === 'trainer') {
    // trainings.trainer_id is the single source of truth for
    // "assigned to this trainer".
    if (Number(training.trainer_id) === Number(user.id)) {
      return training;
    }
    throw new ApiError(403, 'You can only manage meetings for trainings assigned to you');
  }

  throw new ApiError(403, 'Only trainers and administrators can manage meetings');
}

// A trainee may only reach meetings for a training they are an
// approved participant of. Pending / rejected / cancelled are all
// refused, and so is having no request at all.
async function assertApprovedParticipant(user, trainingId) {
  const training = await Training.findById(trainingId);
  if (!training) {
    throw new ApiError(404, 'Training not found');
  }

  const enrolled = await TrainingRequest.isEnrolled(trainingId, user.id);
  if (!enrolled) {
    // Deliberately the same message whether the request is
    // pending, rejected, cancelled or absent.
    throw new ApiError(403, 'You must have an approved enrollment to access this training\'s meetings');
  }

  return training;
}

// Resolve a meeting and authorise the caller against ITS training.
// mode: 'manage' (admin/owning trainer) or 'join' (approved trainee).
async function loadMeetingFor(user, meetingId, mode) {
  const meeting = await TrainingMeeting.findById(meetingId);
  if (!meeting) {
    throw new ApiError(404, 'Meeting not found');
  }

  if (mode === 'manage') {
    await assertCanManageTraining(user, meeting.training_id);
    return meeting;
  }

  if (user.role === 'admin') return meeting;
  if (user.role === 'trainer') {
    await assertCanManageTraining(user, meeting.training_id);
    return meeting;
  }

  await assertApprovedParticipant(user, meeting.training_id);
  return meeting;
}

// ---------------------------------------------------------------------------
// Trainee side
// ---------------------------------------------------------------------------

// Upcoming meetings for the logged-in trainee's approved training.
// No progress filter: approved enrollment is the whole test.
exports.getForParticipant = async (req, res, next) => {
  try {
    await assertApprovedParticipant(req.user, req.params.trainingId);

    const upcomingOnly = req.query.all !== 'true';
    const meetings = await TrainingMeeting.getForParticipant(
      req.params.trainingId,
      req.user.id,
      { upcomingOnly }
    );

    res.json({ success: true, data: { meetings } });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Telling trainees about a session
//
// A Zoom meeting is only useful to someone who knows it exists and when it is.
// Both the bell and the email carry the link, the date/time and the session
// title.
//
// Recipients are the approved participants of the meeting's training and
// nothing else. The roster query is already scoped to
// status IN ('approved','completed'), so pending / rejected / cancelled
// trainees and users with no request at all cannot receive a link through this
// path - the same test the join endpoints use.
//
// Never throws and never rejects: a mail or notification outage must not fail
// the create/update that triggered it, or the trainer would be told the meeting
// was not saved when it was.
// ---------------------------------------------------------------------------
const notifyParticipantsOfMeeting = async (meeting, training, { isUpdate = false } = {}) => {
  const when = formatMeetingWhen(meeting);

  const summary = [
    `Training: ${training.training_title}`,
    `Session: ${meeting.title || 'Online session'}`,
    when ? `When: ${when}` : null,
    `Join: ${meeting.meeting_link}`
  ].filter(Boolean).join('\n');

  let roster;
  try {
    roster = await TrainingMeeting.getRosterWithAttendance(meeting.id);
  } catch (error) {
    console.error('Meeting notification roster error:', error.message);
    return;
  }

  const recipients = roster.filter((row) => row.trainee_id);

  await Promise.all(
    recipients.map(async (participant) => {
      const link = '/trainee/my-trainings';

      // In-system bell notification.
      await Notification.notifyUser(participant.trainee_id, {
        type: isUpdate ? 'meeting_updated' : 'meeting_scheduled',
        title: isUpdate ? 'Meeting updated' : 'New online session scheduled',
        message: isUpdate
          ? `The Zoom session for "${training.training_title}" has been updated.\n${summary}`
          : `A Zoom session has been scheduled for "${training.training_title}".\n${summary}`,
        link
      }).catch((error) => console.error('Notification error:', error.message));

      // Email. A participant with no address on file still gets the bell.
      if (!participant.email) return;

      const delivery = await emailService
        .sendMeetingNotificationEmail({
          to: participant.email,
          fullName: participant.full_name,
          training,
          meeting,
          isUpdate
        })
        .catch((error) => {
          console.error('Meeting notification email error:', error.message);
          return { delivered: false, reason: 'send_error' };
        });

      if (delivery && !delivery.delivered) {
        console.warn(
          `[meeting-notify] user ${participant.trainee_id} (${participant.email}): mail NOT delivered` +
          ` [${delivery.reason}${delivery.responseCode ? ' ' + delivery.responseCode : ''}]`
        );
      }
    })
  );
};

// The parts of a meeting a trainee acts on. An update that touches none of them
// (a typo elsewhere, a field with no bearing on the session) is not worth
// emailing the whole cohort about.
const MEETING_NOTICE_FIELDS = ['title', 'meeting_link', 'meeting_date', 'start_time', 'end_time'];

const meetingNoticeChanged = (before, after) =>
  MEETING_NOTICE_FIELDS.some((field) => String(before[field] ?? '') !== String(after[field] ?? ''));

// ---------------------------------------------------------------------------
// Management side (admin + owning trainer)
// ---------------------------------------------------------------------------

exports.getForManagement = async (req, res, next) => {
  try {
    const training = await assertCanManageTraining(req.user, req.params.trainingId);
    const meetings = await TrainingMeeting.getByTraining(training.id);
    res.json({ success: true, data: { meetings, training_title: training.training_title } });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const training = await assertCanManageTraining(req.user, req.params.trainingId);

    const meeting = await TrainingMeeting.create({
      training_id: training.id,
      title: req.body.title,
      platform: req.body.platform || 'zoom',
      meeting_link: req.body.meeting_link,
      meeting_date: req.body.meeting_date,
      start_time: req.body.start_time,
      end_time: req.body.end_time,
      created_by: req.user.id
    });

    // Approved trainees hear about the new session immediately, by bell and by
    // email. Awaited so the response reflects what actually happened, but the
    // helper cannot throw, so this never fails the create.
    await notifyParticipantsOfMeeting(meeting, training, { isUpdate: false });

    res.status(201).json({
      success: true,
      message: 'Meeting created',
      data: { meeting }
    });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const meeting = await loadMeetingFor(req.user, req.params.id, 'join');
    res.json({ success: true, data: { meeting } });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const existing = await loadMeetingFor(req.user, req.params.id, 'manage');

    // Cross-field time validation. When only one of the two is
    // supplied, fall back to the stored value for the comparison.
    const start = req.body.start_time !== undefined ? req.body.start_time : existing.start_time;
    const end = req.body.end_time !== undefined ? req.body.end_time : existing.end_time;
    if (start && end && end <= start) {
      throw new ApiError(400, 'End time must be after start time');
    }

    const meeting = await TrainingMeeting.update(existing.id, req.body);

    // A reschedule or a new link is exactly what a trainee most needs to know,
    // so approved participants are notified again. An edit that leaves the
    // schedule and the link untouched is not worth emailing the cohort about.
    if (meeting && meetingNoticeChanged(existing, meeting)) {
      const training = await assertCanManageTraining(req.user, meeting.training_id);
      await notifyParticipantsOfMeeting(meeting, training, { isUpdate: true });
    }

    res.json({ success: true, message: 'Meeting updated', data: { meeting } });
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const existing = await loadMeetingFor(req.user, req.params.id, 'manage');
    await TrainingMeeting.delete(existing.id);
    res.json({ success: true, message: 'Meeting deleted' });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Attendance for one meeting (admin + owning trainer)
// ---------------------------------------------------------------------------

// Roster of approved participants plus whatever has been marked.
// Pending / rejected / cancelled trainees never appear.
exports.getAttendance = async (req, res, next) => {
  try {
    const meeting = await loadMeetingFor(req.user, req.params.id, 'manage');

    const roster = await TrainingMeeting.getRosterWithAttendance(meeting.id);
    const summary = await TrainingMeeting.getAttendanceSummary(meeting.id);

    res.json({
      success: true,
      data: { meeting, roster, summary }
    });
  } catch (error) {
    next(error);
  }
};

exports.saveAttendance = async (req, res, next) => {
  try {
    const meeting = await loadMeetingFor(req.user, req.params.id, 'manage');

    const records = req.body.records;
    if (!Array.isArray(records) || records.length === 0) {
      throw new ApiError(400, 'No attendance records provided');
    }

    // Never trust the submitted trainee ids: attendance may only be
    // recorded for approved participants of this meeting's training.
    const requestedIds = [...new Set(records.map((r) => Number(r.trainee_id)).filter(Boolean))];
    const eligible = await MeetingAttendance.assertApprovedParticipants(meeting.id, requestedIds);
    const eligibleSet = new Set(eligible);

    const accepted = records.filter(
      (r) => eligibleSet.has(Number(r.trainee_id)) && MeetingAttendance.ALLOWED_STATUSES.includes(r.status)
    );
    const rejectedCount = records.length - accepted.length;

    const saved = await MeetingAttendance.upsertBatch(meeting.id, accepted, req.user.id);

    res.json({
      success: true,
      message: rejectedCount
        ? `Attendance saved for ${saved.length} participant(s); ${rejectedCount} record(s) ignored because the trainee is not an approved participant`
        : `Attendance saved for ${saved.length} participant(s)`,
      data: { saved: saved.length, ignored: rejectedCount }
    });
  } catch (error) {
    next(error);
  }
};

// A trainee's own meeting history. Safe to expose to the trainee:
// meeting_link is deliberately not selected.
exports.getMyAttendance = async (req, res, next) => {
  try {
    const records = await MeetingAttendance.getByTrainee(req.user.id);
    res.json({ success: true, data: { records } });
  } catch (error) {
    next(error);
  }
};