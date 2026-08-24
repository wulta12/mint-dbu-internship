const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { auth, authorize } = require('../middleware/auth');

// Admin only
router.get('/', auth, authorize('admin'), userController.getAll);
router.get('/:id', auth, authorize('admin'), userController.getById);
router.put('/:id', auth, authorize('admin'), userController.updateUser);
router.put('/:id/status', auth, authorize('admin'), userController.toggleActive);
router.put('/:id/department', auth, authorize('admin'), userController.updateDepartment);
router.delete('/:id', auth, authorize('admin'), userController.deleteUser);

module.exports = router;
