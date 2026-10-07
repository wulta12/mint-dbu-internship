const dotenv = require('dotenv');

dotenv.config();

// Public base URL of the React frontend. The certificate QR code must
// point at the human-readable verification page, not at the API.
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');

// Public verify page for a certificate number, e.g.
// http://localhost:3000/verify/MINT-2026-000123
function certificateVerifyUrl(certificateNumber) {
  return `${FRONTEND_URL}/verify/${encodeURIComponent(certificateNumber || '')}`;
}

// Reset page the user lands on from the emailed link, e.g.
// http://localhost:3000/reset-password?token=<raw token>
function passwordResetUrl(token) {
  return `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(token || '')}`;
}

// How long an emailed reset link stays valid, in minutes. Kept short because
// the link is a bearer credential.
const PASSWORD_RESET_EXPIRY_MINUTES = Math.max(
  5,
  parseInt(process.env.PASSWORD_RESET_EXPIRY_MINUTES, 10) || 60
);

module.exports = {
  FRONTEND_URL,
  certificateVerifyUrl,
  passwordResetUrl,
  PASSWORD_RESET_EXPIRY_MINUTES
};
