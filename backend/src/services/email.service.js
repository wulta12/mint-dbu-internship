const nodemailer = require('nodemailer');

// Mail transport.
//
// Uses SMTP when it is configured, and otherwise falls back to printing the
// message to the console so every flow stays testable in development without
// real mail credentials. The fallback is never used in production unless SMTP is
// missing, which is surfaced loudly at send time rather than swallowed.

const FROM_NAME = process.env.MAIL_FROM_NAME || 'MinT Training System';
const FROM_ADDRESS = process.env.MAIL_FROM || 'no-reply@mint.gov.et';

let transporter = null;
let transporterChecked = false;

// Google displays App Passwords in groups of four (e.g. "abcd efgh ijkl mnop")
// and people routinely paste them with those spaces still in place. An
// otherwise-correct .env then fails to authenticate for no visible reason, so
// the value is normalised before it reaches nodemailer.
const smtpPassword = () => String(process.env.SMTP_PASS || '').replace(/\s+/g, '');

const smtpConfigured = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && smtpPassword());

const getTransporter = () => {
  if (transporterChecked) return transporter;
  transporterChecked = true;

  if (!smtpConfigured()) return null;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    auth: { user: process.env.SMTP_USER, pass: smtpPassword() }
  });

  return transporter;
};

/**
 * Bucket a nodemailer failure into something an operator can act on, so the
 * "NOT delivered [reason]" lines in the logs name a cause rather than a stack.
 */
const classify = (error) => {
  const code = error && error.code ? String(error.code) : '';
  const responseCode = error && error.responseCode ? Number(error.responseCode) : null;

  if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return 'smtp_unreachable';
  }
  if (responseCode === 550 || responseCode === 551 || responseCode === 553) {
    return 'recipient_rejected';
  }
  if (code === 'ETIMEDOUT' || code === 'ETIMEDOUT') {
    return 'timeout';
  }
  if (responseCode >= 400 && responseCode < 500) {
    return 'transient';
  }
  return 'send_failed';
};

/**
 * Development sink used when SMTP is not configured. `secrets` names values that
 * must never reach the log verbatim (reset tokens, one-time codes); they are
 * redacted here so a console-only setup is still safe to paste into an issue.
 */
const logToConsole = ({ to, subject, text, html }, secrets = []) => {
  if (process.env.NODE_ENV === 'test') return;

  let body = String(text || '');
  let alt = String(html || '');

  for (const secret of secrets) {
    if (!secret) continue;
    const value = String(secret);
    body = body.split(value).join('[redacted]');
    alt = alt.split(value).join('[redacted]');
  }

  console.log('');
  console.log('=== EMAIL (SMTP not configured) ===');
  console.log(`To:      ${to}`);
  console.log(`Subject: ${subject}`);
  console.log('--- text ---');
  console.log(body);
  if (alt) {
    console.log('--- html ---');
    console.log(alt);
  }
  console.log('=== END EMAIL ===');
  console.log('');
};

/**
 * Sends an email.
 *
 * Resolves with `{ delivered, reason?, code?, responseCode?, messageId? }` and
 * never throws: a mail outage must not disclose whether an address is
 * registered, and must not turn the password-reset endpoint into a 500. Callers
 * decide how loudly to report a `delivered: false`.
 */
const send = async ({ to, subject, text, html, secrets = [] }) => {
  const smtp = getTransporter();

  if (!smtp) {
    logToConsole({ to, subject, text, html }, secrets);
    return { delivered: false, reason: 'smtp_not_configured' };
  }

  try {
    const info = await smtp.sendMail({
      from: `"${FROM_NAME}" <${FROM_ADDRESS}>`,
      to,
      subject,
      text,
      html
    });

    return { delivered: true, messageId: info && info.messageId };
  } catch (error) {
    console.error('Email send failed', {
      to,
      reason: classify(error),
      code: (error && error.code) || null,
      responseCode: (error && error.responseCode) || null,
      command: (error && error.command) || null,
      message: error && error.message
    });

    return {
      delivered: false,
      reason: classify(error),
      code: (error && error.code) || null,
      responseCode: (error && error.responseCode) || null
    };
  }
};

// ---------------------------------------------------------------------------
// Shared rendering helpers
//
// One shell and one detail renderer for every template, so a change to the
// branding or the label/value table lands in all of the mails at once rather
// than in whichever template happened to be edited last.
// ---------------------------------------------------------------------------

