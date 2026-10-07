const express = require('express');
// `query` here is the express-validator one; the database helper of the same
// name is imported separately below.
const { body, query: queryRule } = require('express-validator');

const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { query } = require('../config/database');
const emailService = require('../services/email.service');

const sendValidation = [
  body('recipientIds')
    .isArray({ min: 1 })
    .withMessage('Select at least one recipient'),
  body('subject')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 200 })
    .withMessage('Subject must be at most 200 characters'),
  body('message')
    .trim()
    .notEmpty().withMessage('Message is required')
    .isLength({ max: 2000 }).withMessage('Message must be at most 2000 characters')
];

const replyValidation = [
  body('replyMessage')
    .trim()
    .notEmpty().withMessage('Reply is required')
    .isLength({ max: 2000 }).withMessage('Reply must be at most 2000 characters')
];

// Optional narrowing for the recipient's own inbox. Trainers and trainees
// normally leave this off, but an admin uses it to review what they have been
// sent back and by whom.
const inboxValidation = [
  queryRule('role')
    .optional()
    .isIn(['admin', 'trainer', 'trainee'])
    .withMessage('Role must be admin, trainer or trainee')
];

// Admin: the recipient picker.
//
// Only trainers and trainees: an admin announcing something to other admins has
// the notification bell for that. Inactive accounts are excluded so the picker
// cannot offer an address nobody will ever read.
router.get('/recipients', auth, authorize('admin'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, first_name, last_name, email, role, department_id
       FROM users
       WHERE role IN ('trainer', 'trainee')
         AND is_active = true
       ORDER BY role, first_name, last_name`,
      []
    );

    res.json({ success: true, data: { recipients: result.rows } });
  } catch (error) {
    next(error);
  }
});

// Admin: send a new message to one or more users. Every recipient gets their own
// row (so each can read/reply independently) and an email copy.
router.post('/', auth, authorize('admin'), sendValidation, validate, async (req, res, next) => {
  try {
    const { recipientIds, subject, message } = req.body;
    const senderId = req.user.id;
    const body_ = message.trim();

    // Unknown or inactive ids are rejected up front rather than silently
    // producing rows nobody can read.
    const recipients = await query(
      `SELECT id, email, first_name, last_name
       FROM users
       WHERE id = ANY($1::int[]) AND is_active = true`,
      [recipientIds.map(Number)]
    );

    if (!recipients.rows.length) {
      return res.status(400).json({ success: false, message: 'No valid recipients were selected' });
    }

    let delivered = 0;

    for (const recipient of recipients.rows) {
      const inserted = await query(
        `INSERT INTO internal_messages (sender_id, recipient_id, subject, message)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [senderId, recipient.id, subject || null, body_]
      );

      // Best effort: the message is already stored, so a mail outage must not
      // fail the send for the admin.
      try {
        const verdict = await emailService.sendAdminMessageEmail({
          to: recipient.email,
          fullName: [recipient.first_name, recipient.last_name].filter(Boolean).join(' '),
          subject,
          message: body_
        });
        if (verdict && verdict.delivered) delivered += 1;
      } catch (err) {
        console.error('Admin message email error:', err.message);
      }

      // Keep the in-app bell in sync with the inbox row.
      try {
        await query(
          `INSERT INTO notifications (user_id, type, title, message, link)
           VALUES ($1, 'message', $2, $3, $4)`,
          [recipient.id, subject || 'New message from MinT', body_.slice(0, 2000), '/messages']
        );
      } catch (err) {
        console.error('Notification error:', err.message);
      }

      if (!inserted.rows[0]) {
        throw new Error('Message row was not created');
      }
    }

    res.status(201).json({
      success: true,
      message: `Message sent to ${recipients.rows.length} recipient${recipients.rows.length === 1 ? '' : 's'}`,
      data: { sent: recipients.rows.length, emailed: delivered }
    });
  } catch (error) {
    next(error);
  }
});

