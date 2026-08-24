const Assessment = require('../models/Assessment.model');
const LearningContent = require('../models/LearningContent.model');
const Training = require('../models/Training.model');
const TrainingRequest = require('../models/TrainingRequest.model');
const Certificate = require('../models/Certificate.model');
const { ApiError } = require('../middleware/error');

const MIN_PROGRESS_FOR_ASSESSMENT = 75;

async function ensureEnrolled(trainingId, traineeId) {
  const enrolled = await TrainingRequest.isEnrolled(trainingId, traineeId);
  if (!enrolled) {
    throw new ApiError(403, 'You must be enrolled in this training to take the assessment');
  }
}

async function ensureAssessmentUnlocked(trainingId, traineeId) {
  const progress = await LearningContent.getTrainingProgress(trainingId, traineeId);
  if (progress.percent < MIN_PROGRESS_FOR_ASSESSMENT) {
    throw new ApiError(403, `Complete at least ${MIN_PROGRESS_FOR_ASSESSMENT}% of the training to unlock the final assessment. Current progress: ${progress.percent}%`);
  }
}

// Trainee: assessment status for a training
exports.getStatus = async (req, res, next) => {
  try {
    const trainingId = req.params.trainingId;
    await ensureEnrolled(trainingId, req.user.id);

    const assessment = await Assessment.findByTraining(trainingId);
    if (!assessment) {
      return res.json({
        success: true,
        data: {
          assessment: null,
          assessmentUnlocked: false,
          canRetake: false,
          attempts: []
        }
      });
    }

    const progress = await LearningContent.getTrainingProgress(trainingId, req.user.id);
    const attempts = await Assessment.getAttemptsByTrainee(trainingId, req.user.id);
    const passed = attempts.some((a) => a.passed);
    const questionCount = (await Assessment.getQuestions(assessment.id)).length;

    res.json({
      success: true,
      data: {
        assessment: {
          id: assessment.id,
          title: assessment.title,
          description: assessment.description,
          pass_score: assessment.pass_score,
          total_questions: questionCount,
          is_published: assessment.is_published
        },
        progress,
        assessmentUnlocked: progress.percent >= MIN_PROGRESS_FOR_ASSESSMENT,
        minProgressForAssessment: MIN_PROGRESS_FOR_ASSESSMENT,
        passed,
        canRetake: true,
        attempts: attempts.map((a) => ({
          id: a.id,
          attempt_number: a.attempt_number,
          score: a.score,
          correct_count: a.correct_count,
          total_questions: a.total_questions,
          passed: a.passed,
          submitted_at: a.submitted_at
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

// Trainee: start a new attempt -> returns questions (without answers)
exports.start = async (req, res, next) => {
  try {
    const trainingId = req.params.trainingId;
    await ensureEnrolled(trainingId, req.user.id);

    const assessment = await Assessment.findByTraining(trainingId);
    if (!assessment) {
      throw new ApiError(404, 'No final assessment found for this training');
    }
    if (!assessment.is_published) {
      throw new ApiError(403, 'The final assessment is not available yet');
    }
    await ensureAssessmentUnlocked(trainingId, req.user.id);

    const questions = await Assessment.getQuestions(assessment.id);
    if (questions.length === 0) {
      throw new ApiError(400, 'This assessment has no questions yet. Please contact your trainer.');
    }

    const attemptNumber = (await Assessment.countAttempts(trainingId, req.user.id)) + 1;
    const attempt = await Assessment.createAttempt(assessment.id, trainingId, req.user.id, attemptNumber);

    res.status(201).json({
      success: true,
      data: {
        attempt: {
          id: attempt.id,
          attempt_number: attempt.attempt_number,
          started_at: attempt.started_at
        },
        assessment: {
          id: assessment.id,
          title: assessment.title,
          description: assessment.description,
          pass_score: assessment.pass_score,
          total_questions: questions.length
        },
        questions
      }
    });
  } catch (error) {
    next(error);
  }
};

// Trainee: submit an attempt -> score is computed server-side
exports.submit = async (req, res, next) => {
  try {
    const attempt = await Assessment.getAttempt(req.params.attemptId);
    if (!attempt) {
      throw new ApiError(404, 'Attempt not found');
    }
    if (Number(attempt.trainee_id) !== Number(req.user.id)) {
      throw new ApiError(403, 'You do not have permission to submit this attempt');
    }
    if (attempt.submitted_at) {
      throw new ApiError(400, 'This attempt has already been submitted');
    }

    const assessment = await Assessment.findById(attempt.assessment_id);
    if (!assessment) {
      throw new ApiError(404, 'Assessment not found');
    }

    const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
    const questions = await Assessment.getQuestions(assessment.id, { includeAnswers: true });

    let correctCount = 0;
    const gradedAnswers = [];
    for (const q of questions) {
      const submitted = answers.find((a) => Number(a.question_id) === Number(q.id));
      const answer = submitted ? String(submitted.answer || '').toUpperCase() : '';
      const isCorrect = answer === String(q.correct_answer).toUpperCase();
      if (isCorrect) correctCount++;
      gradedAnswers.push({
        question_id: q.id,
        answer,
        correct: isCorrect,
        correct_answer: q.correct_answer
      });
    }

    const score = questions.length === 0 ? 0 : Math.round((correctCount / questions.length) * 100);
    const passed = score >= (assessment.pass_score || 70);

    const updated = await Assessment.submitAttempt(attempt.id, {
      answers: gradedAnswers,
      score,
      correctCount,
      totalQuestions: questions.length,
      passed
    });

    // Auto-issue certificate when the trainee passes and has >=75% progress
    let certificate = null;
    if (passed) {
      const progress = await LearningContent.getTrainingProgress(attempt.training_id, req.user.id);
      if (progress.percent >= MIN_PROGRESS_FOR_ASSESSMENT) {
        certificate = await Certificate.issueIfEligible(attempt.training_id, req.user.id);
      }
    }

    res.json({
      success: true,
      message: passed ? 'Congratulations! You passed the assessment.' : 'Assessment submitted. You did not reach the passing score.',
      data: {
        attempt: {
          id: updated.id,
          attempt_number: updated.attempt_number,
          score: updated.score,
          correct_count: updated.correct_count,
          total_questions: updated.total_questions,
          passed: updated.passed,
          submitted_at: updated.submitted_at
        },
        pass_score: assessment.pass_score || 70,
        passed,
        certificate: certificate
          ? { id: certificate.id, certificate_number: certificate.certificate_number }
          : null
      }
    });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------------------------
// Trainer / Admin assessment management
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

exports.upsert = async (req, res, next) => {
  try {
    const training = await ensureCanManage(req, req.params.trainingId);
    const existing = await Assessment.findByTraining(training.id);
    let assessment;
    if (existing) {
      assessment = await Assessment.update(existing.id, req.body);
      res.json({ success: true, message: 'Assessment updated successfully', data: { assessment } });
    } else {
      assessment = await Assessment.create(training.id, req.body);
      res.status(201).json({ success: true, message: 'Assessment created successfully', data: { assessment } });
    }
  } catch (error) {
    next(error);
  }
};

exports.get = async (req, res, next) => {
  try {
    const training = await ensureCanManage(req, req.params.trainingId);
    const assessment = await Assessment.findByTraining(training.id);
    const questions = assessment ? await Assessment.getQuestions(assessment.id, { includeAnswers: true }) : [];
    res.json({ success: true, data: { assessment, questions } });
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const assessment = await Assessment.findById(req.params.assessmentId);
    if (!assessment) {
      throw new ApiError(404, 'Assessment not found');
    }
    await ensureCanManage(req, assessment.training_id);
    await Assessment.delete(assessment.id);
    res.json({ success: true, message: 'Assessment deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.addQuestion = async (req, res, next) => {
  try {
    const assessment = await Assessment.findById(req.params.assessmentId);
    if (!assessment) {
      throw new ApiError(404, 'Assessment not found');
    }
    await ensureCanManage(req, assessment.training_id);
    const questions = await Assessment.getQuestions(assessment.id, { includeAnswers: true });
    const question = await Assessment.addQuestion(assessment.id, {
      ...req.body,
      position: questions.length + 1
    });
    res.status(201).json({ success: true, message: 'Question added successfully', data: { question } });
  } catch (error) {
    next(error);
  }
};

exports.updateQuestion = async (req, res, next) => {
  try {
    const question = await Assessment.getQuestion(req.params.questionId);
    if (!question) {
      throw new ApiError(404, 'Question not found');
    }
    const assessment = await Assessment.findById(question.assessment_id);
    await ensureCanManage(req, assessment.training_id);
    const updated = await Assessment.updateQuestion(question.id, req.body);
    res.json({ success: true, message: 'Question updated successfully', data: { question: updated } });
  } catch (error) {
    next(error);
  }
};

exports.deleteQuestion = async (req, res, next) => {
  try {
    const question = await Assessment.getQuestion(req.params.questionId);
    if (!question) {
      throw new ApiError(404, 'Question not found');
    }
    const assessment = await Assessment.findById(question.assessment_id);
    await ensureCanManage(req, assessment.training_id);
    await Assessment.deleteQuestion(question.id);
    res.json({ success: true, message: 'Question deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.reorderQuestions = async (req, res, next) => {
  try {
    const assessment = await Assessment.findById(req.params.assessmentId);
    if (!assessment) {
      throw new ApiError(404, 'Assessment not found');
    }
    await ensureCanManage(req, assessment.training_id);
    const orderedIds = req.body.orderedIds || [];
    const client = await require('../config/database').pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < orderedIds.length; i++) {
        await client.query(
          'UPDATE assessment_questions SET position = $1 WHERE id = $2 AND assessment_id = $3',
          [i + 1, orderedIds[i], assessment.id]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    res.json({ success: true, message: 'Questions reordered successfully' });
  } catch (error) {
    next(error);
  }
};
