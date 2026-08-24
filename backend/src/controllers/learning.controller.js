const LearningContent = require('../models/LearningContent.model');
const Training = require('../models/Training.model');
const TrainingRequest = require('../models/TrainingRequest.model');
const Assessment = require('../models/Assessment.model');
const Certificate = require('../models/Certificate.model');
const { ApiError } = require('../middleware/error');

const MIN_PROGRESS_FOR_ASSESSMENT = 75;

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

async function ensureEnrolled(trainingId, traineeId) {
  const enrolled = await TrainingRequest.isEnrolled(trainingId, traineeId);
  if (!enrolled) {
    throw new ApiError(403, 'You must be enrolled in this training to access its content');
  }
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

  return {
    progress,
    minProgressForAssessment: MIN_PROGRESS_FOR_ASSESSMENT,
    assessment: assessment
      ? {
          id: assessment.id,
          title: assessment.title,
          description: assessment.description,
          pass_score: assessment.pass_score,
          total_questions: (await Assessment.getQuestions(assessment.id)).length
        }
      : null,
    assessmentUnlocked,
    assessmentPassed: passed,
    attempts: attempts.map((a) => ({
      id: a.id,
      attempt_number: a.attempt_number,
      score: a.score,
      correct_count: a.correct_count,
      total_questions: a.total_questions,
      passed: a.passed,
      submitted_at: a.submitted_at
    })),
    lastAttempt,
    certificate: certificate
      ? {
          id: certificate.id,
          certificate_number: certificate.certificate_number,
          issue_date: certificate.issue_date
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
    const activities = lessons.map((lesson, index) => ({
      id: lesson.id,
      module_id: lesson.module_id,
      module_title: lesson.module_title,
      title: lesson.title,
      type: lesson.type,
      position: lesson.position,
      order: index + 1,
      is_required: lesson.is_required,
      status: progressMap[lesson.id] ? progressMap[lesson.id].status : 'not_started',
      last_video_position: progressMap[lesson.id] ? Number(progressMap[lesson.id].last_video_position) : 0,
      completed_at: progressMap[lesson.id] ? progressMap[lesson.id].completed_at : null
    }));

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

    res.json({
      success: true,
      data: { lesson: { ...lesson, module_title: module ? module.title : null } }
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

    await LearningContent.completeLesson(lesson.training_id, req.user.id, lesson.id);
    const summary = await computeSummary(lesson.training_id, req.user.id);
    const nextIncomplete = await LearningContent.getNextIncompleteLesson(lesson.training_id, req.user.id);

    res.json({
      success: true,
      message: 'Lesson completed successfully',
      data: { summary, nextIncompleteLessonId: nextIncomplete ? nextIncomplete.id : null }
    });
  } catch (error) {
    next(error);
  }
};

// Save video watch position (0..1). Marks complete automatically at 80%.
exports.saveVideoPosition = async (req, res, next) => {
  try {
    if (req.user.role !== 'trainee') {
      throw new ApiError(403, 'Only trainees can save video progress');
    }
    const lesson = await LearningContent.findLessonById(req.params.lessonId);
    if (!lesson) {
      throw new ApiError(404, 'Lesson not found');
    }
    if (lesson.type !== 'video') {
      throw new ApiError(400, 'This lesson is not a video');
    }
    await ensureEnrolled(lesson.training_id, req.user.id);

    const position = Math.max(0, Math.min(1, Number(req.body.position) || 0));
    await LearningContent.saveVideoPosition(lesson.training_id, req.user.id, lesson.id, position);

    const threshold = (lesson.video_progress_threshold || 80) / 100;
    const completed = position >= threshold;
    let summary = null;
    let nextIncompleteLessonId = null;
    if (completed) {
      await LearningContent.completeLesson(lesson.training_id, req.user.id, lesson.id);
      summary = await computeSummary(lesson.training_id, req.user.id);
      const nextIncomplete = await LearningContent.getNextIncompleteLesson(lesson.training_id, req.user.id);
      nextIncompleteLessonId = nextIncomplete ? nextIncomplete.id : null;
    }

    res.json({
      success: true,
      data: { completed, summary, nextIncompleteLessonId }
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
