const { query } = require('../config/database');

// Comprehensive report data for the admin Reports page.
exports.getOverview = async (req, res, next) => {
  try {
    // Core counts
    const count = async (sql) => {
      const r = await query(sql);
      return parseInt(r.rows[0].total, 10) || 0;
    };

    const [
      trainers, trainees, trainings, certificates,
      pendingRequests, totalUsers
    ] = await Promise.all([
      count("SELECT COUNT(*) AS total FROM users WHERE role = 'trainer' AND is_active = true"),
      count("SELECT COUNT(*) AS total FROM users WHERE role = 'trainee' AND is_active = true"),
      count('SELECT COUNT(*) AS total FROM trainings'),
      count('SELECT COUNT(*) AS total FROM certificates'),
      count("SELECT COUNT(*) AS total FROM training_requests WHERE status = 'pending'"),
      count('SELECT COUNT(*) AS total FROM users')
    ]);

    // Enrollments
    const enrollmentsRes = await query(
      "SELECT COUNT(*) AS total FROM training_requests WHERE status IN ('approved', 'completed')"
    );
    const enrollments = parseInt(enrollmentsRes.rows[0].total, 10) || 0;

    // Per department aggregates
    const byDepartmentRes = await query(
      `SELECT d.id, d.name AS department_name,
              COUNT(DISTINCT t.id) AS training_count,
              COUNT(DISTINCT CASE WHEN tr.status IN ('approved', 'completed') THEN tr.id END) AS enrollment_count,
              COUNT(DISTINCT cert.id) AS certificate_count
       FROM departments d
       LEFT JOIN subjects s ON s.department_id = d.id
       LEFT JOIN trainings t ON t.subject_id = s.id
       LEFT JOIN training_requests tr ON tr.training_id = t.id
       LEFT JOIN certificates cert ON cert.training_id = t.id
       GROUP BY d.id, d.name
       ORDER BY enrollment_count DESC`
    );

    // Per training aggregates
    const byTrainingRes = await query(
      `SELECT t.id, t.training_title, t.training_type, t.status, t.capacity,
              d.name AS department_name,
              COUNT(DISTINCT CASE WHEN tr.status IN ('approved', 'completed') THEN tr.trainee_id END) AS approved_count,
              COUNT(DISTINCT CASE WHEN a.attendance_status = 'present' THEN a.id END) AS present,
              COUNT(DISTINCT CASE WHEN a.attendance_status = 'absent' THEN a.id END) AS absent,
              COUNT(DISTINCT CASE WHEN a.attendance_status = 'late' THEN a.id END) AS late,
              COUNT(DISTINCT cert.id) AS certificate_count
       FROM trainings t
       LEFT JOIN subjects s ON t.subject_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN training_requests tr ON tr.training_id = t.id
       LEFT JOIN attendance a ON a.training_id = t.id
       LEFT JOIN certificates cert ON cert.training_id = t.id
       GROUP BY t.id, d.name
       ORDER BY t.start_date DESC`
    );

    // Attendance distribution (all trainings)
    const attendanceRes = await query(
      `SELECT
         COUNT(*) FILTER (WHERE attendance_status = 'present') AS present,
         COUNT(*) FILTER (WHERE attendance_status = 'absent') AS absent,
         COUNT(*) FILTER (WHERE attendance_status = 'late') AS late,
         COUNT(*) FILTER (WHERE attendance_status = 'excused') AS excused
       FROM attendance`
    );

    // Training counts by type
    const byTypeRes = await query(
      `SELECT training_type, COUNT(*) AS total
       FROM trainings
       GROUP BY training_type
       ORDER BY total DESC`
    );

    // Pending requests by department (for a quick queue view)
    const pendingByDeptRes = await query(
      `SELECT d.name AS department_name, COUNT(*) AS total
       FROM training_requests tr
       JOIN trainings t ON tr.training_id = t.id
       LEFT JOIN subjects s ON t.subject_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE tr.status = 'pending'
       GROUP BY d.name
       ORDER BY total DESC`
    );

    res.json({
      success: true,
      data: {
        summary: {
          totalUsers,
          trainers,
          trainees,
          trainings,
          enrollments,
          certificates,
          pendingRequests
        },
        attendance: {
          present: parseInt(attendanceRes.rows[0].present, 10) || 0,
          absent: parseInt(attendanceRes.rows[0].absent, 10) || 0,
          late: parseInt(attendanceRes.rows[0].late, 10) || 0,
          excused: parseInt(attendanceRes.rows[0].excused, 10) || 0
        },
        byDepartment: byDepartmentRes.rows,
        byTraining: byTrainingRes.rows,
        byType: byTypeRes.rows,
        pendingByDepartment: pendingByDeptRes.rows
      }
    });
  } catch (error) {
    next(error);
  }
};
