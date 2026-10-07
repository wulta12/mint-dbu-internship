const crypto = require('crypto');
const { query } = require('../config/database');

// A token is only ever handed to the user in the reset email. The database
// stores SHA-256(token) and nothing else, so reading this table cannot be
// turned into the ability to reset anyone's password. SHA-256 is correct here
// (rather than bcrypt) because the input is already 256 bits of CSPRNG
// entropy, so there is nothing to brute-force.
class PasswordResetToken {
  // Mints a new raw token for a user and returns both the raw value (to embed
  // in the email) and the row id. Any tokens previously outstanding for this
  // user are burned, so only the newest email link can ever work.
  static async issue(userId, expiryMinutes) {
    const rawToken = crypto.randomBytes(32).toString('base64url');
    const tokenHash = PasswordResetToken.hashToken(rawToken);

    const result = await query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP + ($3 || ' minutes')::interval)
       RETURNING id, user_id, expires_at, created_at`,
      [userId, tokenHash, String(expiryMinutes)]
    );

    await PasswordResetToken.invalidateAllForUser(userId, result.rows[0].id);

    return { rawToken, tokenHash, ...result.rows[0] };
  }

  static hashToken(rawToken) {
    return crypto.createHash('sha256').update(String(rawToken)).digest('hex');
  }

  // Burns every outstanding token for a user, optionally keeping one.
  // Used when issuing a new token and when a password is changed.
  static async invalidateAllForUser(userId, exceptId = null) {
    const result = await query(
      `UPDATE password_reset_tokens
       SET used_at = CURRENT_TIMESTAMP
       WHERE user_id = $1
         AND used_at IS NULL
         AND ($2::int IS NULL OR id <> $2::int)`,
      [userId, exceptId]
    );
    return result.rowCount;
  }

  // Returns the token row only when it is genuinely usable: not spent, not
  // expired. Callers must treat a null result as an invalid link.
  static async findUsable(tokenHash) {
    const result = await query(
      `SELECT id, user_id, expires_at
       FROM password_reset_tokens
       WHERE token_hash = $1
         AND used_at IS NULL
         AND expires_at > CURRENT_TIMESTAMP`,
      [tokenHash]
    );
    return result.rows[0] || null;
  }

  // Atomically burns a token. The `used_at IS NULL` predicate is what makes
  // the token single-use: two concurrent submissions of the same link cannot
  // both win, because only one UPDATE can match the row before it is stamped.
  static async consume(tokenHash) {
    const result = await query(
      `UPDATE password_reset_tokens
       SET used_at = CURRENT_TIMESTAMP
       WHERE token_hash = $1
         AND used_at IS NULL
         AND expires_at > CURRENT_TIMESTAMP
       RETURNING id, user_id`,
      [tokenHash]
    );
    return result.rows[0] || null;
  }

  // Distinguishes "already used" from "never existed" so the API can return
  // a precise reason, without revealing anything about which accounts exist.
  static async findAny(tokenHash) {
    const result = await query(
      `SELECT id, user_id, used_at, expires_at
       FROM password_reset_tokens
       WHERE token_hash = $1`,
      [tokenHash]
    );
    return result.rows[0] || null;
  }

  // Housekeeping: drop tokens that are spent or expired. Called opportunistically
  // when a token is issued, so the table cannot grow without bound.
  static async purgeExpired() {
    const result = await query(
      `DELETE FROM password_reset_tokens
       WHERE used_at IS NOT NULL
          OR expires_at <= CURRENT_TIMESTAMP`
    );
    return result.rowCount;
  }
}

module.exports = PasswordResetToken;
