const Subject = require('../models/Subject.model');
const Department = require('../models/Department.model');
const { ApiError } = require('../middleware/error');

// Public: list active subjects (optionally grouped by department)
exports.getActive = async (req, res, next) => {
  try {
    let subjects;
    if (req.query.department_id) {
      subjects = await Subject.getActiveByDepartment(req.query.department_id);
    } else {
      const all = await Subject.getAll();
      subjects = all.filter((s) => s.is_active);
    }
    res.json({ success: true, data: { subjects } });
  } catch (error) {
    next(error);
  }
};

// Admin: list all subjects with department + training counts
exports.getAll = async (req, res, next) => {
  try {
    const subjects = await Subject.getAll();
    res.json({ success: true, data: { subjects } });
  } catch (error) {
    next(error);
  }
};

// Subjects belonging to a specific department
exports.getByDepartment = async (req, res, next) => {
  try {
    const subjects = await Subject.getByDepartment(req.params.departmentId);
    res.json({ success: true, data: { subjects } });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      throw new ApiError(404, 'Subject not found');
    }
    res.json({ success: true, data: { subject } });
  } catch (error) {
    next(error);
  }
};

// Admin: create subject under a department
exports.create = async (req, res, next) => {
  try {
    const department = await Department.findById(req.body.department_id);
    if (!department) {
      throw new ApiError(400, 'Invalid department selected');
    }

    const subject = await Subject.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Subject created successfully',
      data: { subject }
    });
  } catch (error) {
    if (error.code === '23505') {
      return next(new ApiError(400, 'A subject with this name already exists in this department'));
    }
    next(error);
  }
};

// Admin: update subject
exports.update = async (req, res, next) => {
  try {
    if (req.body.department_id) {
      const department = await Department.findById(req.body.department_id);
      if (!department) {
        throw new ApiError(400, 'Invalid department selected');
      }
    }

    const subject = await Subject.update(req.params.id, req.body);
    if (!subject) {
      throw new ApiError(404, 'Subject not found');
    }
    res.json({
      success: true,
      message: 'Subject updated successfully',
      data: { subject }
    });
  } catch (error) {
    if (error.code === '23505') {
      return next(new ApiError(400, 'A subject with this name already exists in this department'));
    }
    next(error);
  }
};

// Admin: activate/deactivate subject
exports.toggleActive = async (req, res, next) => {
  try {
    const subject = await Subject.toggleActive(req.params.id, req.body.is_active);
    if (!subject) {
      throw new ApiError(404, 'Subject not found');
    }
    res.json({
      success: true,
      message: subject.is_active ? 'Subject activated' : 'Subject deactivated',
      data: { subject }
    });
  } catch (error) {
    next(error);
  }
};

// Trainings under a subject
exports.getTrainings = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      throw new ApiError(404, 'Subject not found');
    }
    const trainings = await Subject.getTrainings(req.params.id);
    res.json({ success: true, data: { trainings } });
  } catch (error) {
    next(error);
  }
};