const BRAND = '#0B3D91';
const ACCENT = '#F4B400';
const BORDER = '#E2E8F0';
const TEXT = '#1E293B';
const MUTED = '#64748B';

const escapeHtml = (value) =>
  String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Only http(s) is ever rendered as a clickable link, so a stored `javascript:`
 * value cannot turn into a payload in someone's inbox.
 */
const safeHttpUrl = (value) => {
  const raw = String(value == null ? '' : value).trim();
  if (!raw) return null;

  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
};

/** Renders a body that may contain newlines, preserving the author's layout. */
const preserveLinesHtml = (value, extra = '') =>
  `<div style="color:${TEXT};font-size:14px;line-height:1.7;white-space:pre-wrap;margin:0 0 20px;${extra}">${escapeHtml(value)}</div>`;

const emailShell = ({ heading, intro, bodyHtml, footnote }) => `<div style="font-family:Inter,Segoe UI,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <div style="background:${BRAND};padding:20px 24px;border-radius:12px 12px 0 0">
    <div style="color:#fff;font-size:18px;font-weight:700;letter-spacing:.04em">MinT</div>
    <div style="color:${ACCENT};font-size:12px;font-weight:600;letter-spacing:.08em;margin-top:4px">
      Ministry of Innovation and Technology
    </div>
  </div>
  <div style="border:1px solid ${BORDER};border-top:0;border-radius:0 0 12px 12px;padding:24px">
    <p style="color:${TEXT};font-size:16px;font-weight:700;margin:0 0 12px">${escapeHtml(heading)}</p>
    <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px">${intro}</p>
    ${bodyHtml || ''}
    ${
      footnote
        ? `<p style="color:#94A3B8;font-size:12px;line-height:1.6;margin:20px 0 0">${footnote}</p>`
        : ''
    }
  </div>
</div>`;

/** Two-column label/value table. Empty values are dropped rather than shown blank. */
const detailTableHtml = (rows) => {
  const kept = rows.filter(([, value]) => value !== null && value !== undefined && value !== '');
  if (!kept.length) return '';

  return `<table style="width:100%;border-collapse:collapse;margin:0 0 20px">
    ${kept
      .map(
        ([label, value]) => `<tr>
      <td style="padding:6px 12px 6px 0;color:${MUTED};font-size:13px;font-weight:600;vertical-align:top;white-space:nowrap">${escapeHtml(
          label
        )}</td>
      <td style="padding:6px 0;color:${TEXT};font-size:13px;line-height:1.6">${escapeHtml(value)}</td>
    </tr>`
      )
      .join('')}
  </table>`;
};

const detailLines = (rows) =>
  rows
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([label, value]) => `${label}: ${value}`);

