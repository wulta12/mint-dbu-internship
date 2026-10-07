const LearningContent = require('../models/LearningContent.model');
const Training = require('../models/Training.model');
const TrainingRequest = require('../models/TrainingRequest.model');
const Assessment = require('../models/Assessment.model');
const Certificate = require('../models/Certificate.model');
const { describeVideoSource } = require('../services/videoSource.service');
const { ApiError } = require('../middleware/error');

const MIN_PROGRESS_FOR_ASSESSMENT = 75;

// A trainee may watch faster than real time (2x playback is common, and the
// players allow up to 4x), so the ceiling is generous. It still makes "PUT
// position=1" impossible, because claiming the whole video in one call
// advances far faster than any real player.
const MAX_VIDEO_PLAYBACK_RATE = 4;
// Small slack so a slightly slow/irregular report is not clamped.
const VIDEO_POSITION_TOLERANCE = 0.03;
// Even with a very long gap since the previous report, a single call may not
// credit more than this much of the video. This is what stops the "report 0,
// wait an hour, report 1" trick: the wait buys allowance, but never a whole
// video in one go.
const MAX_VIDEO_ADVANCE_PER_REPORT = 0.5;

// Positions are stored in a REAL column, so anything non-finite would write
// NULL and silently reset the trainee's progress. Clamping here keeps that
// impossible.
const normaliseFraction = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(1, n);
};

// The watch percentage a video lesson needs before it counts as complete.
const videoThresholdOf = (lesson) => {
  const percent = Number(lesson.video_progress_threshold);
  const safe = Number.isFinite(percent) && percent > 0 ? percent : 80;
  return { percent: Math.min(100, safe), fraction: Math.min(1, Math.max(0.1, safe / 100)) };
};

// A `link` lesson that actually points at a video host (YouTube, Vimeo, a
// direct media file) is a video in disguise: it must be watched, tracked and
// counted like a `video` lesson, never marked complete by clicking a link.
function isVideoLink(lesson) {
  if (!lesson || lesson.type !== 'link' || !lesson.external_url) return false;
  const source = describeVideoSource(lesson.external_url, null);
  return Boolean(source.provider) &&
    source.provider !== 'unknown' &&
    source.provider !== 'external';
}

// Every lesson the page renders as a video and the server enforces like one
// (that includes external video links).
function isVideoContent(lesson) {
  return Boolean(lesson && (lesson.type === 'video' || isVideoLink(lesson)));
}

// The URL that actually carries the video for a lesson.
function lessonVideoUrl(lesson) {
  if (!lesson) return null;
  return lesson.type === 'link' ? lesson.external_url : lesson.video_url;
}

function describeLessonVideo(lesson) {
  return describeVideoSource(lessonVideoUrl(lesson), lesson.type === 'video' ? lesson.file_path : null);
}

