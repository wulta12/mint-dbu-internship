const Department = require('../models/Department.model');
const { ApiError } = require('../middleware/error');

// Public: list active departments (for registration forms)
exports.getActive = async (req, res, next) => {
  try {
    const departments = await Department.getActive();
    res.json({ success: true, data: { departments } });
  } catch (error) {
    next(error);
  }
};

// Admin: list all departments with subject/member counts
exports.getAll = async (req, res, next) => {
  try {
    const departments = await Department.getAll();
    res.json({ success: true, data: { departments } });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      throw new ApiError(404, 'Department not found');
    }
    res.json({ success: true, data: { department } });
  } catch (error) {
    next(error);
  }
};

// Admin: create department
exports.create = async (req, res, next) => {
  try {
    const department = await Department.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: { department }
    });
  } catch (error) {
    if (error.code === '23505') {
      return next(new ApiError(400, 'A department with this name already exists'));
    }
    next(error);
  }
};

// Admin: update department
exports.update = async (req, res, next) => {
  try {
    const department = await Department.update(req.params.id, req.body);
    if (!department) {
      throw new ApiError(404, 'Department not found');
    }
    res.json({
      success: true,
      message: 'Department updated successfully',
      data: { department }
    });
  } catch (error) {
    if (error.code === '23505') {
      return next(new ApiError(400, 'A department with this name already exists'));
    }
    next(error);
  }
};

// Admin: activate/deactivate department
exports.toggleActive = async (req, res, next) => {
  try {
    const department = await Department.toggleActive(req.params.id, req.body.is_active);
    if (!department) {
      throw new ApiError(404, 'Department not found');
    }
    res.json({
      success: true,
      message: department.is_active ? 'Department activated' : 'Department deactivated',
      data: { department }
    });
  } catch (error) {
    next(error);
  }
};

// Public: subjects assigned to a department
exports.getSubjects = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      throw new ApiError(404, 'Department not found');
    }
    const subjects = await Department.getSubjects(req.params.id);
    res.json({ success: true, data: { subjects } });
  } catch (error) {
    next(error);
  }
};