// ---------------------------------------------------------------------------
// Dates and meetings
// ---------------------------------------------------------------------------

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const asDate = (value) => {
  if (!value) return null;
  // Bare `YYYY-MM-DD` / `HH:MM` come back from Postgres as local wall-clock
  // strings, which `new Date` would interpret as UTC and shift by a day.
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }
  if (typeof value === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => {
  const date = asDate(value);
  if (!date) return null;
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

const formatTime = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    const match = value.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      const hours = Number(match[1]);
      const minutes = match[2];
      const suffix = hours >= 12 ? 'PM' : 'AM';
      const hour12 = hours % 12 === 0 ? 12 : hours % 12;
      return `${hour12}:${minutes} ${suffix}`;
    }
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes} ${suffix}`;
};

/**
 * A single human sentence for a meeting: "30 September 2026, 09:00 AM - 11:00 AM".
 * Shared by the meeting mail and by the participant bell summary so the two
 * never disagree about when a session is.
 */
const formatMeetingWhen = (meeting = {}) => {
  const day = formatDate(meeting.meeting_date);
  const start = formatTime(meeting.start_time);
  const end = formatTime(meeting.end_time);

  if (!day && !start) return '';
  if (!day) return start || '';
  if (!start) return day;
  if (!end || end === start) return `${day}, ${start}`;

  return `${day}, ${start} - ${end}`;
};

/** The Zoom card. Omitted entirely when there is no usable http(s) link. */
const meetingHtml = (meeting = {}) => {
  const link = safeHttpUrl(meeting.meeting_link);
  if (!link) return '';

  const when = formatMeetingWhen(meeting);

  return `<table style="width:100%;border-collapse:collapse;margin:0 0 20px">
    <tr>
      <td style="background:${BRAND};padding:16px 20px;border-radius:8px">
        <div style="color:#fff;font-size:14px;font-weight:700;margin:0 0 ${when ? '6px' : '0'}">
          ${escapeHtml(meeting.title || 'Online session')}
        </div>
        ${when ? `<div style="color:#CBD5E1;font-size:13px;margin:0 0 12px">${escapeHtml(when)}</div>` : ''}
        <a href="${escapeHtml(link)}"
           style="display:inline-block;background:${ACCENT};color:#1F2937;font-size:13px;font-weight:700;
                  text-decoration:none;padding:9px 16px;border-radius:6px">Join the session</a>
      </td>
    </tr>
  </table>`;
};

const meetingText = (meeting = {}) => {
  const lines = [];
  if (meeting.title) lines.push(`Session: ${meeting.title}`);
  const when = formatMeetingWhen(meeting);
  if (when) lines.push(`When: ${when}`);
  if (meeting.meeting_link) lines.push(`Join: ${meeting.meeting_link}`);
  return lines;
};

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

/**
 * Password-reset mail.
 *
 * Carries both routes on purpose: the emailed link and the six-digit code, so
 * the user can take whichever suits them. The token and the code are passed as
 * `secrets` so a console-only setup still never prints either verbatim.
 */
const sendPasswordResetEmail = async ({
  to,
  fullName,
  resetUrl,
  lang,
  expiryMinutes,
  otp,
  otpExpiryMinutes
}) => {
  if (!to) return { delivered: false, reason: 'not_addressable' };

  const name = fullName || to;
  const link = safeHttpUrl(resetUrl);

  // `lang` selects the wording. English is the fallback whenever a translation
  // is missing, so a partially translated language still produces a usable mail.
  const copy = lang === 'am'
    ? {
        subject: 'የይለፍ ሥርዓት ማስገራት - MinT Training System',
        heading: 'የይለፍ ሥርዓት ማስገራት',
        intro: 'የይለፍ ሥርዓትዎን ለማስቀመጥ ከታች មាត្រដ្ឋានዎ ឬ ኮដូស አጠቀሙ።',
        expires: 'ይህ តំណាត់',
        button: 'የይለፍ ሥርዓት ማስገራት',
        orCode: 'ወይም ከሥርዓቱ አጠቀመጡ',
        codeIs: 'የይለፍ ኮድ',
        ignore: 'ይህ ኢሜይል ካልጠየቁ ማንም ነገር አይደረግም።',
        footer: 'MinT Training System - Ministry of Innovation and Technology'
      }
    : {
        subject: 'Password Reset - MinT Training System',
        heading: 'Reset your password',
        intro: 'We received a request to reset your password. Use the link or the code below to choose a new one.',
        expires: 'This link expires in',
        button: 'Reset my password',
        orCode: 'Or use this one-time code',
        codeIs: 'Your code',
        ignore: 'If you did not request a password reset, you can ignore this message.',
        footer: 'MinT Training System - Ministry of Innovation and Technology'
      };

  const minutes = expiryMinutes || 60;
  const codeBlock = otp
    ? `<p style="color:${MUTED};font-size:13px;font-weight:600;margin:20px 0 8px">${escapeHtml(copy.orCode)}</p>
       <div style="background:#F8FAFC;border:1px solid ${BORDER};border-radius:8px;padding:16px;text-align:center">
         <span style="font-family:Consolas,Menlo,monospace;font-size:26px;letter-spacing:.22em;color:${TEXT};font-weight:700">${escapeHtml(otp)}</span>
       </div>
       ${otpExpiryMinutes ? `<p style="color:#94A3B8;font-size:12px;margin:8px 0 0">${escapeHtml(copy.expires)} ${otpExpiryMinutes} ${otpExpiryMinutes === 1 ? 'minute' : 'minutes'}.</p>` : ''}`
    : '';

  const buttonHtml = link
    ? `<p style="margin:0 0 20px">
         <a href="${escapeHtml(link)}"
            style="display:inline-block;background:${BRAND};color:#fff;font-size:14px;font-weight:700;
                   text-decoration:none;padding:11px 22px;border-radius:6px">${escapeHtml(copy.button)}</a>
       </p>`
    : '';

  const text = [
    `${name}, hello!`,
    '',
    copy.intro,
    '',
    link || resetUrl,
    '',
    otp ? `${copy.codeIs}: ${otp}` : null,
    `${copy.expires} ${minutes} minutes.`,
    '',
    copy.ignore,
    '',
    'MinT Training System',
    'Ministry of Innovation and Technology'
  ]
    .filter((line) => line !== null)
    .join('\n');

  const html = emailShell({
    heading: copy.heading,
    intro: escapeHtml(copy.intro),
    bodyHtml:
      buttonHtml +
      codeBlock +
      `<p style="color:#94A3B8;font-size:12px;line-height:1.6;margin:20px 0 0">${escapeHtml(copy.ignore)}</p>`,
    footnote: copy.footer
  });

  return send({
    to,
    subject: copy.subject,
    text,
    html,
    // The link's token and the code are credentials: keep them out of the
    // console fallback above.
    secrets: [resetUrl, otp].filter(Boolean)
  });
};

/**
 * Enrollment approval email.
 *
 * Sent in addition to the in-system bell notification - never instead of it.
 * When the training is online and the trainer has already prepared the Zoom
 * meeting, `meeting` carries that session so the link travels with the
 * confirmation rather than needing a second message.
 */
const sendEnrollmentApprovedEmail = async ({ to, fullName, training = {}, meeting = null }) => {
  if (!to) return { delivered: false, reason: 'not_addressable' };

  const name = fullName || to;
  const trainingTitle = training.training_title || 'the training';

  const subject = `You are enrolled in "${trainingTitle}" - MinT Training System`;

  const intro = `Your enrollment request for "${trainingTitle}" has been approved. You are now officially enrolled.`;

  // Only an online training gets the Zoom card. Offline trainings have no
  // session to join, and a Hybrid one still benefits from the link, so both are
  // checked rather than assuming "online".
  const isOnline = ['online', 'hybrid'].includes(
    String(training.training_type || '').toLowerCase()
  );
  const showMeeting = isOnline && meeting && safeHttpUrl(meeting.meeting_link);

  const text = [
    `${name}, hello!`,
    '',
    intro,
    '',
    'Training details',
    '-----------------',
    ...detailLines([
      ['Training', trainingTitle],
      ['Subject', training.subject_name],
      ['Type', training.training_type],
      ['Starts', formatDate(training.start_date)],
      ['Ends', formatDate(training.end_date)],
      ['Trainer', training.trainer_name],
      ['Location / link', training.location_or_meeting_link],
      ['Description', training.training_description]
    ]),
    ...(showMeeting ? meetingText(meeting) : []),
    '',
    'Log in to the training system to start your lessons. Your progress is saved automatically.',
    '',
    'MinT Training System',
    'Ministry of Innovation and Technology'
  ].join('\n');

  const html = emailShell({
    heading: 'You are now enrolled',
    intro: escapeHtml(intro),
    bodyHtml:
      detailTableHtml([
        ['Training', trainingTitle],
        ['Subject', training.subject_name],
        ['Type', training.training_type],
        ['Starts', formatDate(training.start_date)],
        ['Ends', formatDate(training.end_date)],
        ['Trainer', training.trainer_name],
        ['Location / link', training.location_or_meeting_link]
      ]) +
      (showMeeting ? meetingHtml(meeting) : '') +
      (training.training_description
        ? `<p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px">${escapeHtml(training.training_description)}</p>`
        : ''),
    footnote: 'Log in to the training system to start your lessons.'
  });

  return send({ to, subject, text, html });
};

