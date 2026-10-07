const { query } = require('../config/database');
const Notification = require('../models/Notification.model');
const { ApiError } = require('../middleware/error');
const emailService = require('../services/email.service');

// Public: persists a contact-form message. No fake success - the visitor only
// receives a confirmation once the row has actually been written.
exports.submit = async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;

    const result = await query(
      `INSERT INTO contact_messages (name, email, subject, message)
       VALUES ($1, $2, $3, $4)
       RETURNING id, created_at`,
      [name, email, subject || null, message]
    );

    // Best effort: the message is already stored, so a failed bell write
    // must not turn a successful submission into an error for the visitor.
    // Carries the sender's details and the body they actually wrote.
    Notification.notifyAdmins({
      type: 'contact_message',
      title: 'New contact message',
      message: [
        `From: ${name} (${email})`,
        `Subject: ${subject || '(no subject)'}`,
        '',
        message
      ].join('\n'),
      link: '/admin/messages'
    }).catch((err) => console.error('Notification error:', err.message));

    res.status(201).json({
      success: true,
      message: 'Your message has been sent successfully. MinT will get back to you soon.',
      data: { message: result.rows[0] }
    });
  } catch (error) {
    next(error);
  }
};

// Admin: inbox of contact-form messages, newest first.
// Query params: ?search= (name/email/subject/message) &status=unread|read
exports.getAll = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    const conditions = [];
    const params = [];

    if (status === 'unread' || status === 'read') {
      params.push(status === 'unread');
      conditions.push(`is_read = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      const p = `$${params.length}`;
      conditions.push(`(name ILIKE ${p} OR email ILIKE ${p} OR subject ILIKE ${p} OR message ILIKE ${p})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT id, name, email, subject, message, is_read,
              is_replied, replied_at, reply_message, replied_by,
              created_at
       FROM contact_messages
       ${where}
       ORDER BY created_at DESC, id DESC`,
      params
    );

    const countResult = await query(
      `SELECT COUNT(*) AS count FROM contact_messages WHERE is_read = false`
    );

    res.json({
      success: true,
      data: {
        messages: result.rows,
        unread_count: parseInt(countResult.rows[0].count, 10)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Admin: unread badge count
exports.getUnreadCount = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT COUNT(*) AS count FROM contact_messages WHERE is_read = false`
    );
    res.json({
      success: true,
      data: { unread_count: parseInt(result.rows[0].count, 10) }
    });
  } catch (error) {
    next(error);
  }
};

// Admin: mark a single message as read
exports.markRead = async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE contact_messages SET is_read = true WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!result.rows[0]) {
      throw new ApiError(404, 'Message not found');
    }
    res.json({ success: true, message: 'Message marked as read', data: { message: result.rows[0] } });
  } catch (error) {
    next(error);
  }
};

// Admin: mark every message as read
exports.markAllRead = async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE contact_messages SET is_read = true WHERE is_read = false RETURNING id`
    );
    res.json({
      success: true,
      message: 'All messages marked as read',
      data: { updated: result.rowCount }
    });
  } catch (error) {
    next(error);
  }
};

// Admin: delete a message
exports.remove = async (req, res, next) => {
  try {
    const result = await query(
      `DELETE FROM contact_messages WHERE id = $1 RETURNING id`,
      [req.params.id]
    );
    if (!result.rows[0]) {
      throw new ApiError(404, 'Message not found');
    }
    res.json({ success: true, message: 'Message deleted', data: { id: result.rows[0].id } });
  } catch (error) {
    next(error);
  }
};

// Admin: reply to a contact-form message. The reply is emailed to the address
// the visitor gave us and also recorded against the message so the inbox can
// show that it was answered.
//
// The mail is best effort and happens before the row is updated: a reply that
// is stored but never sent is the worse of the two failures, because the admin
// would see it as sent. A failed send is reported back as `email_sent: false`
// while the stored reply still stands.
exports.reply = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { replyMessage } = req.body;

    const found = await query(
      `SELECT id, name, email, subject, message FROM contact_messages WHERE id = $1`,
      [id]
    );
    if (!found.rows[0]) {
      throw new ApiError(404, 'Message not found');
    }

    const original = found.rows[0];
    const body = replyMessage.trim();

    let delivery = { delivered: false, reason: 'send_error' };
    try {
      delivery = await emailService.sendContactReplyEmail({
        to: original.email,
        fullName: original.name,
        originalMessage: { subject: original.subject, message: original.message },
        replyMessage: body
      });
    } catch (err) {
      console.error('Contact reply email error:', err.message);
    }

    await query(
      `UPDATE contact_messages
       SET is_replied = true,
           replied_at = CURRENT_TIMESTAMP,
           reply_message = $1,
           replied_by = $2
       WHERE id = $3`,
      [body, req.user.id, id]
    );

    res.json({
      success: true,
      message: delivery.delivered
        ? 'Reply sent to the sender'
        : 'Reply saved, but it could not be emailed',
      data: { id: Number(id), email_sent: Boolean(delivery.delivered), reason: delivery.reason }
    });
  } catch (error) {
    next(error);
  }
};








