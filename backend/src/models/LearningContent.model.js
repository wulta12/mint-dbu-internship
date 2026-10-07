const { query } = require('../config/database');

// =============================================
// Learning content (modules + lessons) and
// persisted trainee progress.
// =============================================

class LearningContent {
  // ---------- Modules ----------

  static async createModule(trainingId, data) {
    const result = await query(
      `INSERT INTO training_modules (training_id, title, description, position)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [trainingId, data.title, data.description || null, data.position || 0]
    );
    return result.rows[0];
  }

  static async getModulesByTraining(trainingId) {
    const result = await query(
      `SELECT * FROM training_modules
       WHERE training_id = $1
       ORDER BY position ASC, id ASC`,
      [trainingId]
    );
    return result.rows;
  }

  static async updateModule(id, data) {
    const fields = [];
    const values = [];
    let p = 1;
    if (data.title !== undefined) { fields.push(`title = $${p++}`); values.push(data.title); }
    if (data.description !== undefined) { fields.push(`description = $${p++}`); values.push(data.description || null); }
    if (data.position !== undefined) { fields.push(`position = $${p++}`); values.push(data.position); }
    if (fields.length === 0) return null;
    values.push(id);
    const result = await query(
      `UPDATE training_modules SET ${fields.join(', ')} WHERE id = $${p} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  static async deleteModule(id) {
    const result = await query('DELETE FROM training_modules WHERE id = $1 RETURNING *', [id]);
    return result.rows[0] || null;
  }

  static async reorderModules(trainingId, orderedIds) {
    const client = await require('../config/database').pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < orderedIds.length; i++) {
        await client.query(
          `UPDATE training_modules SET position = $1 WHERE id = $2 AND training_id = $3`,
          [i + 1, orderedIds[i], trainingId]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ---------- Lessons ----------

  static async createLesson(trainingId, data) {
    const result = await query(
      `INSERT INTO lessons
       (module_id, training_id, title, type, content, video_url, video_progress_threshold,
        file_name, file_path, file_size, file_type, external_url, is_required, is_published, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        data.module_id || null,
        trainingId,
        data.title,
        data.type || 'text',
        data.content || null,
        data.video_url || null,
        data.video_progress_threshold || 80,
        data.file_name || null,
        data.file_path || null,
        data.file_size || 0,
        data.file_type || null,
        data.external_url || null,
        data.is_required !== false && data.is_required !== 'false',
        data.is_published !== false && data.is_published !== 'false',
        data.position || 0
      ]
    );
    return result.rows[0];
  }

  static async getLessonsByTraining(trainingId) {
    const result = await query(
      `SELECT l.*, m.title AS module_title
       FROM lessons l
       LEFT JOIN training_modules m ON l.module_id = m.id
       WHERE l.training_id = $1
       ORDER BY
         CASE WHEN m.position IS NULL THEN 1 ELSE 0 END ASC,
         m.position ASC,
         m.id ASC,
         l.position ASC,
         l.id ASC`,
      [trainingId]
    );
    return result.rows;
  }

  static async getPublishedLessonsByTraining(trainingId) {
    const result = await query(
      `SELECT l.*, m.title AS module_title
       FROM lessons l
       LEFT JOIN training_modules m ON l.module_id = m.id
       WHERE l.training_id = $1 AND l.is_published = true
       ORDER BY
         CASE WHEN m.position IS NULL THEN 1 ELSE 0 END ASC,
         m.position ASC,
         m.id ASC,
         l.position ASC,
         l.id ASC`,
      [trainingId]
    );
    return result.rows;
  }

  static async findLessonById(id) {
    const result = await query('SELECT * FROM lessons WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async updateLesson(id, data) {
    const allowed = [
      'module_id', 'title', 'type', 'content', 'video_url', 'video_progress_threshold',
      'file_name', 'file_path', 'file_size', 'file_type', 'external_url',
      'is_required', 'is_published', 'position'
    ];
    const fields = [];
    const values = [];
    let p = 1;
    for (const field of allowed) {
      if (data[field] !== undefined) {
        let value = data[field];
        // Empty module_id means "unassigned" (clears the module link)
        if (field === 'module_id' && (value === '' || value === null)) value = null;
        fields.push(`${field} = $${p++}`);
        values.push(value);
      }
    }
    if (fields.length === 0) return null;
    values.push(id);
    const result = await query(
      `UPDATE lessons SET ${fields.join(', ')} WHERE id = $${p} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  static async deleteLesson(id) {
    const result = await query('DELETE FROM lessons WHERE id = $1 RETURNING *', [id]);
    return result.rows[0] || null;
  }

  static async reorderLessons(trainingId, orderedIds) {
    const client = await require('../config/database').pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < orderedIds.length; i++) {
        await client.query(
          `UPDATE lessons SET position = $1 WHERE id = $2 AND training_id = $3`,
          [i + 1, orderedIds[i], trainingId]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Full course tree (used by trainer course builder)
  static async getCourseTree(trainingId) {
    const modules = await this.getModulesByTraining(trainingId);
    const lessons = await this.getLessonsByTraining(trainingId);
    return {
      modules: modules.map((m) => ({
        ...m,
        lessons: lessons.filter((l) => l.module_id === m.id)
      })),
      unassigned: lessons.filter((l) => !l.module_id)
    };
  }

  // ---------- Progress ----------

  static async getOrCreateProgress(trainingId, traineeId, lessonId) {
    const result = await query(
      `INSERT INTO trainee_progress (training_id, trainee_id, lesson_id, status)
       VALUES ($1, $2, $3, 'in_progress')
       ON CONFLICT (training_id, trainee_id, lesson_id)
       DO UPDATE SET status = trainee_progress.status
       RETURNING *`,
      [trainingId, traineeId, lessonId]
    );
    return result.rows[0];
  }

  static async getProgressMap(trainingId, traineeId) {
    const result = await query(
      `SELECT * FROM trainee_progress
       WHERE training_id = $1 AND trainee_id = $2`,
      [trainingId, traineeId]
    );
    const map = {};
    for (const row of result.rows) {
      map[row.lesson_id] = row;
    }
    return map;
  }

  // Existing progress row for one lesson, used to sanity-check reported
  // video positions before trusting them.
  static async getProgressRecord(trainingId, traineeId, lessonId) {
    const result = await query(
      `SELECT * FROM trainee_progress
       WHERE training_id = $1 AND trainee_id = $2 AND lesson_id = $3`,
      [trainingId, traineeId, lessonId]
    );
    return result.rows[0] || null;
  }

  // Stores the furthest point of the video reached so far.
  //
  // The write is monotonic (GREATEST) and coalesces NULL, because progress
  // must never move backwards: a second browser tab, a re-watch, or a stale
  // report would otherwise erase a trainee's real progress.
  static async saveVideoPosition(trainingId, traineeId, lessonId, position) {
    const value = Number.isFinite(Number(position)) ? Math.max(0, Math.min(1, Number(position))) : 0;
    const result = await query(
      `INSERT INTO trainee_progress (training_id, trainee_id, lesson_id, status, last_video_position)
       VALUES ($1, $2, $3, 'in_progress', $4)
       ON CONFLICT (training_id, trainee_id, lesson_id)
       DO UPDATE SET last_video_position = GREATEST(
                         COALESCE(trainee_progress.last_video_position, 0), EXCLUDED.last_video_position
                       ),
                     status = CASE WHEN trainee_progress.status = 'completed'
                                   THEN 'completed' ELSE 'in_progress' END,
                     updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [trainingId, traineeId, lessonId, value]
    );
    return result.rows[0];
  }

  // Records a trainee's own confirmation that they watched a video whose
  // provider cannot report playback progress. Stored with who and when so the
  // exception is auditable, never granted automatically.
  static async attestVideoWatched(trainingId, traineeId, lessonId, reason) {
    const result = await query(
      `INSERT INTO trainee_progress (training_id, trainee_id, lesson_id, status, video_attested_at, video_attested_reason)
       VALUES ($1, $2, $3, 'in_progress', CURRENT_TIMESTAMP, $4)
       ON CONFLICT (training_id, trainee_id, lesson_id)
       DO UPDATE SET video_attested_at = COALESCE(trainee_progress.video_attested_at, CURRENT_TIMESTAMP),
                     video_attested_reason = COALESCE(trainee_progress.video_attested_reason, EXCLUDED.video_attested_reason),
                     updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [trainingId, traineeId, lessonId, String(reason || '').slice(0, 255)]
    );
    return result.rows[0];
  }

  static async completeLesson(trainingId, traineeId, lessonId) {
    const result = await query(
      `INSERT INTO trainee_progress (training_id, trainee_id, lesson_id, status, completed_at)
       VALUES ($1, $2, $3, 'completed', CURRENT_TIMESTAMP)
       ON CONFLICT (training_id, trainee_id, lesson_id)
       DO UPDATE SET status = 'completed',
                     completed_at = COALESCE(trainee_progress.completed_at, CURRENT_TIMESTAMP),
                     updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [trainingId, traineeId, lessonId]
    );
    return result.rows[0];
  }

  // ---------- Progress calculation ----------

  // Total published + required lessons for a training
  static async getRequiredLessonCount(trainingId) {
    const result = await query(
      `SELECT COUNT(*) AS count FROM lessons
       WHERE training_id = $1 AND is_published = true AND is_required = true`,
      [trainingId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  // Training progress summary for a trainee (based on real completed activities)
  static async getTrainingProgress(trainingId, traineeId) {
    const totalRes = await query(
      `SELECT COUNT(*) AS count FROM lessons
       WHERE training_id = $1 AND is_published = true AND is_required = true`,
      [trainingId]
    );
    const total = parseInt(totalRes.rows[0].count, 10);

    const doneRes = await query(
      `SELECT COUNT(*) AS count
       FROM trainee_progress tp
       JOIN lessons l ON tp.lesson_id = l.id
       WHERE tp.training_id = $1 AND tp.trainee_id = $2
         AND tp.status = 'completed'
         AND l.is_published = true AND l.is_required = true`,
      [trainingId, traineeId]
    );
    const completed = parseInt(doneRes.rows[0].count, 10);

    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, percent };
  }

  // The next published+required lesson that the trainee has NOT completed yet.
  // Falls back to the first incomplete lesson, else null when everything is done.
  static async getNextIncompleteLesson(trainingId, traineeId) {
    const result = await query(
      `SELECT l.*
       FROM lessons l
       LEFT JOIN training_modules m ON l.module_id = m.id
       WHERE l.training_id = $1 AND l.is_published = true AND l.is_required = true
         AND NOT EXISTS (
           SELECT 1 FROM trainee_progress tp
           WHERE tp.lesson_id = l.id AND tp.trainee_id = $2 AND tp.status = 'completed'
         )
       ORDER BY
         CASE WHEN m.position IS NULL THEN 1 ELSE 0 END ASC,
         m.position ASC,
         m.id ASC,
         l.position ASC,
         l.id ASC
       LIMIT 1`,
      [trainingId, traineeId]
    );
    return result.rows[0] || null;
  }
}

module.exports = LearningContent;
