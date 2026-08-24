const User = require('../models/User.model');
const Trainer = require('../models/Trainer.model');
const { ApiError } = require('../middleware/error');

// Admin: list all users
exports.getAll = async (req, res, next) => {
  try {
    const users = await User.findAll();
    res.json({ success: true, data: { users } });
  } catch (error) {
    next(error);
  }
};

// Admin: list all trainees
exports.getTrainees = async (req, res, next) => {
  try {
    const trainees = await User.findAll({ role: 'trainee' });
    res.json({ success: true, data: { trainees } });
  } catch (error) {
    next(error);
  }
};

// Admin: get a single user (with trainer profile when applicable)
exports.getById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    let profileUser = user;
    if (user.role === 'trainer') {
      const trainerInfo = await Trainer.getTrainerWithUser(req.params.id);
      profileUser = { ...user, ...(trainerInfo || {}) };
    }

    res.json({ success: true, data: { user: profileUser } });
  } catch (error) {
    next(error);
  }
};

// Admin: update a user (basic fields + trainer profile)
exports.updateUser = async (req, res, next) => {
  try {
    const targetId = req.params.id;

    if (Number(targetId) === Number(req.user.id) && req.body.is_active === false) {
      throw new ApiError(400, 'You cannot deactivate your own account');
    }

    const targetUser = await User.findById(targetId);
    if (!targetUser) {
      throw new ApiError(404, 'User not found');
    }

    const { full_name, phone, department_id, is_active, specialization, qualification, biography } = req.body;

    const updateData = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (phone !== undefined) updateData.phone = phone;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (department_id !== undefined) updateData.department_id = department_id === '' || department_id === null ? null : Number(department_id);

    const updatedUser = await User.update(targetId, updateData);
    if (!updatedUser) {
      throw new ApiError(404, 'User not found');
    }

    if (targetUser.role === 'trainer') {
      const trainerProfile = await Trainer.findByUserId(targetId);
      if (trainerProfile) {
        await Trainer.update(targetId, {
          department_id: updateData.department_id !== undefined ? updateData.department_id : trainerProfile.department_id,
          specialization: specialization !== undefined ? specialization : trainerProfile.specialization,
          qualification: qualification !== undefined ? qualification : trainerProfile.qualification,
          biography: biography !== undefined ? biography : trainerProfile.biography
        });
      }
    }

    const refreshed = await User.findById(targetId);
    let profileUser = refreshed;
    if (targetUser.role === 'trainer') {
      const trainerInfo = await Trainer.getTrainerWithUser(targetId);
      profileUser = { ...refreshed, ...(trainerInfo || {}) };
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user: profileUser }
    });
  } catch (error) {
    next(error);
  }
};

// Admin: delete a user
exports.deleteUser = async (req, res, next) => {
  try {
    const targetId = req.params.id;

    if (Number(targetId) === Number(req.user.id)) {
      throw new ApiError(400, 'You cannot delete your own account');
    }

    const user = await User.findById(targetId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    await User.delete(targetId);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Admin: activate/deactivate a user
exports.toggleActive = async (req, res, next) => {
  try {
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') {
      throw new ApiError(400, 'is_active must be a boolean');
    }

    const user = await User.toggleActive(req.params.id, is_active);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    res.json({
      success: true,
      message: is_active ? 'User activated' : 'User deactivated',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

// Admin: change a user's department (locks it afterwards)
exports.updateDepartment = async (req, res, next) => {
  try {
    const departmentId = req.body.department_id || null;
    const user = await User.updateDepartment(req.params.id, departmentId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    res.json({
      success: true,
      message: 'Department updated successfully',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};