/**
 * Meeting notice for every approved participant.
 *
 * `isUpdate` marks a rescheduled or re-linked session rather than a brand new
 * one, so the trainee knows the original details moved.
 */
const sendMeetingNotificationEmail = async ({ to, fullName, training = {}, meeting = {}, isUpdate = false }) => {
  if (!to) return { delivered: false, reason: 'not_addressable' };

  const name = fullName || to;
  const trainingTitle = training.training_title || meeting.training_title || 'the training';
  const sessionTitle = meeting.title || 'Online session';

  const subject = `${isUpdate ? 'Meeting updated' : 'New online session'} - ${trainingTitle} - MinT Training System`;

  const intro = isUpdate
    ? `The online session for "${trainingTitle}" has been updated. The details below replace the ones sent earlier.`
    : `An online session has been scheduled for "${trainingTitle}". Join using the link below.`;

  const text = [
    `${name}, hello!`,
    '',
    intro,
    '',
    ...meetingText({ ...meeting, title: sessionTitle }),
    '',
    'Log in to the training system to see your schedule.',
    '',
    'MinT Training System',
    'Ministry of Innovation and Technology'
  ].join('\n');

  const html = emailShell({
    heading: isUpdate ? 'Your session has moved' : 'Your online session is scheduled',
    intro: escapeHtml(intro),
    bodyHtml:
      detailTableHtml([
        ['Training', trainingTitle],
        ['Session', sessionTitle],
        ['When', formatMeetingWhen(meeting)]
      ]) + meetingHtml({ ...meeting, title: sessionTitle }),
    footnote: 'Log in to the training system to see your schedule.'
  });

  return send({ to, subject, text, html });
};

