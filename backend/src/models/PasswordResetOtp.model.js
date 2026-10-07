const crypto = require('crypto');
const { query } = require('../config/database');

// ------------------------------------------------------------------
// One-time codes for the Forgot Password flow.
//
// Why this is keyed, and why the link token beside it is not
// ------------------------------------------------------------------
// PasswordResetToken stores a plain SHA-256, which is correct there: the
// token is 256 bits of CSPRNG output, so there is nothing to brute-force.
//
// A 6-digit OTP is the opposite. There are only 1,000,000 possible codes, so
// an unkeyed hash of one is no protection at all - an attacker with a database
// dump hashes all one million candidates and reads off the plaintext in
// seconds. Storing HMAC-SHA256 keyed by a pepper that lives only in .env fixes
// that: the dump alone no longer reveals the code, because the attacker does
// not hold the key.
//
// The pepper is never written to the database and never logged.
// ------------------------------------------------------------------

const PEPPER_FALLBACK_WARNING = '[otp] OTP_PEPPER is not set in .env - deriving a temporary key from JWT_SECRET. Set a dedicated OTP_PEPPER.';

let warnedMissingPepper = false;

// Resolved once. Falls back to a JWT_SECRET-derived key so a missing OTP_PEPPER
// degrades to "still keyed, but shares a secret with token signing" rather than
// silently becoming an unkeyed hash.
const getPepper = () => {
  const configured = process.env.OTP_PEPPER;
  if (configured) return configured;

  if (!warnedMissingPepper) {
    warnedMissingPepper = true;
    console.warn(PEPPER_FALLBACK_WARNING);
  }
  return crypto.hkdfSync(
    'sha256',
    Buffer.from(process.env.JWT_SECRET || 'insecure-development-only', 'utf8'),
    Buffer.from('password-reset-otp', 'utf8'),
    Buffer.from('otp-pepper', 'utf8'),
    32
  ).toString('hex');
};

const EXPIRY_MINUTES = Math.max(1, parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 10);
const MAX_ATTEMPTS = Math.max(1, parseInt(process.env.OTP_MAX_ATTEMPTS, 10) || 5);

class PasswordResetOtp {
  // Mints a code for a user. Returns the plaintext (to embed in the email) and
  // the row id. Any code previously outstanding for this user is burned, so
  // only the newest email can ever be used - which is what makes "resend"
  // invalidate the previous code for free.
  static async issue(userId, opts = {}) {
    const expiryMinutes = opts.expiryMinutes || EXPIRY_MINUTES;
    const maxAttempts = opts.maxAttempts || MAX_ATTEMPTS;

    // randomInt, not Math.random, and not 100000 + random()%900000: a modulo
    // over a non-uniform source skews the low digits. randomInt gives a
    // uniform distribution over the whole range and is a CSPRNG.
    const otp = String(crypto.randomInt(100000, 1000000));
    const otpHash = PasswordResetOtp.hashOtp(otp);

    const result = await query(
      `INSERT INTO password_reset_otps (user_id, otp_hash, attempts, max_attempts, expires_at)
       VALUES ($1, $2, 0, $3, CURRENT_TIMESTAMP + ($4 || ' minutes')::interval)
       RETURNING id, user_id, expires_at, max_attempts, created_at`,
      [userId, otpHash, maxAttempts, String(expiryMinutes)]
    );

    await PasswordResetOtp.invalidateAllForUser(userId, result.rows[0].id);

    return { otp, otpHash, ...result.rows[0] };
  }

  // Keyed hash. Never log the argument or the result of this.
  static hashOtp(otp) {
    return crypto
      .createHmac('sha256', getPepper())
      .update(String(otp))
      .digest('hex');
  }

  // Burns every outstanding code for a user, optionally keeping one. Used when
  // issuing and on resend, so a resend genuinely invalidates the old code.
  static async invalidateAllForUser(userId, exceptId = null) {
    const result = await query(
      `UPDATE password_reset_otps
       SET used_at = CURRENT_TIMESTAMP
       WHERE user_id = $1
         AND used_at IS NULL
         AND ($2::int IS NULL OR id <> $2::int)`,
      [userId, exceptId]
    );
    return result.rowCount;
  }

  // The user's current live code row, or null. Deliberately returns no hash to
  // the caller - verification compares hashes in SQL, not in JavaScript.
  static async findCurrent(userId) {
    const result = await query(
      `SELECT id, attempts, max_attempts, expires_at
       FROM password_reset_otps
       WHERE user_id = $1
         AND used_at IS NULL
         AND expires_at > CURRENT_TIMESTAMP
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  // The row for this exact code, whatever its state - lets the API say
  // "expired" versus "already used" instead of a bare "wrong".
  static async findAnyForUser(userId, otp) {
    const result = await query(
      `SELECT id, attempts, max_attempts, used_at, expires_at
       FROM password_reset_otps
       WHERE user_id = $1 AND otp_hash = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, PasswordResetOtp.hashOtp(otp)]
    );
    return result.rows[0] || null;
  }

  // Atomically claims a code. The `attempts < max_attempts` and
  // `used_at IS NULL` predicates are what make a code single-use and
  // guess-proof: once five wrong tries are spent, even the correct code can
  // no longer match, and concurrent submits cannot both win.
  static async consume(userId, otp) {
    const result = await query(
      `UPDATE password_reset_otps
       SET used_at = CURRENT_TIMESTAMP
       WHERE user_id = $1
         AND otp_hash = $2
         AND used_at IS NULL
         AND expires_at > CURRENT_TIMESTAMP
         AND attempts < max_attempts
       RETURNING id, user_id`,
      [userId, PasswordResetOtp.hashOtp(otp)]
    );
    return result.rows[0] || null;
  }

  // Charges one guess against the user's current live code.
  //
  // Deliberately does NOT filter on otp_hash. A wrong guess hashes to
  // something that is by definition not the stored hash, so matching on it
  // would update zero rows and the counter would never move - leaving the
  // five-attempt cap unenforced. The guess belongs to the outstanding code, so
  // that is the row that gets charged.
  //
  // A single atomic UPDATE, so parallel wrong guesses cannot race past the cap
  // the way read-modify-write in JavaScript would. The `attempts <
  // max_attempts` predicate stops it overshooting.
  static async registerFailedAttempt(userId) {
    const result = await query(
      `UPDATE password_reset_otps o
       SET attempts = o.attempts + 1
       FROM (
         SELECT id FROM password_reset_otps
         WHERE user_id = $1
           AND used_at IS NULL
           AND expires_at > CURRENT_TIMESTAMP
         ORDER BY created_at DESC
         LIMIT 1
       ) AS live
       WHERE o.id = live.id
         AND o.attempts < o.max_attempts
       RETURNING o.id, o.attempts, o.max_attempts`,
      [userId]
    );
    return result.rows[0] || null;
  }

  // Housekeeping: drop spent, exhausted, or expired rows. Called opportunistically
  // when a code is issued so the table cannot grow without bound.
  static async purge() {
    const result = await query(
      `DELETE FROM password_reset_otps
       WHERE used_at IS NOT NULL
          OR expires_at <= CURRENT_TIMESTAMP
          OR attempts >= max_attempts`
    );
    return result.rowCount;
  }
}

PasswordResetOtp.EXPIRY_MINUTES = EXPIRY_MINUTES;
PasswordResetOtp.MAX_ATTEMPTS = MAX_ATTEMPTS;

module.exports = PasswordResetOtp;