// Rejects forward jumps in video position that are too fast to be real
// playback. Rewinding is fine, but the credited position never goes backwards:
// progress is monotonic, so a second tab or a re-watch cannot erase it.
async function clampVideoPosition(trainingId, traineeId, lessonId, reported) {
  const claimed = normaliseFraction(reported);
  const record = await LearningContent.getProgressRecord(trainingId, traineeId, lessonId);

  // No stored baseline at all: nothing has been played yet, so no time has
  // been spent playing it. Only the tolerance is creditable, which makes
  // "first ever call claims position=1" impossible.
  if (!record) {
    return { position: Math.min(claimed, VIDEO_POSITION_TOLERANCE), clamped: claimed > VIDEO_POSITION_TOLERANCE };
  }

  const previous = normaliseFraction(record.last_video_position);

  // Nothing new to credit: keep the furthest point already reached.
  if (claimed <= previous) {
    return { position: previous, clamped: false };
  }

  const lastUpdate = record.updated_at ? new Date(record.updated_at).getTime() : Date.now();
  const elapsedSeconds = Math.max(0, (Date.now() - lastUpdate) / 1000);

  const maxAllowed = Math.min(
    1,
    previous + Math.min(
      elapsedSeconds * MAX_VIDEO_PLAYBACK_RATE + VIDEO_POSITION_TOLERANCE,
      MAX_VIDEO_ADVANCE_PER_REPORT
    )
  );

  if (claimed <= maxAllowed) {
    return { position: claimed, clamped: false };
  }

  return {
    position: Math.max(previous, Math.min(maxAllowed, 1)),
    clamped: true
  };
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

async function ensureEnrolled(trainingId, traineeId) {
  const enrolled = await TrainingRequest.isEnrolled(trainingId, traineeId);
  if (!enrolled) {
    throw new ApiError(403, 'You must be enrolled in this training to access its content');
  }
}

// True when every published required lesson is done.
//
// The lesson counts live on summary.progress, not on the summary itself, so
// reading them off the wrong level silently yields undefined and makes the
// check always false - which left the enrollment stuck in "approved" even after
// the trainee finished every lesson.
function isTrainingFullyComplete(summary) {
  const { total, completed } = (summary && summary.progress) || {};
  return Number(total) > 0 && Number(completed) >= Number(total);
}

// Build the full learning summary for a trainee for a training.
async function computeSummary(trainingId, traineeId) {
  const progress = await LearningContent.getTrainingProgress(trainingId, traineeId);
  const assessment = await Assessment.findByTraining(trainingId);
  const attempts = assessment ? await Assessment.getAttemptsByTrainee(trainingId, traineeId) : [];
  const lastAttempt = attempts.length ? attempts[attempts.length - 1] : null;
  const passed = assessment ? attempts.some((a) => a.passed) : false;
  const certificate = await Certificate.getForTrainee(trainingId, traineeId);

  const assessmentUnlocked = progress.percent >= MIN_PROGRESS_FOR_ASSESSMENT;

  // Raw attempt rows carry the stored `answers` array (which records
  // whether each question was right) plus the internal shuffle order.
  // Those must never reach a trainee, so the summary only ever exposes
  // this explicit allow-list of fields.
  const publicAttempt = (a) => ({
    id: a.id,
    attempt_number: a.attempt_number,
    score: a.score,
    correct_count: a.correct_count,
    total_questions: a.total_questions,
    passed: a.passed,
    started_at: a.started_at,
    expires_at: a.expires_at,
    time_limit_minutes: a.time_limit_minutes,
    timed_out: a.timed_out,
    auto_submitted: a.auto_submitted,
    submitted_at: a.submitted_at
  });

  return {
    progress,
    minProgressForAssessment: MIN_PROGRESS_FOR_ASSESSMENT,
    assessment: assessment
      ? {
          id: assessment.id,
          title: assessment.title,
          description: assessment.description,
          pass_score: assessment.pass_score,
          total_questions: (await Assessment.getQuestions(assessment.id)).length,
          time_limit_minutes: assessment.time_limit_minutes || null,
          shuffle_questions: assessment.shuffle_questions !== false,
          shuffle_options: assessment.shuffle_options !== false
        }
      : null,
    assessmentUnlocked,
    assessmentPassed: passed,
    attempts: attempts
      .filter((a) => a.submitted_at)
      .map(publicAttempt),
    lastAttempt: lastAttempt ? publicAttempt(lastAttempt) : null,
    certificate: certificate
      ? {
          id: certificate.id,
          certificate_number: certificate.certificate_number,
          issue_date: certificate.issue_date,
          status: certificate.status || 'valid'
        }
      : null,
    canGetCertificate: assessmentUnlocked && passed && !certificate
  };
}

// ------------------------------------------------------------
// Trainee learning
// ------------------------------------------------------------

// Full course + progress for the trainee learning page
exports.getCourse = async (req, res, next) => {
  try {
    const trainingId = req.params.trainingId;
    const training = await Training.findById(trainingId);
    if (!training) {
      throw new ApiError(404, 'Training not found');
    }

    if (req.user.role === 'trainee') {
      await ensureEnrolled(trainingId, req.user.id);
    } else {
      // Trainer / admin can preview
      if (req.user.role === 'trainer' && Number(training.trainer_id) !== Number(req.user.id)) {
        throw new ApiError(403, 'You can only manage trainings assigned to you');
      }
    }

    const lessons = await LearningContent.getPublishedLessonsByTraining(trainingId);
    const progressMap = req.user.role === 'trainee'
      ? await LearningContent.getProgressMap(trainingId, req.user.id)
      : {};
    const summary = req.user.role === 'trainee'
      ? await computeSummary(trainingId, req.user.id)
      : null;

    const nextIncomplete = req.user.role === 'trainee'
      ? await LearningContent.getNextIncompleteLesson(trainingId, req.user.id)
      : null;

    // Ordered flat list of published lessons with the trainee's status
    const activities = lessons.map((lesson, index) => {
      const progress = progressMap[lesson.id];
      const row = {
        id: lesson.id,
        module_id: lesson.module_id,
        module_title: lesson.module_title,
        title: lesson.title,
        type: lesson.type,
        position: lesson.position,
        order: index + 1,
        is_required: lesson.is_required,
        status: progress ? progress.status : 'not_started',
        last_video_position: progress ? Number(progress.last_video_position) : 0,
        completed_at: progress ? progress.completed_at : null
      };
      // Video lessons carry how they must be watched, so the player and the
      // "mark complete" control agree with the server's own rule. A `link`
      // lesson whose target is a video gets the same treatment.
      if (isVideoContent(lesson)) {
        const source = describeLessonVideo(lesson);
        row.video_trackable = source.trackable;
        row.video_provider = source.provider;
        row.video_attested = Boolean(progress && progress.video_attested_at);
      }
      return row;
    });

    // Build module tree with lessons
    const modules = await LearningContent.getModulesByTraining(trainingId);
    const tree = modules.map((m) => ({
      ...m,
      lessons: lessons
        .filter((l) => l.module_id === m.id)
        .map((l) => ({
          ...l,
          status: progressMap[l.id] ? progressMap[l.id].status : 'not_started',
          last_video_position: progressMap[l.id] ? Number(progressMap[l.id].last_video_position) : 0
        }))
    }));

    res.json({
      success: true,
      data: {
        training,
        modules: tree,
        activities,
        totalActivities: activities.length,
        nextIncompleteLessonId: nextIncomplete ? nextIncomplete.id : null,
        summary
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get a single published lesson with full content (for the player)
exports.getLesson = async (req, res, next) => {
  try {
    const lesson = await LearningContent.findLessonById(req.params.lessonId);
    if (!lesson) {
      throw new ApiError(404, 'Lesson not found');
    }
    if (!lesson.is_published && req.user.role !== 'admin') {
      if (req.user.role === 'trainer' && Number(req.user.id) === Number(lesson.training_id ? (await Training.findById(lesson.training_id)).trainer_id : null)) {
        // trainer may preview
      } else {
        throw new ApiError(404, 'Lesson not found');
      }
    }

    if (req.user.role === 'trainee') {
      await ensureEnrolled(lesson.training_id, req.user.id);
      await LearningContent.getOrCreateProgress(lesson.training_id, req.user.id, lesson.id);
    }

    const module = lesson.module_id
      ? (await require('../models/LearningContent.model').getModulesByTraining(lesson.training_id))
          .find((m) => m.id === lesson.module_id)
      : null;

    const payload = { ...lesson, module_title: module ? module.title : null };

    // The player needs to know whether it can measure real playback progress
    // before it offers any way of completing the lesson.
    if (isVideoContent(lesson)) {
      const source = describeLessonVideo(lesson);
      payload.video_trackable = source.trackable;
      payload.video_provider = source.provider;
      payload.video_untrackable_reason = source.trackable ? null : source.reason;
      const progress = req.user.role === 'trainee'
        ? await LearningContent.getProgressRecord(lesson.training_id, req.user.id, lesson.id)
        : null;
      payload.video_attested = Boolean(progress && progress.video_attested_at);
    }

    res.json({
      success: true,
      data: { lesson: payload }
    });
  } catch (error) {
    next(error);
  }
};

// Mark a lesson complete (text / pdf / document / link)
exports.completeLesson = async (req, res, next) => {
  try {
    if (req.user.role !== 'trainee') {
      throw new ApiError(403, 'Only trainees can mark lessons complete');
    }
    const lesson = await LearningContent.findLessonById(req.params.lessonId);
    if (!lesson) {
      throw new ApiError(404, 'Lesson not found');
    }
    await ensureEnrolled(lesson.training_id, req.user.id);

    // A required video (or a link lesson that is a video) can only be completed
    // by actually watching it. The generic "mark complete" button must not be
    // able to skip it, otherwise the video could be completed without being
    // viewed - opening an external video link in another tab is a bypass too.
    if (lesson.is_required && isVideoContent(lesson)) {
      const record = await LearningContent.getProgressRecord(lesson.training_id, req.user.id, lesson.id);
      const { percent, fraction } = videoThresholdOf(lesson);
      const watched = record ? normaliseFraction(record.last_video_position) : 0;
      const attested = Boolean(record && record.video_attested_at);
      if (!attested && watched < fraction) {
        throw new ApiError(
          400,
          `This video is required. You must watch at least ${percent}% of it before it can be completed.`
        );
      }
    }

    await LearningContent.completeLesson(lesson.training_id, req.user.id, lesson.id);
    const summary = await computeSummary(lesson.training_id, req.user.id);
    const nextIncomplete = await LearningContent.getNextIncompleteLesson(lesson.training_id, req.user.id);

    // Finishing the last required lesson completes the training, so record it
    // on the enrollment too. Otherwise the stored status stayed 'approved' and
    // the trainee's "Completed" card kept reading 0 for a training they had
    // actually finished.
    const justCompletedTraining =
      !nextIncomplete && isTrainingFullyComplete(summary);
    if (justCompletedTraining) {
      await TrainingRequest.markCompletedForTrainee(lesson.training_id, req.user.id);
    }

    res.json({
      success: true,
      message: 'Lesson completed successfully',
      data: {
        summary,
        nextIncompleteLessonId: nextIncomplete ? nextIncomplete.id : null,
        trainingCompleted: justCompletedTraining
      }
    });
  } catch (error) {
    next(error);
  }
};

// Save video watch position (0..1). Marks complete automatically once the
// required watch threshold is reached.
//
// The reported position is NOT trusted blindly: a client could otherwise
// PUT position=1 and "complete" a video without watching it. The server
// compares the claimed position against the previously stored position and
// how much wall-clock time has passed, and clamps implausible forward jumps.
exports.saveVideoPosition = async (req, res, next) => {
  try {
    if (req.user.role !== 'trainee') {
      throw new ApiError(403, 'Only trainees can save video progress');
    }
    const lesson = await LearningContent.findLessonById(req.params.lessonId);
    if (!lesson) {
      throw new ApiError(404, 'Lesson not found');
    }
    if (!isVideoContent(lesson)) {
      throw new ApiError(400, 'This lesson does not contain a playable video');
    }
    await ensureEnrolled(lesson.training_id, req.user.id);

    const reported = normaliseFraction(req.body.position);
    // The await matters: without it the clamp result is a Promise, and every
    // position is stored as NULL - which silently reset progress and made the
    // 80% rule impossible to ever satisfy.
    const { position, clamped } = await clampVideoPosition(
      lesson.training_id, req.user.id, lesson.id, reported
    );
    await LearningContent.saveVideoPosition(lesson.training_id, req.user.id, lesson.id, position);

    const { percent, fraction: threshold } = videoThresholdOf(lesson);
    const completed = position >= threshold;
    let summary = null;
    let nextIncompleteLessonId = null;
    let trainingCompleted = false;
    if (completed) {
      await LearningContent.completeLesson(lesson.training_id, req.user.id, lesson.id);
      summary = await computeSummary(lesson.training_id, req.user.id);
      const nextIncomplete = await LearningContent.getNextIncompleteLesson(lesson.training_id, req.user.id);
      nextIncompleteLessonId = nextIncomplete ? nextIncomplete.id : null;

      // A video can be the last outstanding lesson, so the same completion
      // bookkeeping as completeLesson applies here.
      if (!nextIncomplete && isTrainingFullyComplete(summary)) {
        await TrainingRequest.markCompletedForTrainee(lesson.training_id, req.user.id);
        trainingCompleted = true;
      }
    }

    res.json({
      success: true,
      data: {
        completed,
        position,
        required_position: threshold,
        threshold_percent: percent,
        // True when the claimed jump was too fast to be real playback;
        // the client should seek back to the accepted position.
        clamped,
        summary,
        nextIncompleteLessonId,
        trainingCompleted
      }
    });
  } catch (error) {
    next(error);
  }
};

// A video whose provider cannot report playback progress can never satisfy
// the 80% rule, which would leave the trainee permanently stuck on it. This
// endpoint is the only way out, and it is deliberately narrow:
//
//   - the lesson must be a video whose source the server classified as
//     UNTRACKABLE (a trackable video can never be attested, so the loophole
//     is closed for every provider that does support tracking),
//   - the trainee must be enrolled,
//   - the confirmation is stored with who/when, and only marks the lesson
//     complete once.
exports.attestVideoWatched = async (req, res, next) => {
  try {
    if (req.user.role !== 'trainee') {
      throw new ApiError(403, 'Only trainees can confirm a watched video');
    }
    const lesson = await LearningContent.findLessonById(req.params.lessonId);
    if (!lesson) {
      throw new ApiError(404, 'Lesson not found');
    }
    if (!isVideoContent(lesson)) {
      throw new ApiError(400, 'This lesson does not contain a playable video');
    }
    await ensureEnrolled(lesson.training_id, req.user.id);

    const source = describeLessonVideo(lesson);
    if (source.trackable) {
      throw new ApiError(
        400,
        'This video reports playback progress, so it must be watched to be completed.'
      );
    }

    const { percent } = videoThresholdOf(lesson);
    await LearningContent.attestVideoWatched(
      lesson.training_id, req.user.id, lesson.id, source.reason || 'external_provider'
    );
    if (lesson.is_required) {
      await LearningContent.completeLesson(lesson.training_id, req.user.id, lesson.id);
    }

    const summary = await computeSummary(lesson.training_id, req.user.id);
    const nextIncomplete = await LearningContent.getNextIncompleteLesson(lesson.training_id, req.user.id);

    // Attesting the last outstanding lesson finishes the training, so the
    // enrollment is marked completed here as well.
    const trainingCompleted = !nextIncomplete && isTrainingFullyComplete(summary);
    if (trainingCompleted) {
      await TrainingRequest.markCompletedForTrainee(lesson.training_id, req.user.id);
    }

    res.json({
      success: true,
      message: `Video confirmed as watched. The ${percent}% rule was not applied because this player cannot report progress.`,
      data: {
        summary,
        nextIncompleteLessonId: nextIncomplete ? nextIncomplete.id : null,
        trainingCompleted
      }
    });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------------------------
// Trainer / Admin content management
// ------------------------------------------------------------

async function ensureCanManage(req, trainingId) {
  const training = await Training.findById(trainingId);
  if (!training) {
    throw new ApiError(404, 'Training not found');
  }
  if (req.user.role === 'trainer' && Number(training.trainer_id) !== Number(req.user.id)) {
    throw new ApiError(403, 'You can only manage trainings assigned to you');
  }
  return training;
}

exports.getCourseTree = async (req, res, next) => {
  try {
    const training = await ensureCanManage(req, req.params.trainingId);
    const tree = await LearningContent.getCourseTree(training.id);
    const assessment = await Assessment.findByTraining(training.id);
    res.json({ success: true, data: { training, ...tree, assessment } });
  } catch (error) {
    next(error);
  }
};

// Modules
exports.createModule = async (req, res, next) => {
  try {
    const training = await ensureCanManage(req, req.params.trainingId);
    const modules = await LearningContent.getModulesByTraining(training.id);
    const module = await LearningContent.createModule(training.id, {
      ...req.body,
      position: modules.length + 1
    });
    res.status(201).json({ success: true, message: 'Module created successfully', data: { module } });
  } catch (error) {
    next(error);
  }
};

exports.updateModule = async (req, res, next) => {
  try {
    const module = await LearningContent.updateModule(req.params.id, req.body);
    if (!module) {
      throw new ApiError(404, 'Module not found');
    }
    res.json({ success: true, message: 'Module updated successfully', data: { module } });
  } catch (error) {
    next(error);
  }
};

exports.deleteModule = async (req, res, next) => {
  try {
    const module = await LearningContent.deleteModule(req.params.id);
    if (!module) {
      throw new ApiError(404, 'Module not found');
    }
    res.json({ success: true, message: 'Module deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.reorderModules = async (req, res, next) => {
  try {
    const training = await ensureCanManage(req, req.params.trainingId);
    await LearningContent.reorderModules(training.id, req.body.orderedIds || []);
    res.json({ success: true, message: 'Modules reordered successfully' });
  } catch (error) {
    next(error);
  }
};

// Lessons
exports.createLesson = async (req, res, next) => {
  try {
    const training = await ensureCanManage(req, req.params.trainingId);
    const lessons = await LearningContent.getLessonsByTraining(training.id);
    const lessonData = { ...req.body };
    if (req.file) {
      lessonData.file_name = req.file.originalname;
      lessonData.file_path = req.file.filename;
      lessonData.file_size = req.file.size;
      lessonData.file_type = req.file.mimetype;
      if (!lessonData.type) {
        lessonData.type = /pdf/i.test(req.file.mimetype) ? 'pdf' : 'document';
      }
    }
    const lesson = await LearningContent.createLesson(training.id, {
      ...lessonData,
      position: lessons.length + 1
    });
    res.status(201).json({ success: true, message: 'Lesson created successfully', data: { lesson } });
  } catch (error) {
    next(error);
  }
};

exports.updateLesson = async (req, res, next) => {
  try {
    const existing = await LearningContent.findLessonById(req.params.id);
    if (!existing) {
      throw new ApiError(404, 'Lesson not found');
    }
    await ensureCanManage(req, existing.training_id);
    const lessonData = { ...req.body };
    if (req.file) {
      lessonData.file_name = req.file.originalname;
      lessonData.file_path = req.file.filename;
      lessonData.file_size = req.file.size;
      lessonData.file_type = req.file.mimetype;
    }
    const lesson = await LearningContent.updateLesson(existing.id, lessonData);
    res.json({ success: true, message: 'Lesson updated successfully', data: { lesson } });
  } catch (error) {
    next(error);
  }
};

exports.deleteLesson = async (req, res, next) => {
  try {
    const lesson = await LearningContent.findLessonById(req.params.id);
    if (!lesson) {
      throw new ApiError(404, 'Lesson not found');
    }
    await ensureCanManage(req, lesson.training_id);
    await LearningContent.deleteLesson(lesson.id);
    res.json({ success: true, message: 'Lesson deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.reorderLessons = async (req, res, next) => {
  try {
    const training = await ensureCanManage(req, req.params.trainingId);
    await LearningContent.reorderLessons(training.id, req.body.orderedIds || []);
    res.json({ success: true, message: 'Lessons reordered successfully' });
  } catch (error) {
    next(error);
  }
};
