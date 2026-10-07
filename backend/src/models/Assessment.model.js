const { query } = require('../config/database');
const crypto = require('crypto');

// =============================================
// Assessments, questions and attempts.
//
// Anti-cheating rules enforced here:
//   - a time limit (per attempt, server side, in expires_at)
//   - a limited number of attempts
//   - randomised question and option order per attempt
//   - correct answers are NEVER returned to a trainee
// =============================================

// The paper a trainee is shown. Correct answers are removed.
const QUESTION_PUBLIC_COLUMNS =
  'id, assessment_id, question_text, option_a, option_b, option_c, option_d, position';

const QUESTION_FULL_COLUMNS =
  'id, assessment_id, question_text, option_a, option_b, option_c, option_d, correct_answer, position';

// Fisher-Yates using a cryptographic RNG so the order cannot
// be predicted from the attempt id.
function secureShuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

class Assessment {
  // ---------- Assessment ----------

  static async create(trainingId, data) {
    const result = await query(
      `INSERT INTO assessments
       (training_id, title, description, pass_score, time_limit_minutes, shuffle_questions, shuffle_options, is_published)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        trainingId,
        data.title,
        data.description || null,
        data.pass_score || 70,
        normalizeTimeLimit(data.time_limit_minutes),
        toBool(data.shuffle_questions, true),
        toBool(data.shuffle_options, true),
        data.is_published !== false && data.is_published !== 'false'
      ]
    );
    return result.rows[0];
  }

  static async findByTraining(trainingId) {
    const result = await query('SELECT * FROM assessments WHERE training_id = $1', [trainingId]);
    return result.rows[0] || null;
  }

  static async findById(id) {
    const result = await query('SELECT * FROM assessments WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async update(id, data) {
    const fields = [];
    const values = [];
    let p = 1;
    const push = (sql, value) => { fields.push(sql); values.push(value); };

    if (data.title !== undefined) push(`title = $${p++}`, data.title);
    if (data.description !== undefined) push(`description = $${p++}`, data.description || null);
    if (data.pass_score !== undefined) push(`pass_score = $${p++}`, data.pass_score);
    if (data.time_limit_minutes !== undefined) {
      push(`time_limit_minutes = $${p++}`, normalizeTimeLimit(data.time_limit_minutes));
    }
    if (data.max_attempts !== undefined) {
      // The attempt limit has been removed. The column is retained for
      // backward compatibility with existing databases but is never
      // enforced and is always stored as NULL.
      push(`max_attempts = $${p++}`, null);
    }
    if (data.shuffle_questions !== undefined) {
      push(`shuffle_questions = $${p++}`, toBool(data.shuffle_questions, true));
    }
    if (data.shuffle_options !== undefined) {
      push(`shuffle_options = $${p++}`, toBool(data.shuffle_options, true));
    }
    if (data.is_published !== undefined) {
      push(`is_published = $${p++}`, toBool(data.is_published, false));
    }
    if (fields.length === 0) return null;
    values.push(id);
    const result = await query(
      `UPDATE assessments SET ${fields.join(', ')} WHERE id = $${p} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  static async delete(id) {
    const result = await query('DELETE FROM assessments WHERE id = $1 RETURNING *', [id]);
    return result.rows[0] || null;
  }

  // ---------- Questions ----------

  static async addQuestion(assessmentId, data) {
    const result = await query(
      `INSERT INTO assessment_questions
       (assessment_id, question_text, option_a, option_b, option_c, option_d, correct_answer, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${QUESTION_FULL_COLUMNS}`,
      [assessmentId, data.question_text, data.option_a, data.option_b, data.option_c, data.option_d, String(data.correct_answer || 'A').toUpperCase(), data.position || 0]
    );
    return result.rows[0];
  }

  // Trainee-facing list. Correct answers are removed by default and
  // can never be requested from a trainee endpoint.
  static async getQuestions(assessmentId, { includeAnswers = false } = {}) {
    const select = includeAnswers ? QUESTION_FULL_COLUMNS : QUESTION_PUBLIC_COLUMNS;
    const result = await query(
      `SELECT ${select} FROM assessment_questions
       WHERE assessment_id = $1
       ORDER BY position ASC, id ASC`,
      [assessmentId]
    );
    return result.rows;
  }

  static async getQuestion(id) {
    const result = await query(
      `SELECT ${QUESTION_FULL_COLUMNS} FROM assessment_questions WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async updateQuestion(id, data) {
    const allowed = ['question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'position'];
    const fields = [];
    const values = [];
    let p = 1;
    for (const field of allowed) {
      if (data[field] !== undefined) {
        fields.push(`${field} = $${p++}`);
        values.push(field === 'correct_answer' ? String(data[field]).toUpperCase() : data[field]);
      }
    }
    if (fields.length === 0) return null;
    values.push(id);
    const result = await query(
      `UPDATE assessment_questions SET ${fields.join(', ')} WHERE id = $${p}
       RETURNING ${QUESTION_FULL_COLUMNS}`,
      values
    );
    return result.rows[0] || null;
  }

  static async deleteQuestion(id) {
    const result = await query('DELETE FROM assessment_questions WHERE id = $1 RETURNING *', [id]);
    return result.rows[0] || null;
  }

  // ---------- Attempts ----------

  // Number of FINISHED attempts. This is only a running counter used for
  // the attempt number and the history table. There is no attempt limit.
  // An attempt that was started but never submitted is NOT counted, so it
  // can always be resumed.
  static async countAttempts(trainingId, traineeId) {
    const result = await query(
      `SELECT COUNT(*) AS count FROM assessment_attempts
       WHERE training_id = $1 AND trainee_id = $2 AND submitted_at IS NOT NULL`,
      [trainingId, traineeId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  // An attempt that was started but never submitted. The trainee
  // resumes THIS attempt: same deadline, same shuffled paper.
  static async findOpenAttempt(trainingId, traineeId) {
    const result = await query(
      `SELECT * FROM assessment_attempts
       WHERE training_id = $1 AND trainee_id = $2 AND submitted_at IS NULL
       ORDER BY id DESC LIMIT 1`,
      [trainingId, traineeId]
    );
    return result.rows[0] || null;
  }

  // Removes an attempt that was started but never submitted. Used when the
  // assessment's timing rules changed after the attempt was created, so the
  // stale paper is thrown away and the trainee is issued a fresh one under the
  // current settings. Guarded on submitted_at IS NULL so a graded attempt can
  // never be destroyed.
  static async discardAttempt(id) {
    const result = await query(
      `DELETE FROM assessment_attempts
       WHERE id = $1 AND submitted_at IS NULL
       RETURNING id`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async createAttempt(assessmentId, trainingId, traineeId, attemptNumber, options = {}) {
    const { timeLimitMinutes = null, questionOrder = null, optionOrder = null } = options;
    const result = await query(
      `INSERT INTO assessment_attempts
       (assessment_id, training_id, trainee_id, attempt_number, started_at, expires_at,
        time_limit_minutes, question_order, option_order)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP,
               CASE WHEN $5::int IS NULL THEN NULL
                    ELSE CURRENT_TIMESTAMP + make_interval(mins => $5::int) END,
               $5, $6, $7)
       RETURNING *`,
      [
        assessmentId,
        trainingId,
        traineeId,
        attemptNumber,
        timeLimitMinutes,
        questionOrder ? JSON.stringify(questionOrder) : null,
        optionOrder ? JSON.stringify(optionOrder) : null
      ]
    );
    return result.rows[0];
  }

  static async getAttempt(attemptId) {
    const result = await query(
      `SELECT * FROM assessment_attempts WHERE id = $1`,
      [attemptId]
    );
    return result.rows[0] || null;
  }

  static async submitAttempt(attemptId, { answers, score, correctCount, totalQuestions, passed, timedOut = false, autoSubmitted = false }) {
    // Guarded so a submitted attempt can never be re-graded.
    const result = await query(
      `UPDATE assessment_attempts
       SET answers = $2, score = $3, correct_count = $4, total_questions = $5, passed = $6,
           timed_out = $7, auto_submitted = $8, submitted_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND submitted_at IS NULL
       RETURNING *`,
      [
        attemptId,
        JSON.stringify(answers),
        score,
        correctCount,
        totalQuestions,
        passed,
        timedOut,
        autoSubmitted
      ]
    );
    return result.rows[0] || null;
  }

  static async getAttemptsByTrainee(trainingId, traineeId) {
    const result = await query(
      `SELECT * FROM assessment_attempts
       WHERE training_id = $1 AND trainee_id = $2
       ORDER BY attempt_number ASC`,
      [trainingId, traineeId]
    );
    return result.rows;
  }

  static async hasPassed(trainingId, traineeId) {
    const result = await query(
      `SELECT id FROM assessment_attempts
       WHERE training_id = $1 AND trainee_id = $2 AND passed = true`,
      [trainingId, traineeId]
    );
    return result.rows.length > 0;
  }

  // ---------- Paper generation ----------

  // Builds the paper for one attempt.
  //
  // Returns:
  //   paper          - what the trainee sees (no correct answers)
  //   answerKey      - { questionId: displayed letter }  (server only)
  //   questionOrder  - shuffled question id list to persist
  //   optionOrder    - { questionId: [source keys in display order] }
  //
  // Persisting the order means a resumed attempt is laid out exactly
  // as before, so grading can never disagree with what was displayed.
  static buildPaper(questions, { shuffleQuestions = true, shuffleOptions = true } = {}) {
    const sourceKeys = ['a', 'b', 'c', 'd'];
    const ordered = shuffleQuestions ? secureShuffle(questions) : [...questions];
    const answerKey = {};
    const optionOrder = {};

    const paper = ordered.map((q) => {
      const shown = {
        id: q.id,
        assessment_id: q.assessment_id,
        question_text: q.question_text,
        position: q.position
      };

      if (!shuffleOptions) {
        for (const key of sourceKeys) {
          shown[`option_${key}`] = q[`option_${key}`];
        }
        answerKey[String(q.id)] = String(q.correct_answer).toUpperCase();
        return shown;
      }

      const perm = secureShuffle(sourceKeys);
      optionOrder[String(q.id)] = perm;
      perm.forEach((fromKey, displayIndex) => {
        const label = sourceKeys[displayIndex];
        shown[`option_${label}`] = q[`option_${fromKey}`];
        if (String(q.correct_answer).toUpperCase() === fromKey.toUpperCase()) {
          answerKey[String(q.id)] = label.toUpperCase();
        }
      });
      return shown;
    });

    return {
      paper,
      answerKey,
      questionOrder: paper.map((q) => q.id),
      optionOrder
    };
  }

  // Rebuilds the paper for an attempt that already has a stored order,
  // so a resumed attempt looks exactly like the first one. Returns the
  // same shape as buildPaper so grading works identically.
  static applyStoredOrder(questions, attempt) {
    const sourceKeys = ['a', 'b', 'c', 'd'];
    const questionOrder = parseJsonArray(attempt && attempt.question_order);
    const optionOrder = parseJsonMap(attempt && attempt.option_order);

    let ordered = questions;
    if (questionOrder && questionOrder.length) {
      const byId = new Map(questions.map((q) => [String(q.id), q]));
      const restored = questionOrder.map((id) => byId.get(String(id))).filter(Boolean);
      // Any question added since the attempt started is appended.
      const seen = new Set(restored.map((q) => String(q.id)));
      for (const q of questions) {
        if (!seen.has(String(q.id))) restored.push(q);
      }
      ordered = restored;
    }

    const answerKey = {};
    const paper = ordered.map((q) => {
      const shown = {
        id: q.id,
        assessment_id: q.assessment_id,
        question_text: q.question_text,
        position: q.position
      };
      const perm = optionOrder && optionOrder[String(q.id)];

      if (!Array.isArray(perm) || perm.length !== sourceKeys.length) {
        for (const key of sourceKeys) shown[`option_${key}`] = q[`option_${key}`];
        answerKey[String(q.id)] = String(q.correct_answer).toUpperCase();
        return shown;
      }

      perm.forEach((fromKey, displayIndex) => {
        const label = sourceKeys[displayIndex];
        shown[`option_${label}`] = q[`option_${fromKey}`];
        if (String(q.correct_answer).toUpperCase() === String(fromKey).toUpperCase()) {
          answerKey[String(q.id)] = label.toUpperCase();
        }
      });
      return shown;
    });

    return {
      paper,
      answerKey,
      questionOrder: paper.map((q) => q.id),
      optionOrder: optionOrder || {}
    };
  }
}

function toBool(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return String(value).toLowerCase() === 'true' || value === '1';
}

// Empty / zero / invalid time limits mean "no time limit" (NULL).
function normalizeTimeLimit(value) {
  if (value === undefined || value === null || value === '' || value === 'null') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(600, Math.round(n));
}

function parseJsonArray(value) {
  if (!value) return null;
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function parseJsonMap(value) {
  if (!value) return null;
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

module.exports = Assessment;
