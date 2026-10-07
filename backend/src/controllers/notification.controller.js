const Notification = require('../models/Notification.model');
const { ApiError } = require('../middleware/error');

const MAX_LIMIT = 50;

// Bell feed for the signed-in user, newest first.
exports.getAll = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, MAX_LIMIT);
    const [notifications, unreadCount] = await Promise.all([
      Notification.findByUser(req.userId, limit),
      Notification.getUnreadCount(req.userId)
    ]);

    res.json({
      success: true,
      data: { notifications, unread_count: unreadCount }
    });
  } catch (error) {
    next(error);
  }
};

// Unread badge count. Cheap enough to poll.
exports.getUnreadCount = async (req, res, next) => {
  try {
    const unreadCount = await Notification.getUnreadCount(req.userId);
    res.json({ success: true, data: { unread_count: unreadCount } });
  } catch (error) {
    next(error);
  }
};

// Mark one notification as read. Returns 404 when the row does not exist or
// belongs to a different user, so ids cannot be probed across accounts.
exports.markRead = async (req, res, next) => {
  try {
    const notification = await Notification.markRead(req.params.id, req.userId);
    if (!notification) {
      throw new ApiError(404, 'Notification not found');
    }
    res.json({
      success: true,
      message: 'Notification marked as read',
      data: { notification }
    });
  } catch (error) {
    next(error);
  }
};

// Mark every unread notification as read.
exports.markAllRead = async (req, res, next) => {
  try {
    const updated = await Notification.markAllRead(req.userId);
    res.json({ success: true, message: 'All notifications marked as read', data: { updated } });
  } catch (error) {
    next(error);
  }
};

// Empty the bell history for the current user only.
exports.clearAll = async (req, res, next) => {
  try {
    const deleted = await Notification.clearAll(req.userId);
    res.json({ success: true, message: 'Notifications cleared', data: { deleted } });
  } catch (error) {
    next(error);
  }
};