// Recipient's inbox.
//
// For a trainer or trainee this is simply their mailbox. An admin has no
// messages of their own unless someone replied, so the same endpoint doubles as
// their "Received" view, and `?role=` lets them narrow it by the sender's role.
//
// `$2::text IS NULL` is used rather than two query strings so a single prepared
// statement serves both cases and the filter can never be interpolated.
router.get('/inbox', auth, inboxValidation, validate, async (req, res, next) => {
  try {
    const role = req.query.role || null;

    const result = await query(
      `SELECT m.id, m.subject, m.message, m.is_read, m.parent_id, m.replied_at, m.created_at,
              u.id AS sender_id, u.first_name AS sender_first_name, u.last_name AS sender_last_name,
              u.email AS sender_email, u.role AS sender_role
       FROM internal_messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.recipient_id = $1
         AND ($2::text IS NULL OR u.role = $2)
       ORDER BY m.created_at DESC, m.id DESC`,
      [req.user.id, role]
    );

    // Counted under the same filter, otherwise a role-filtered view would keep
    // claiming unread mail the admin cannot actually see.
    const unread = await query(
      `SELECT COUNT(*) AS count
       FROM internal_messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.recipient_id = $1
         AND m.is_read = false
         AND ($2::text IS NULL OR u.role = $2)`,
      [req.user.id, role]
    );

    res.json({
      success: true,
      data: {
        messages: result.rows,
        unread_count: parseInt(unread.rows[0].count, 10)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Admin: everything they sent, newest first
router.get('/sent', auth, authorize('admin'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT m.id, m.subject, m.message, m.is_read, m.parent_id, m.replied_at, m.created_at,
              u.id AS recipient_id, u.first_name AS recipient_first_name,
              u.last_name AS recipient_last_name, u.email AS recipient_email
       FROM internal_messages m
       JOIN users u ON u.id = m.recipient_id
       WHERE m.sender_id = $1
       ORDER BY m.created_at DESC, m.id DESC`,
      [req.user.id]
    );

    res.json({ success: true, data: { messages: result.rows } });
  } catch (error) {
    next(error);
  }
});

// Recipient marks one message read
router.put('/:id/read', auth, async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE internal_messages SET is_read = true WHERE id = $1 AND recipient_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }
    res.json({ success: true, message: 'Message marked as read', data: { id: result.rows[0].id } });
  } catch (error) {
    next(error);
  }
});

// Reply in place. The reply goes back to the other party in the thread, so an
// admin and a trainee can keep talking without touching the contact form.
router.post('/:id/reply', auth, replyValidation, validate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, sender_id, recipient_id, subject FROM internal_messages WHERE id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    const parent = result.rows[0];
    const me = req.user.id;
    const isParty = me === parent.sender_id || me === parent.recipient_id;

    if (!isParty) {
      return res.status(403).json({ success: false, message: 'You do not have permission to reply to this message' });
    }

    const recipientId = parent.sender_id === me ? parent.recipient_id : parent.sender_id;
    const replyBody = req.body.replyMessage.trim();
    const baseSubject = parent.subject || 'Message';
    const replySubject = /^re:/i.test(baseSubject) ? baseSubject : `Re: ${baseSubject}`;

    const inserted = await query(
      `INSERT INTO internal_messages (sender_id, recipient_id, subject, message, parent_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, created_at`,
      [me, recipientId, replySubject, replyBody, parent.id]
    );

    await query(
      `UPDATE internal_messages SET replied_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [parent.id]
    );

    let emailed = false;
    try {
      const target = await query(
        `SELECT email, first_name, last_name FROM users WHERE id = $1 AND is_active = true`,
        [recipientId]
      );
      if (target.rows[0] && target.rows[0].email) {
        const verdict = await emailService.sendAdminMessageEmail({
          to: target.rows[0].email,
          fullName: [target.rows[0].first_name, target.rows[0].last_name].filter(Boolean).join(' '),
          subject: replySubject,
          message: replyBody,
          isReply: true,
          // Replies run both ways, so the mail must not always claim to be
          // from the administrator.
          senderName: [req.user.first_name, req.user.last_name].filter(Boolean).join(' '),
          senderRole: req.user.role
        });
        emailed = Boolean(verdict && verdict.delivered);
      }
    } catch (err) {
      console.error('Reply email error:', err.message);
    }

    try {
      await query(
        `INSERT INTO notifications (user_id, type, title, message, link)
         VALUES ($1, 'message', $2, $3, $4)`,
        [recipientId, replySubject, replyBody.slice(0, 2000), '/messages']
      );
    } catch (err) {
      console.error('Notification error:', err.message);
    }

    res.status(201).json({
      success: true,
      message: 'Reply sent',
      data: { reply: inserted.rows[0], emailed }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
