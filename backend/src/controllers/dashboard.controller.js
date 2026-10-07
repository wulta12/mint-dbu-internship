const { query } = require('../config/database');
const TrainingRequest = require('../models/TrainingRequest.model');

// Trainee dashboard summary.
//
// This exists because the dashboard used to assemble its own counts from three
// separate calls, and got "Completed" wrong: it counted only enrollments whose
// stored status was already 'completed', which is set on certificate issuance
// or a manual admin action. A trainee who had finished every lesson of a
// training still saw 0. The completion count now comes from real lesson
// progress, so the card matches what they can see in My Trainings.
exports.getTraineeStats = async (req, res, next) => {
  try {
    const traineeId = req.user.id;
    const departmentId = req.user.department_id;

    const [availableResult, completion, certificateResult, recentResult] = await Promise.all([
      // Trainings open for registration AND actually visible to this trainee.
      // This repeats the visibility rule from Training.getByDepartment on
      // purpose: counting every open training would include ones the trainee
      // cannot request, and the card would disagree with the list it links to.
      // A trainee without a department can be shown nothing, matching the 400
      // that /trainings/department/mine returns.
      query(
        `SELECT COUNT(*)::int AS total
           FROM trainings t
           LEFT JOIN subjects s ON t.subject_id = s.id
          WHERE t.status = 'open'
            AND $1::int IS NOT NULL
            AND (
              t.is_all_departments = true
              OR EXISTS (SELECT 1 FROM training_departments td
                          WHERE td.training_id = t.id AND td.department_id = $1)
              OR (NOT EXISTS (SELECT 1 FROM training_departments td2
                               WHERE td2.training_id = t.id)
                  AND s.department_id = $1)
            )`,
        [departmentId]
      ),
      TrainingRequest.getCompletionSummary(traineeId),
      query(
        `SELECT COUNT(*)::int AS total FROM certificates
         WHERE trainee_id = $1 AND status = 'valid'`,
        [traineeId]
      ),
      // Recent enrolments carry the same completion signal so the list under the
      // cards shows "Completed" for what the Completed card counted.
      query(
        `SELECT tr.id,
                tr.training_id,
                tr.status,
                tr.requested_at,
                t.training_title,
                t.training_type,
                t.status AS training_status,
                COALESCE(req.total, 0) AS required_lessons,
                COALESCE(done.done, 0) AS done_lessons,
                EXISTS (
                   SELECT 1 FROM certificates c
                   WHERE c.trainee_id = tr.trainee_id
                     AND c.training_id = tr.training_id
                     AND c.status = 'valid'
                ) AS has_certificate
         FROM training_requests tr
         JOIN trainings t ON t.id = tr.training_id
         LEFT JOIN (
           SELECT l.training_id, COUNT(*)::int AS total
           FROM lessons l
           WHERE l.is_published = true AND l.is_required = true
           GROUP BY l.training_id
         ) req ON req.training_id = tr.training_id
         LEFT JOIN (
           SELECT tp.training_id, COUNT(*)::int AS done
           FROM trainee_progress tp
           JOIN lessons l ON l.id = tp.lesson_id
           WHERE tp.trainee_id = $1
             AND tp.status = 'completed'
             AND l.is_published = true AND l.is_required = true
           GROUP BY tp.training_id
         ) done ON done.training_id = tr.training_id
         WHERE tr.trainee_id = $1
         ORDER BY tr.requested_at DESC
         LIMIT 4`,
        [traineeId]
      )
    ]);

    const recentTrainings = (recentResult.rows || []).map((r) => {
      const requiredLessons = parseInt(r.required_lessons, 10) || 0;
      const doneLessons = parseInt(r.done_lessons, 10) || 0;
      const isCompleted =
        r.status === 'completed' ||
        r.has_certificate === true ||
        (requiredLessons > 0 && doneLessons >= requiredLessons);

      return {
        ...r,
        required_lessons: requiredLessons,
        done_lessons: doneLessons,
        // 0-of-0 means the content was never built, so 0% is honest here.
        progress_percent: requiredLessons === 0 ? 0 : Math.round((doneLessons / requiredLessons) * 100),
        // Reported separately from `status` so the UI can show the real finished
        // state without a second request to work it out again.
        is_completed: isCompleted,
        status: isCompleted ? 'completed' : r.status
      };
    });

    res.json({
      success: true,
      data: {
        totalTrainings: parseInt(availableResult.rows[0]?.total, 10) || 0,
        enrolledTrainings: completion.enrolled,
        completedTrainings: completion.completed,
        certificates: parseInt(certificateResult.rows[0]?.total, 10) || 0,
        recentTrainings
      }
    });
  } catch (error) {
    next(error);
  }
};

// Public statistics for the home page / admin dashboard
exports.getStats = async (req, res, next) => {
  try {
    const trainersResult = await query(
      "SELECT COUNT(*) AS total FROM users WHERE role = 'trainer' AND is_active = true"
    );
    const traineesResult = await query(
      "SELECT COUNT(*) AS total FROM users WHERE role = 'trainee' AND is_active = true"
    );
    const trainingsResult = await query('SELECT COUNT(*) AS total FROM trainings');
    const activeTrainingsResult = await query(
      "SELECT COUNT(*) AS total FROM trainings WHERE status IN ('open', 'published')"
    );
    const certificatesResult = await query('SELECT COUNT(*) AS total FROM certificates');
    const departmentsResult = await query('SELECT COUNT(*) AS total FROM departments');
    const subjectsResult = await query('SELECT COUNT(*) AS total FROM subjects');
    const pendingRequestsResult = await query(
      "SELECT COUNT(*) AS total FROM training_requests WHERE status = 'pending'"
    );
    const totalUsersResult = await query('SELECT COUNT(*) AS total FROM users');

    // Registered trainees grouped by department (for the admin dashboard map)
    const traineesByDeptResult = await query(
      `SELECT d.id AS department_id, d.name AS department_name,
              COUNT(u.id) AS trainee_count
       FROM departments d
       LEFT JOIN users u ON u.department_id = d.id AND u.role = 'trainee' AND u.is_active = true
       GROUP BY d.id, d.name
       ORDER BY trainee_count DESC, d.name ASC`
    );

    const data = {
      totalUsers: parseInt(totalUsersResult.rows[0].total, 10) || 0,
      trainers: parseInt(trainersResult.rows[0].total, 10) || 0,
      trainees: parseInt(traineesResult.rows[0].total, 10) || 0,
      trainings: parseInt(trainingsResult.rows[0].total, 10) || 0,
      activeTrainings: parseInt(activeTrainingsResult.rows[0].total, 10) || 0,
      certificates: parseInt(certificatesResult.rows[0].total, 10) || 0,
      departments: parseInt(departmentsResult.rows[0].total, 10) || 0,
      subjects: parseInt(subjectsResult.rows[0].total, 10) || 0,
      pendingRequests: parseInt(pendingRequestsResult.rows[0].total, 10) || 0,
      traineesByDepartment: traineesByDeptResult.rows
    };

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
