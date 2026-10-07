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

// A trainee-facing attempt summary. It deliberately contains NO answer key
// and no stored answers, so nothing about the correct options can leak.
function publicAttempt(attempt) {
  if (!attempt) return null;
  return {
    id: attempt.id,
    attempt_number: attempt.attempt_number,
    score: attempt.score,
    correct_count: attempt.correct_count,
    total_questions: attempt.total_questions,
    passed: attempt.passed,
    started_at: attempt.started_at,
    expires_at: attempt.expires_at,
    time_limit_minutes: attempt.time_limit_minutes,
    timed_out: attempt.timed_out,
    auto_submitted: attempt.auto_submitted,
    submitted_at: attempt.submitted_at
  };
}

// Whole seconds left on the server clock. 0 once the deadline has passed.
function secondsRemaining(attempt) {
  if (!attempt || !attempt.expires_at) return null;
  const remaining = (new Date(attempt.expires_at).getTime() - Date.now()) / 1000;
  return remaining > 0 ? Math.floor(remaining) : 0;
}

// An open attempt is only resumable while it still matches the assessment's
// CURRENT timing rules. If the trainer changed the time limit after the
// attempt was created, resuming it would either show "No Time Limit" on an
// assessment the trainer now intends to be time-boxed, or silently move a
// deadline that is supposed to be fixed. Such an attempt is stale and the
// trainee is issued a fresh paper instead.
function isStaleAttempt(attempt, assessment) {
  if (!attempt) return false;
  const limit = Number(assessment.time_limit_minutes || 0);
  const attemptLimit = Number(attempt.time_limit_minutes || 0);

  if (limit !== attemptLimit) return true;

  // A time-boxed attempt must carry a real deadline, otherwise there is no
  // countdown to display and no server-side expiry to enforce.
  if (limit > 0 && !attempt.expires_at) return true;

  return false;
}

