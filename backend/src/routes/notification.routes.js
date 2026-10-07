const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { auth } = require('../middleware/auth');

// Every notification route is scoped to the signed-in user; the controller
// always filters by req.userId, so no role gate is needed here.
router.get('/', auth, notificationController.getAll);
router.get('/unread-count', auth, notificationController.getUnreadCount);
router.put('/read-all', auth, notificationController.markAllRead);
router.put('/:id/read', auth, notificationController.markRead);
router.delete('/', auth, notificationController.clearAll);

module.exports = router;
