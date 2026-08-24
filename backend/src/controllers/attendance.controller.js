const Attendance = require('../models/Attendance.model');
const Training = require('../models/Training.model');
const { ApiError } = require('../middleware/error');

// Get all attendance records for a training (optionally filtered by date)
exports.getByTraining = async (req, res, next) => {
  try {
    const training = await Training.findById(req.params.trainingId);
    if (!training) {
      throw new ApiError(404, 'Training not found');
    }

    const records = req.query.date
      ? await Attendance.getByTrainingAndDate(req.params.trainingId, req.query.date)
      : await Attendance.getByTraining(req.params.trainingId);

    const dates = await Attendance.getDatesByTraining(req.params.trainingId);
    const summary = await Attendance.getSummaryByTraining(req.params.trainingId);

    res.json({
      success: true,
      data: { records, dates, summary }
    });
  } catch (error) {
    next(error);
  }
};

// Bulk save attendance for a training session on a given date
exports.saveBulk = async (req, res, next) => {
  try {
    const training = await Training.findById(req.params.trainingId);
    if (!training) {
      throw new ApiError(404, 'Training not found');
    }

    const attendanceDate = req.body.attendance_date;
    const records = req.body.records;
    if (!attendanceDate) {
      throw new ApiError(400, 'Attendance date is required');
    }
    if (!Array.isArray(records) || records.length === 0) {
      throw new ApiError(400, 'No attendance records provided');
    }

    const saved = await Attendance.upsertBatch(
      req.params.trainingId,
      attendanceDate,
      records,
      req.user.id
    );

    res.json({
      success: true,
      message: `Attendance saved for ${new Date(attendanceDate).toLocaleDateString()}`,
      data: { saved: saved.length }
    });
  } catch (error) {
    next(error);
  }
};

// Summary of attendance for a training
exports.getSummary = async (req, res, next) => {
  try {
    const training = await Training.findById(req.params.trainingId);
    if (!training) {
      throw new ApiError(404, 'Training not found');
    }

    const summary = await Attendance.getSummaryByTraining(req.params.trainingId);
    res.json({ success: true, data: { summary } });
  } catch (error) {
    next(error);
  }
};