// How many finished attempts the trainee has used. This is a running
// counter used for the attempt number and the history table ONLY.
// There is no maximum: a trainee may sit the assessment as many times
// as they need.
function attemptsUsed(trainingId, traineeId) {
  return Assessment.countAttempts(trainingId, traineeId);
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
          attempts: []
        }
      });
    }

    const progress = await LearningContent.getTrainingProgress(trainingId, req.user.id);
    const attempts = await Assessment.getAttemptsByTrainee(trainingId, req.user.id);
    const passed = attempts.some((a) => a.passed);
    const questionCount = (await Assessment.getQuestions(assessment.id)).length;

    const used = await attemptsUsed(trainingId, req.user.id);
    const openAttemptRow = await Assessment.findOpenAttempt(trainingId, req.user.id);
    // A stale attempt is reported as absent so the trainee is never promised
    // a resume (or a timer) that the server would refuse to honour.
    const openAttempt = isStaleAttempt(openAttemptRow, assessment) ? null : openAttemptRow;

    res.json({
      success: true,
      data: {
        assessment: {
          id: assessment.id,
          title: assessment.title,
          description: assessment.description,
          pass_score: assessment.pass_score,
          total_questions: questionCount,
          is_published: assessment.is_published,
          time_limit_minutes: assessment.time_limit_minutes || null,
          // Running total for the history table. There is no attempt cap.
          attempts_used: used,
          shuffle_questions: assessment.shuffle_questions !== false,
          shuffle_options: assessment.shuffle_options !== false
        },
        progress,
        assessmentUnlocked: progress.percent >= MIN_PROGRESS_FOR_ASSESSMENT,
        minProgressForAssessment: MIN_PROGRESS_FOR_ASSESSMENT,
        passed,
        // An unfinished attempt: the trainee resumes it rather than
        // restarting, so a reload cannot buy extra time.
        openAttempt: publicAttempt(openAttempt),
        attempts: attempts.filter((a) => a.submitted_at).map(publicAttempt)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Trainee: start (or resume) an attempt -> returns questions WITHOUT answers
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

    // ---- Resume instead of restarting -------------------------------
    // A trainee who reloads or closes the tab continues the SAME attempt
    // with the SAME deadline. This is what stops "restart for extra time".
    let openAttempt = await Assessment.findOpenAttempt(trainingId, req.user.id);

    // If the timing rules changed after that attempt was created it can no
    // longer be honoured (it would resume without a countdown, or with the
    // wrong deadline). Drop it and fall through to a fresh attempt below.
    if (openAttempt && isStaleAttempt(openAttempt, assessment)) {
      await Assessment.discardAttempt(openAttempt.id);
      openAttempt = null;
    }

    if (openAttempt) {
      const remaining = secondsRemaining(openAttempt);
      if (remaining === 0) {
        // The deadline already passed while the trainee was away:
        // grade the (empty) attempt server-side instead of handing out
        // a fresh paper.
        const result = await gradeAndFinalise(openAttempt, assessment, [], {
          timedOut: true,
          autoSubmitted: true
        });
        return res.json({
          success: true,
          message: 'Your previous attempt reached the time limit and was submitted automatically.',
          data: { ...result, expired: true }
        });
      }
      const resumed = await respondWithPaper(req, res, trainingId, assessment, openAttempt, false);
      return resumed;
    }

    // ---- New attempt ------------------------------------------------
    // There is no attempt limit. Each finished attempt starts a fresh
    // attempt whose timer begins at the moment of this request, so the
    // countdown always reflects when the trainee actually started.
    const questions = await Assessment.getQuestions(assessment.id, { includeAnswers: true });
    if (questions.length === 0) {
      throw new ApiError(400, 'This assessment has no questions yet. Please contact your trainer.');
    }

    const attemptNumber = (await attemptsUsed(trainingId, req.user.id)) + 1;
    const timeLimit = assessment.time_limit_minutes || null;
    const { paper, questionOrder, optionOrder } = Assessment.buildPaper(questions, {
      shuffleQuestions: assessment.shuffle_questions !== false,
      shuffleOptions: assessment.shuffle_options !== false
    });

    const attempt = await Assessment.createAttempt(
      assessment.id,
      trainingId,
      req.user.id,
      attemptNumber,
      { timeLimitMinutes: timeLimit, questionOrder, optionOrder }
    );

    return respondWithPaper(req, res, trainingId, assessment, attempt, true);
  } catch (error) {
    next(error);
  }
};

// Shared response builder: never includes the answer key.
async function respondWithPaper(req, res, trainingId, assessment, attempt, isNew) {
  const questions = await Assessment.getQuestions(assessment.id, { includeAnswers: true });
  const { paper } = Assessment.applyStoredOrder(questions, attempt);

  res.status(isNew ? 201 : 200).json({
    success: true,
    message: isNew
      ? 'Assessment started. The timer has started and cannot be paused.'
      : 'Resumed your in-progress attempt. The original time limit still applies.',
    data: {
      resumed: !isNew,
      attempt: publicAttempt(attempt),
      seconds_remaining: secondsRemaining(attempt),
      server_time: new Date().toISOString(),
      assessment: {
        id: assessment.id,
        title: assessment.title,
        description: assessment.description,
        pass_score: assessment.pass_score,
        time_limit_minutes: attempt.time_limit_minutes || null,
        total_questions: paper.length
      },
      // The paper only. No correct_answer, no position hints.
      questions: paper.map((q) => ({
        id: q.id,
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d
      }))
    }
  });
}

// Grades an attempt against the answer key that matches the paper the
// trainee actually saw, stores the result and issues a certificate when
// the trainee passed with enough learning progress.
async function gradeAndFinalise(attempt, assessment, submittedAnswers, flags = {}) {
  const questions = await Assessment.getQuestions(assessment.id, { includeAnswers: true });
  const { paper, answerKey } = Assessment.applyStoredOrder(questions, attempt);

  let correctCount = 0;
  const gradedAnswers = [];
  for (const q of paper) {
    const submitted = submittedAnswers.find((a) => Number(a.question_id) === Number(q.id));
    const answer = submitted ? String(submitted.answer || '').toUpperCase() : '';
    const correct = answer !== '' && answer === answerKey[String(q.id)];
    if (correct) correctCount++;
    gradedAnswers.push({
      question_id: q.id,
      answer,
      correct
    });
  }

  const total = paper.length;
  const score = total === 0 ? 0 : Math.round((correctCount / total) * 100);
  const passed = score >= (assessment.pass_score || 70);

  const updated = await Assessment.submitAttempt(attempt.id, {
    answers: gradedAnswers,
    score,
    correctCount,
    totalQuestions: total,
    passed,
    timedOut: flags.timedOut,
    autoSubmitted: flags.autoSubmitted
  });

  // Auto-issue certificate when the trainee passes and has >=75% progress.
  let certificate = null;
  if (passed) {
    const progress = await LearningContent.getTrainingProgress(attempt.training_id, attempt.trainee_id);
    if (progress.percent >= MIN_PROGRESS_FOR_ASSESSMENT) {
      certificate = await Certificate.issueIfEligible(attempt.training_id, attempt.trainee_id);
      // A certificate and a "Completed" training are the same fact, so both
      // issuance paths must record it. Without this the trainee ended up with a
      // certificate while their dashboard still counted 0 completed trainings.
      if (certificate) {
        await TrainingRequest.markCompletedForTrainee(
          attempt.training_id,
          attempt.trainee_id
        );
      }
    }
  }

  return {
    attempt: publicAttempt(updated),
    pass_score: assessment.pass_score || 70,
    passed,
    timed_out: !!flags.timedOut,
    certificate: certificate
      ? {
          id: certificate.id,
          certificate_number: certificate.certificate_number,
          status: certificate.status || 'valid'
        }
      : null
  };
}

// Trainee: submit an attempt -> the score is always computed server-side
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

    // The deadline is checked on the SERVER, so changing the browser
    // clock (or staying on the page forever) buys nothing.
    const remaining = secondsRemaining(attempt);
    if (remaining === 0) {
      const result = await gradeAndFinalise(attempt, assessment, answers, {
        timedOut: true,
        autoSubmitted: true
      });
      return res.json({
        success: true,
        message: 'Time is up. Your assessment was submitted automatically.',
        data: result
      });
    }

    const result = await gradeAndFinalise(attempt, assessment, answers);
    res.json({
      success: true,
      message: result.passed
        ? 'Congratulations! You passed the assessment.'
        : 'Assessment submitted. You did not reach the passing score.',
      data: result
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

// Validates the trainer-configured anti-cheating settings.
function readAssessmentSettings(body) {
  const out = {};

  if (body.time_limit_minutes !== undefined) {
    if (body.time_limit_minutes === null || body.time_limit_minutes === '') {
      out.time_limit_minutes = null;
    } else {
      const minutes = Number(body.time_limit_minutes);
      if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 600) {
        throw new ApiError(400, 'Time limit must be between 1 and 600 minutes (or empty for no limit)');
      }
      out.time_limit_minutes = Math.round(minutes);
    }
  }

  if (body.shuffle_questions !== undefined) out.shuffle_questions = body.shuffle_questions;
  if (body.shuffle_options !== undefined) out.shuffle_options = body.shuffle_options;

  return out;
}

exports.upsert = async (req, res, next) => {
  try {
    const training = await ensureCanManage(req, req.params.trainingId);
    const settings = readAssessmentSettings(req.body);
    const payload = { ...req.body, ...settings };

    const existing = await Assessment.findByTraining(training.id);
    let assessment;
    if (existing) {
      assessment = await Assessment.update(existing.id, payload);
      res.json({ success: true, message: 'Assessment updated successfully', data: { assessment } });
    } else {
      assessment = await Assessment.create(training.id, payload);
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
    const correct = String(req.body.correct_answer || '').toUpperCase();
    if (!['A', 'B', 'C', 'D'].includes(correct)) {
      throw new ApiError(400, 'The correct answer must be A, B, C or D');
    }
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
    const { pool } = require('../config/database');
    const client = await pool.connect();
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
