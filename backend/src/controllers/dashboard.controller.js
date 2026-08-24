const { query } = require('../config/database');

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
