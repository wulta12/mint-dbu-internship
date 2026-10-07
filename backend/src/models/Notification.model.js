const { query } = require('../config/database');

// Notifications carry the full text the user typed (contact bodies, enrollment
// details), so cap the stored message to keep rows and the bell panel bounded.
const MAX_MESSAGE_LENGTH = 2000;

const normalize = ({ type, title, message, link }) => {
  const body = message == null ? null : String(message).trim();
  return {
    type: type || 'info',
    title,
    message: body
      ? body.length > MAX_MESSAGE_LENGTH
        ? `${body.slice(0, MAX_MESSAGE_LENGTH)}…`
        : body
      : null,
    link: link || null
  };
};

class Notification {
  // Fan a notification out to every active admin. Used for events that are
  // globally visible, e.g. a new enrollment request or a contact message.
  static async notifyAdmins(notification) {
    const { type, title, message, link } = normalize(notification);
    const result = await query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       SELECT id, $1, $2, $3, $4
       FROM users
       WHERE role = 'admin' AND is_active = true
       RETURNING *`,
      [type, title, message, link]
    );
    return result.rows;
  }

  // Notify one specific user.
  static async notifyUser(userId, notification) {
    if (!userId) return null;
    const { type, title, message, link } = normalize(notification);
    const result = await query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, type, title, message, link]
    );
    return result.rows[0] || null;
  }

  // Newest first, optionally limited. `limit` is bound as a parameter because
  // LIMIT accepts a placeholder, unlike OFFSET in older Postgres versions.
  static async findByUser(userId, limit = 20) {
    const result = await query(
      `SELECT id, user_id, type, title, message, link, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC, id DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }

  static async getUnreadCount(userId) {
    const result = await query(
      `SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  // Scoped to the owner so one user can never mark another's notification.
  static async markRead(id, userId) {
    const result = await query(
      `UPDATE notifications SET is_read = true
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );
    return result.rows[0] || null;
  }

  static async markAllRead(userId) {
    const result = await query(
      `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false RETURNING id`,
      [userId]
    );
    return result.rowCount;
  }

  // Clear the bell history. Opt-in, since it is destructive.
  static async clearAll(userId) {
    const result = await query(
      `DELETE FROM notifications WHERE user_id = $1 RETURNING id`,
      [userId]
    );
    return result.rowCount;
  }
}

module.exports = Notification;
