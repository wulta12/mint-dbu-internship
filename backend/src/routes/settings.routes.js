const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const { auth, authorize } = require('../middleware/auth');

// System-wide feature toggles (e.g. the trainer AI assistant switch).
// Reads are open to any signed-in user; writes are admin-only.
router.get('/', auth, settingsController.get);
router.put('/', auth, authorize('admin'), settingsController.update);

module.exports = router;
