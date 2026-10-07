const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contact.controller');
const { validate } = require('../middleware/validate');
const { contactValidation, contactReplyValidation } = require('../validators/contact.validator');
const { auth, authorize } = require('../middleware/auth');

// Public: submit a contact message
router.post('/', contactValidation, validate, contactController.submit);

// Admin routes
// Inbox with filters: ?search= &status=unread|read
router.get('/', auth, authorize('admin'), contactController.getAll);
router.get('/unread-count', auth, authorize('admin'), contactController.getUnreadCount);
router.put('/read-all', auth, authorize('admin'), contactController.markAllRead);
router.put('/:id/read', auth, authorize('admin'), contactController.markRead);
router.post('/:id/reply', auth, authorize('admin'), contactReplyValidation, validate, contactController.reply);
router.delete('/:id', auth, authorize('admin'), contactController.remove);

module.exports = router;