/**
 * Reply from the admin inbox to a public contact-form message.
 *
 * The visitor never had an account, so there is no thread to render: the reply
 * stands on its own and quotes the original underneath so the recipient can see
 * what they are answering.
 */
const sendContactReplyEmail = async ({ to, fullName, originalMessage = {}, replyMessage = '' }) => {
  if (!to) return { delivered: false, reason: 'not_addressable' };

  const name = fullName || to;
  const originalSubject = originalMessage.subject || 'your message';
  const subject = `Re: ${originalSubject.replace(/^re:\s*/i, '')} - MinT Training System`;

  const intro = 'Thank you for contacting us. This is our reply to your message.';
  const originalText = originalMessage.message ? String(originalMessage.message) : '';

  const text = [
    `${name}, hello!`,
    '',
    intro,
    '',
    replyMessage,
    '',
    '--- Your original message ---',
    originalText,
    '',
    'MinT Training System',
    'Ministry of Innovation and Technology'
  ].join('\n');

  const html = emailShell({
    heading: 'Reply from MinT',
    intro: escapeHtml(intro),
    bodyHtml:
      preserveLinesHtml(replyMessage) +
      `<hr style="border:0;border-top:1px solid ${BORDER};margin:20px 0">
       <p style="color:${MUTED};font-size:12px;font-weight:700;letter-spacing:.06em;margin:0 0 8px">Your original message</p>
       <div style="color:${MUTED};font-size:13px;line-height:1.6;white-space:pre-wrap;background:#F8FAFC;
                   border:1px solid ${BORDER};border-radius:8px;padding:16px">${escapeHtml(originalText)}</div>`,
    footnote: 'Ministry of Innovation and Technology'
  });

  return send({ to, subject, text, html });
};

/**
 * A direct message from the admin to a signed-in user, and the reply to one.
 *
 * Unlike the contact reply there is no in-system thread for the recipient to
 * read later if they miss the mail, so the body is quoted inline.
 *
 * Replies run in both directions, so `senderName`/`senderRole` decide how the
 * message is described: telling a trainee that "an administrator has replied"
 * when the mail came from another trainee would be wrong.
 */
const sendAdminMessageEmail = async ({
  to,
  fullName,
  subject: customSubject,
  message,
  isReply = false,
  senderName,
  senderRole
}) => {
  if (!to) return { delivered: false, reason: 'not_addressable' };

  const name = fullName || to;
  const base = customSubject ? String(customSubject).replace(/^re:\s*/i, '') : 'New message from MinT';
  const subject = `${isReply ? 'Re: ' : ''}${base} - MinT Training System`;

  const fromAdmin = !senderRole || senderRole === 'admin';
  const spokenAs = senderName && senderName.trim()
    ? senderName.trim()
    : fromAdmin
      ? 'An administrator'
      : senderRole === 'trainer'
        ? 'A trainer'
        : 'A trainee';

  let intro;
  if (!isReply) {
    intro = 'You have received a new message from MinT.';
  } else if (fromAdmin) {
    intro = `${spokenAs} has replied to your message.`;
  } else {
    intro = `${spokenAs} has replied to the message you sent.`;
  }

  // A reply is visible to both parties in the system, but neither side gets the
  // whole thread in one place, so point at the app rather than promising an
  // inbox that does not exist.
  const footnote = isReply
    ? 'Open the training system to read the full conversation.'
    : 'Log in to the training system to read and reply to this message.';

  const text = [
    `${name}, hello!`,
    '',
    intro,
    '',
    message,
    '',
    footnote,
    '',
    'MinT Training System',
    'Ministry of Innovation and Technology'
  ].join('\n');

  const html = emailShell({
    heading: isReply ? 'Reply from MinT' : 'New message from MinT',
    intro: escapeHtml(intro),
    bodyHtml: preserveLinesHtml(message),
    footnote
  });

  return send({ to, subject, text, html });
};

module.exports = {
  send,
  sendPasswordResetEmail,
  sendEnrollmentApprovedEmail,
  sendMeetingNotificationEmail,
  sendContactReplyEmail,
  sendAdminMessageEmail,
  formatMeetingWhen,
  smtpConfigured
};
