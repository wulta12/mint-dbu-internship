const User = require('../models/User.model');
const Trainer = require('../models/Trainer.model');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');
const { ApiError } = require('../middleware/error');

// Generate JWT Token
const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Register new user (trainee self-registration, or trainer created by admin)
exports.register = async (req, res, next) => {
  try {
    const {
      full_name, email, password, phone, role = 'trainee',
      department_id, specialization, qualification, biography
    } = req.body;

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw new ApiError(400, 'User with this email already exists');
    }

    let isAdmin = false;
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (user && user.role === 'admin') {
          isAdmin = true;
        }
      } catch (err) {
        // Invalid token: treat the request as public
      }
    }

    const finalRole = role || 'trainee';

    if (finalRole === 'trainer' && !isAdmin) {
      throw new ApiError(403, 'Only administrators can create trainer accounts');
    }

    if (!['trainee', 'trainer'].includes(finalRole)) {
      throw new ApiError(400, 'Invalid role. Allowed roles: trainee, trainer');
    }

    // Trainees must select a department that exists in the system.
    if (finalRole === 'trainee' && !department_id) {
      throw new ApiError(400, 'Please select your department to continue');
    }

    if (finalRole === 'trainee') {
      const deptResult = await query('SELECT id, is_active FROM departments WHERE id = $1', [department_id]);
      if (deptResult.rows.length === 0) {
        throw new ApiError(400, 'Invalid department selected');
      }
      if (!deptResult.rows[0].is_active) {
        throw new ApiError(400, 'Selected department is inactive');
      }
    }

    const newUser = await User.create({
      full_name,
      email,
      password,
      phone,
      role: finalRole,
      department_id: finalRole === 'trainee' ? department_id : (department_id || null)
    });

    // Create trainer profile record when an admin adds a trainer
    if (finalRole === 'trainer' && isAdmin) {
      await Trainer.create({
        user_id: newUser.id,
        department_id,
        specialization,
        qualification,
        biography
      });
    }

    let token = null;
    if (!isAdmin) {
      token = generateToken(newUser.id, newUser.role);
    }

    res.status(201).json({
      success: true,
      message: finalRole === 'trainer' ? 'Trainer created successfully!' : 'Registration successful!',
      data: { user: newUser, token }
    });
  } catch (error) {
    if (error.code === '23505') {
      return next(new ApiError(400, 'User with this email already exists'));
    }
    next(error);
  }
};

// Login user
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    if (user.is_active === false || user.is_active === null) {
      throw new ApiError(401, 'Your account is inactive. Please contact administrator.');
    }

    const isPasswordValid = await User.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid email or password');
    }

    delete user.password;

    const token = generateToken(user.id, user.role);

    res.json({
      success: true,
      message: 'Login successful!',
      data: { token, user }
    });
  } catch (error) {
    next(error);
  }
};

// Get current user profile
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    let profileUser = user;
    if (user.role === 'trainer') {
      const trainerInfo = await Trainer.getTrainerWithUser(req.userId);
      profileUser = { ...user, ...(trainerInfo || {}) };
    }

    res.json({ success: true, data: { user: profileUser } });
  } catch (error) {
    next(error);
  }
};

// Update user profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { full_name, phone, department_id, specialization, qualification, biography } = req.body;
    const profile_image = req.file ? req.file.filename : null;

    const currentUser = await User.findById(req.userId);
    if (!currentUser) {
      throw new ApiError(404, 'User not found');
    }

    const updateData = { full_name, phone };
    if (profile_image) {
      updateData.profile_image = profile_image;
    }

    if (department_id !== undefined) {
      const requestedDept = department_id === '' || department_id === null ? null : Number(department_id);

      // Department is locked once chosen; only an admin can change it
      if (currentUser.department_locked && requestedDept !== Number(currentUser.department_id)) {
        throw new ApiError(400, 'Your department is locked. Please contact the administrator to change it.');
      }

      updateData.department_id = requestedDept;

      // First selection of a department locks it
      if (!currentUser.department_locked && requestedDept !== null) {
        updateData.department_locked = true;
      }
    }

    const updatedUser = await User.update(req.userId, updateData);
    if (!updatedUser) {
      throw new ApiError(404, 'User not found');
    }

    // Remove the previous profile picture from disk when a new one is uploaded
    if (profile_image && currentUser.profile_image && currentUser.profile_image !== profile_image) {
      try {
        const oldFilePath = path.join(__dirname, '..', '..', 'uploads', 'profiles', currentUser.profile_image);
        fs.unlink(oldFilePath, () => {});
      } catch (err) {
        // Ignore cleanup errors; the new image is already saved
      }
    }

    // Update the extended trainer profile when the user is a trainer
    if (currentUser.role === 'trainer') {
      const trainerProfile = await Trainer.findByUserId(req.userId);
      if (trainerProfile) {
        await Trainer.update(req.userId, {
          department_id: updateData.department_id !== undefined ? updateData.department_id : trainerProfile.department_id,
          specialization: specialization !== undefined ? specialization : trainerProfile.specialization,
          qualification: qualification !== undefined ? qualification : trainerProfile.qualification,
          biography: biography !== undefined ? biography : trainerProfile.biography
        });
      }
    }

    const refreshedUser = await User.findById(req.userId);
    let trainerInfo = null;
    if (currentUser.role === 'trainer') {
      trainerInfo = await Trainer.getTrainerWithUser(req.userId);
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: { ...refreshedUser, ...(trainerInfo || {}) } }
    });
  } catch (error) {
    next(error);
  }
};

// Change password for the authenticated user
exports.changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;

    const user = await User.findByEmail(req.user.email);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const isPasswordValid = await User.comparePassword(current_password, user.password);
    if (!isPasswordValid) {
      throw new ApiError(400, 'Current password is incorrect');
    }

    const updated = await User.updatePassword(req.userId, new_password);
    if (!updated) {
      throw new ApiError(404, 'User not found');
    }

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Logout (client clears token)
exports.logout = async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
};
