const Training = require('../models/Training.model');
const Subject = require('../models/Subject.model');
const { ApiError } = require('../middleware/error');

// Public: all trainings (catalog)
exports.getAll = async (req, res, next) => {
  try {
    const trainings = await Training.getAll();
    res.json({ success: true, data: { trainings } });
  } catch (error) {
    next(error);
  }
};

// Public: trainings open for registration
exports.getAvailable = async (req, res, next) => {
  try {
    const trainings = await Training.getAvailable();
    res.json({ success: true, data: { trainings } });
  } catch (error) {
    next(error);
  }
};

// Trainee: trainings assigned to the authenticated trainee's department.
// The department comes from the authenticated user, never from the request.
exports.getByDepartment = async (req, res, next) => {
  try {
    const departmentId = req.user.department_id;
    if (!departmentId) {
      throw new ApiError(400, 'Please select your department in your profile first');
    }

    const trainings = await Training.getByDepartment(departmentId, req.user.id);
    res.json({
      success: true,
      data: {
        department: req.user.department_name,
        trainings
      }
    });
  } catch (error) {
    next(error);
  }
};

// Public: training by id. Trainees are restricted to their own department.
exports.getById = async (req, res, next) => {
  try {
    const training = await Training.findById(req.params.id);
    if (!training) {
      throw new ApiError(404, 'Training not found');
    }

    if (req.user && req.user.role === 'trainee') {
      if (!req.user.department_id) {
        throw new ApiError(400, 'Please select your department in your profile first');
      }
      if (!training.is_all_departments && training.department_id !== req.user.department_id) {
        throw new ApiError(403, 'This training is not assigned to your department');
      }
    }

    res.json({ success: true, data: { training } });
  } catch (error) {
    next(error);
  }
};

// Admin: create training (must belong to a subject -> department)
exports.create = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.body.subject_id);
    if (!subject) {
      throw new ApiError(400, 'Invalid subject selected');
    }
    if (!subject.is_active) {
      throw new ApiError(400, 'Selected subject is inactive');
    }

    const training = await Training.create({ ...req.body, created_by: req.user.id });
    res.status(201).json({
      success: true,
      message: 'Training created successfully',
      data: { training }
    });
  } catch (error) {
    next(error);
  }
};

// Admin: update training
exports.update = async (req, res, next) => {
  try {
    if (req.body.subject_id) {
      const subject = await Subject.findById(req.body.subject_id);
      if (!subject) {
        throw new ApiError(400, 'Invalid subject selected');
      }
    }

    const training = await Training.update(req.params.id, req.body);
    if (!training) {
      throw new ApiError(404, 'Training not found');
    }
    res.json({
      success: true,
      message: 'Training updated successfully',
      data: { training }
    });
  } catch (error) {
    next(error);
  }
};

// Admin: delete training
exports.delete = async (req, res, next) => {
  try {
    const training = await Training.delete(req.params.id);
    if (!training) {
      throw new ApiError(404, 'Training not found');
    }
    res.json({
      success: true,
      message: 'Training deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Trainer: trainings assigned to the authenticated trainer
exports.getByTrainer = async (req, res, next) => {
  try {
    const trainings = await Training.getByTrainer(req.user.id);
    res.json({ success: true, data: { trainings } });
  } catch (error) {
    next(error);
  }
};
