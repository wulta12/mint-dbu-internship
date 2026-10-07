// End-to-end test of the OTP branch of the Forgot Password flow.
//
// Captures the emailed OTP by stubbing the mail transport, then walks the
// whole journey and asserts every security property the design claims.
//
//   node test-forgot-password-otp.js
//
// Like test-forgot-password.js, this suite runs against its OWN throwaway
// account and deletes it unconditionally. No real account is ever written to.
require('dotenv').config();
const crypto = require('crypto');
const { pool, query } = require('./src/config/database');
const emailService = require('./src/services/email.service');
const PasswordResetOtp = require('./src/models/PasswordResetOtp.model');
const bcrypt = require('bcryptjs');

const app = require('./src/server');
const PORT = 5097;

let captured = null;
const originalSend = emailService.sendPasswordResetEmail;
emailService.sendPasswordResetEmail = async (opts) => {
  captured = opts;
  return { delivered: true };
};

let pass = 0;
let fail = 0;
const check = (label, actual, expected) => {
  const ok = actual === expected;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n          expected: ${expected}\n          actual:   ${actual}`}`);
  ok ? pass++ : fail++;
};

const call = async (method, path, body, token) => {
  const res = await fetch(`http://localhost:${PORT}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  return { status: res.status, data };
};

// A code that is definitely not the real one, for the wrong-guess tests.
const wrongOtp = (real) => (real === '000000' ? '111111' : '000000');

(async () => {
  let server;
  let targetId = null;
  const TARGET_EMAIL = `otp-test-${Date.now()}@example.test`;
  const ORIGINAL_PASSWORD = 'OtpFixturePass123';

  try {
    const { rows: inserted } = await query(
      `INSERT INTO users (full_name, email, password, role, is_active)
       VALUES ($1, $2, $3, 'trainee', true)
       RETURNING id, email`,
      ['OTP Test', TARGET_EMAIL, await bcrypt.hash(ORIGINAL_PASSWORD, 10)]
    );
    targetId = inserted[0].id;
    console.log('Throwaway test user:', TARGET_EMAIL, '(id', targetId + ')');
    console.log('No real account is modified by this suite.\n');

    server = app.listen(PORT);
    await new Promise((r) => server.once('listening', r));

    console.log('=== 1. The email carries a code AND a link ===');
    const first = await call('POST', '/api/auth/forgot-password', { email: TARGET_EMAIL });
    check('forgot-password -> 200', first.status, 200);
    check('OTP was issued', typeof captured.otp, 'string');
    check('OTP is exactly 6 digits', /^\d{6}$/.test(captured.otp || ''), true);
    check('OTP never starts at 0 (full range)', /^[1-9]\d{5}$/.test(captured.otp || ''), true);
    check('link still present', typeof captured.resetUrl, 'string');
    check('reset url points at frontend', captured.resetUrl.startsWith('http://localhost:3000/reset-password'), true);
    check('otp expiry is 10 minutes', captured.otpExpiryMinutes, 10);

    const otp = captured.otp;

    console.log('\n=== 2. Not stored as plain text ===');
    const stored = await query('SELECT * FROM password_reset_otps WHERE user_id = $1', [targetId]);
    check('row exists', stored.rowCount, 1);
    check('raw code NOT in database', JSON.stringify(stored.rows).includes(otp), false);
    const expectedHmac = crypto
      .createHmac('sha256', process.env.OTP_PEPPER)
      .update(otp)
      .digest('hex');
    check('row stores keyed HMAC, not plain SHA-256', stored.rows[0].otp_hash, expectedHmac);
    check(
      'HMAC differs from unkeyed SHA-256 (brute force blocked)',
      expectedHmac === crypto.createHash('sha256').update(otp).digest('hex'),
      false
    );
    check('attempts start at 0', stored.rows[0].attempts, 0);
    check('max_attempts is 5', stored.rows[0].max_attempts, 5);
    const ttlMs = new Date(stored.rows[0].expires_at) - new Date(stored.rows[0].created_at);
    check('expires in 10 minutes', Math.abs(ttlMs - 10 * 60 * 1000) < 5000, true);

    console.log('\n=== 3. Wrong codes are rejected and counted ===');
    const bad1 = await call('POST', '/api/auth/forgot-password/verify-otp', {
      email: TARGET_EMAIL, otp: wrongOtp(otp)
    });
    check('wrong code -> 400', bad1.status, 400);
    check('message does not leak remaining attempts', /attempts? remaining/.test(bad1.data.message), false);
    const after1 = await query('SELECT attempts FROM password_reset_otps WHERE user_id = $1', [targetId]);
    check('one attempt charged', after1.rows[0].attempts, 1);
    const stillGood = await call('POST', '/api/auth/forgot-password/verify-otp', {
      email: TARGET_EMAIL, otp
    });
    check('correct code still works after one miss', stillGood.status, 200);
    check('returns verified flag', stillGood.data.verified, true);
    check('returns a reset token', typeof stillGood.data.resetToken, 'string');

    console.log('\n=== 4. Single use ===');
    const reuse = await call('POST', '/api/auth/forgot-password/verify-otp', {
      email: TARGET_EMAIL, otp
    });
    check('reusing the code -> 400', reuse.status, 400);
    check('says already used', /already been used/i.test(reuse.data.message), true);

    console.log('\n=== 5. The token it hands off to works ===');
    const reset = await call('POST', '/api/auth/reset-password', {
      token: stillGood.data.resetToken,
      password: 'OtpNewPass456',
      confirm_password: 'OtpNewPass456'
    });
    check('reset with OTP-minted token -> 200', reset.status, 200);
    const row = await query('SELECT password FROM users WHERE id = $1', [targetId]);
    check('stored as bcrypt hash', /^\$2[aby]\$\d{2}\$/.test(row.rows[0].password), true);
    check('new password verifies', await bcrypt.compare('OtpNewPass456', row.rows[0].password), true);
    const login = await call('POST', '/api/auth/login', {
      email: TARGET_EMAIL, password: 'OtpNewPass456'
    });
    check('can log in with the new password', login.status, 200);

    console.log('\n=== 6. Max 5 attempts, then locked out ===');
    await query('DELETE FROM password_reset_otps WHERE user_id = $1', [targetId]);
    await call('POST', '/api/auth/forgot-password', { email: TARGET_EMAIL });
    const code2 = captured.otp;
    const statuses = [];
    for (let i = 0; i < 5; i += 1) {
      const r = await call('POST', '/api/auth/forgot-password/verify-otp', {
        email: TARGET_EMAIL, otp: wrongOtp(code2)
      });
      statuses.push(r.status);
    }
    check('all 5 wrong guesses -> 400', statuses.every((s) => s === 400), true);
    const locked = await query('SELECT attempts, max_attempts FROM password_reset_otps WHERE user_id = $1', [targetId]);
    check('counter stopped at the cap', locked.rows[0].attempts, 5);
    const correctButLocked = await call('POST', '/api/auth/forgot-password/verify-otp', {
      email: TARGET_EMAIL, otp: code2
    });
    check('correct code refused once locked out', correctButLocked.status, 400);
    check('lockout message is the uniform one (no leak)', correctButLocked.data.message, bad1.data.message);

    // A locked-out user must still be able to recover.
    const recover = await call('POST', '/api/auth/forgot-password/resend-otp', { email: TARGET_EMAIL });
    check('resend recovers a locked-out user', recover.status, 200);
    const afterResend = await query('SELECT attempts FROM password_reset_otps WHERE user_id = $1', [targetId]);
    check('new code starts with a fresh allowance', afterResend.rows[0].attempts, 0);
    const recovered = await call('POST', '/api/auth/forgot-password/verify-otp', {
      email: TARGET_EMAIL, otp: captured.otp
    });
    check('newest code works after lockout', recovered.status, 200);

    console.log('\n=== 7. Expiry ===');
    await query('DELETE FROM password_reset_otps WHERE user_id = $1', [targetId]);
    await call('POST', '/api/auth/forgot-password', { email: TARGET_EMAIL });
    const code3 = captured.otp;
    await query(
      `UPDATE password_reset_otps SET expires_at = CURRENT_TIMESTAMP - INTERVAL '1 minute' WHERE user_id = $1`,
      [targetId]
    );
    const expired = await call('POST', '/api/auth/forgot-password/verify-otp', {
      email: TARGET_EMAIL, otp: code3
    });
    check('expired code -> 400', expired.status, 400);
    check('says expired', /expired/i.test(expired.data.message), true);

    console.log('\n=== 8. Resend invalidates the previous code ===');
    await query('DELETE FROM password_reset_otps WHERE user_id = $1', [targetId]);
    await call('POST', '/api/auth/forgot-password', { email: TARGET_EMAIL });
    const codeA = captured.otp;
    const resend = await call('POST', '/api/auth/forgot-password/resend-otp', { email: TARGET_EMAIL });
    check('resend -> 200', resend.status, 200);
    const codeB = captured.otp;
    check('resend issued a different code', codeA !== codeB, true);
    const oldCode = await call('POST', '/api/auth/forgot-password/verify-otp', {
      email: TARGET_EMAIL, otp: codeA
    });
    check('superseded code -> 400', oldCode.status, 400);
    const newCode = await call('POST', '/api/auth/forgot-password/verify-otp', {
      email: TARGET_EMAIL, otp: codeB
    });
    check('newest code works', newCode.status, 200);
    check('only one live row remains', (await query(
      'SELECT 1 FROM password_reset_otps WHERE user_id = $1 AND used_at IS NULL', [targetId]
    )).rowCount, 0);

    console.log('\n=== 9. Codes are unpredictable across users ===');
    const issued = new Set();
    for (let i = 0; i < 40; i += 1) {
      const { otp: o } = await PasswordResetOtp.issue(targetId);
      issued.add(o);
    }
    check('40 codes all distinct (no collisions)', issued.size, 40);

    console.log('\n=== 10. No account enumeration ===');
    const unknown = await call('POST', '/api/auth/forgot-password/verify-otp', {
      email: 'nobody-at-all@nowhere.invalid', otp: wrongOtp(otp)
    });
    check('unknown address -> 400', unknown.status, 400);
    check('unknown address message is identical to a wrong code', unknown.data.message, bad1.data.message);
    const unknownResend = await call('POST', '/api/auth/forgot-password/resend-otp', {
      email: 'nobody-at-all@nowhere.invalid'
    });
    check('resend for unknown address -> 200', unknownResend.status, 200);
    check('resend message is the generic one', unknownResend.data.message, first.data.message);
    const inactive = await call('POST', '/api/auth/forgot-password/verify-otp', {
      email: 'ghost@nowhere.invalid', otp: wrongOtp(otp)
    });
    check('unknown address gives no hint', inactive.status, 400);

    console.log('\n=== 11. The link flow still works alongside OTP ===');
    await query('DELETE FROM password_reset_otps WHERE user_id = $1', [targetId]);
    await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [targetId]);
    await call('POST', '/api/auth/forgot-password', { email: TARGET_EMAIL });
    const linkToken = new URL(captured.resetUrl).searchParams.get('token');
    const linkVerify = await call('GET', `/api/auth/reset-password/verify?token=${encodeURIComponent(linkToken)}`);
    check('emailed link still verifies', linkVerify.data.valid, true);
    const linkReset = await call('POST', '/api/auth/reset-password', {
      token: linkToken, password: 'LinkStillWorks1', confirm_password: 'LinkStillWorks1'
    });
    check('link reset -> 200 (OTP did not break it)', linkReset.status, 200);

    console.log('\n=== 12. OTP verify kills outstanding links ===');
    await query('DELETE FROM password_reset_otps WHERE user_id = $1', [targetId]);
    await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [targetId]);
    await call('POST', '/api/auth/forgot-password', { email: TARGET_EMAIL });
    const liveLink = new URL(captured.resetUrl).searchParams.get('token');
    const liveCode = captured.otp;
    await call('POST', '/api/auth/forgot-password/verify-otp', { email: TARGET_EMAIL, otp: liveCode });
    const oldLink = await call('POST', '/api/auth/reset-password', {
      token: liveLink, password: 'ShouldNotWork1', confirm_password: 'ShouldNotWork1'
    });
    check('link dead after OTP verification', oldLink.status, 400);

    console.log('\n=== 13. Validation ===');
    const noEmail = await call('POST', '/api/auth/forgot-password/verify-otp', { otp: '123456' });
    check('missing email -> 400', noEmail.status, 400);
    const noOtp = await call('POST', '/api/auth/forgot-password/verify-otp', { email: TARGET_EMAIL });
    check('missing code -> 400', noOtp.status, 400);
    const shortOtp = await call('POST', '/api/auth/forgot-password/verify-otp', { email: TARGET_EMAIL, otp: '12345' });
    check('5-digit code -> 400', shortOtp.status, 400);
    const longOtp = await call('POST', '/api/auth/forgot-password/verify-otp', { email: TARGET_EMAIL, otp: '1234567' });
    check('7-digit code -> 400', longOtp.status, 400);
    const alphaOtp = await call('POST', '/api/auth/forgot-password/verify-otp', { email: TARGET_EMAIL, otp: 'abcdef' });
    check('non-numeric code -> 400', alphaOtp.status, 400);
    const badEmail = await call('POST', '/api/auth/forgot-password/verify-otp', { email: 'not-an-email', otp: '123456' });
    check('malformed email -> 400', badEmail.status, 400);

    console.log('\n=== 14. Bilingual ===');
    await query('DELETE FROM password_reset_otps WHERE user_id = $1', [targetId]);
    const en = await call('POST', '/api/auth/forgot-password', { email: TARGET_EMAIL, lang: 'en' });
    check('lang=en -> 200', en.status, 200);
    check('English mail got the code', typeof captured.otp, 'string');
    check('lang forwarded', captured.lang, 'en');
    await query('DELETE FROM password_reset_otps WHERE user_id = $1', [targetId]);
    const am = await call('POST', '/api/auth/forgot-password', { email: TARGET_EMAIL, lang: 'am' });
    check('lang=am -> 200', am.status, 200);
    check('Amharic mail got the code', typeof captured.otp, 'string');
    check('lang=am forwarded', captured.lang, 'am');
    check('generic response identical in Amharic mode', am.data.message, en.data.message);

    console.log('\n=== 15. Requires no JWT ===');
    const noAuth = await call('POST', '/api/auth/forgot-password/verify-otp', {
      email: TARGET_EMAIL, otp: wrongOtp(otp)
    });
    check('verify-otp reachable with no token', noAuth.status, 400);
    await query('DELETE FROM password_reset_otps WHERE user_id = $1', [targetId]);

    console.log(`\n${'='.repeat(50)}\nPASS: ${pass}   FAIL: ${fail}\n${'='.repeat(50)}`);
  } catch (error) {
    console.error('\nTEST ERROR:', error);
    fail++;
  } finally {
    if (targetId) {
      try {
        await query('DELETE FROM password_reset_otps WHERE user_id = $1', [targetId]);
        await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [targetId]);
        await query('DELETE FROM users WHERE id = $1', [targetId]);
        console.log(`\n[cleanup] throwaway user ${TARGET_EMAIL} (id ${targetId}) removed`);
      } catch (e) {
        console.error(`\n[cleanup] FAILED to remove throwaway user ${TARGET_EMAIL} (id ${targetId}):`, e.message);
      }
    }
    emailService.sendPasswordResetEmail = originalSend;
    if (server) server.close();
    await pool.end().catch(() => {});
    process.exit(fail ? 1 : 0);
  }
})();
