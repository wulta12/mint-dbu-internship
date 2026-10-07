// Verifies the Gmail SMTP settings in .env by sending a real test message to
// the mailbox itself. Run this after filling in SMTP_PASS, and before testing
// the full Forgot Password flow, so a credential problem is easy to spot.
//
//   node test-smtp.js
//   node test-smtp.js someone@example.com   (defaults to SMTP_USER)
//
// The password is read from the environment and is never printed.
require('dotenv').config();
const nodemailer = require('nodemailer');

const FROM_NAME = process.env.MAIL_FROM_NAME || 'MinT Training System';
const FROM_ADDRESS = process.env.MAIL_FROM || process.env.SMTP_USER;
const to = process.argv[2] || process.env.SMTP_USER;

// Matches email.service.js: strip the display spaces Google adds to App
// Passwords, otherwise an otherwise-correct .env fails to authenticate.
const smtpPass = () => String(process.env.SMTP_PASS || '').replace(/\s+/g, '');

const missing = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER'].filter(
  (key) => !process.env[key]
);

if (!smtpPass()) missing.push('SMTP_PASS');

if (missing.length) {
  console.error('FAIL  Missing in .env: ' + missing.join(', '));
  if (missing.includes('SMTP_PASS')) {
    console.error(
      '      SMTP_PASS must be a Google App Password: https://myaccount.google.com/apppasswords'
    );
  }
  process.exit(1);
}

console.log(`Host:   ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
console.log(`Secure: ${String(process.env.SMTP_SECURE).toLowerCase() === 'true'}`);
console.log(`User:   ${process.env.SMTP_USER}`);
console.log(`To:     ${to}\n`);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
  auth: { user: process.env.SMTP_USER, pass: smtpPass() }
});

(async () => {
  try {
    await transporter.verify();
    console.log('PASS  SMTP connection + credentials accepted\n');

    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_ADDRESS}>`,
      to,
      subject: 'MinT - SMTP configuration test',
      text: 'Gmail SMTP is configured correctly for the MinT Training System.\nPassword reset emails will be delivered through this mailbox.'
    });

    console.log(`PASS  Test email sent (messageId ${info.messageId})`);
    console.log(`\nCheck the inbox for "${FROM_NAME} - SMTP configuration test".`);
    console.log('If it is not there, look in the Spam folder.');
  } catch (error) {
    console.error('FAIL  ' + error.message + '\n');
    if (/auth|credential|535|invalid login/i.test(error.message)) {
      console.error('Likely causes:');
      console.error('  - SMTP_PASS is a Google App Password, not your Gmail password');
      console.error('  - 2-Step Verification is not enabled on the Google account');
      console.error('  - the app password was revoked');
    } else if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(error.message)) {
      console.error('Likely cause: network or firewall blocking outbound port 587.');
    }
    process.exit(1);
  }
})();
