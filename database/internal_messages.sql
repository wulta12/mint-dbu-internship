-- Direct messages between an admin and a signed-in user.
--
-- Rows live in both directions: sender_id/recipient_id describe the direction,
-- parent_id threads a reply back to the message it answers. The table stores the
-- copy that lives in the system; the email copy is sent from the service layer
-- and is not expected to arrive or be filed.
--
-- Idempotent: safe to run more than once, and safe against an existing install.
CREATE TABLE IF NOT EXISTS internal_messages (
    id           SERIAL PRIMARY KEY,
    sender_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject      VARCHAR(200),
    message      TEXT NOT NULL,
    -- The message being answered. ON DELETE CASCADE so removing a parent does
    -- not leave an orphaned reply pointing at nothing.
    parent_id    INT REFERENCES internal_messages(id) ON DELETE CASCADE,
    is_read      BOOLEAN DEFAULT false,
    -- Set on the parent once a reply exists, so a sender can see at a glance
    -- that their message was answered.
    replied_at   TIMESTAMP,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- The inbox is always read in newest-first order for one recipient.
CREATE INDEX IF NOT EXISTS idx_internal_messages_recipient
    ON internal_messages(recipient_id, created_at DESC);

-- The admin's sent view is the same shape for one sender.
CREATE INDEX IF NOT EXISTS idx_internal_messages_sender
    ON internal_messages(sender_id, created_at DESC);

-- Unread badge count: a partial index keeps that count off the read rows.
CREATE INDEX IF NOT EXISTS idx_internal_messages_unread
    ON internal_messages(recipient_id) WHERE is_read = false;

-- Reply tracking on public contact-form messages.
--
-- The contact form has no thread, so the reply is stored flat against the
-- message it answers: enough for the inbox to show "answered" and to keep a
-- record of what was said, without inventing a conversation table.
ALTER TABLE contact_messages
    ADD COLUMN IF NOT EXISTS is_replied BOOLEAN DEFAULT false;

ALTER TABLE contact_messages
    ADD COLUMN IF NOT EXISTS replied_at TIMESTAMP;

ALTER TABLE contact_messages
    ADD COLUMN IF NOT EXISTS reply_message TEXT;

-- NULL once the admin who replied is deleted: the reply text stays, its author
-- does not block the delete.
ALTER TABLE contact_messages
    ADD COLUMN IF NOT EXISTS replied_by INT REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contact_messages_replied
    ON contact_messages(is_replied) WHERE is_replied = true;
