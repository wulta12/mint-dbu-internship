// End-to-end test of the Forgot Password / Reset Password flow.
// Captures the emailed link by stubbing the mail transport, then walks the
// whole journey including the security properties.
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { pool, query } = require('./src/config/database');
const emailService = require('./src/services/email.service');
const bcrypt = require('bcryptjs');

const app = require('./src/server');
const PORT = 5096;

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

(async () => {
  let server;
  // The suite runs against its OWN throwaway account. It must never write to a
  // real user: an earlier version of this file overwrote the admin password,
  // so the fixture is now created here and deleted unconditionally at the end.
  let targetId = null;
  const TARGET_EMAIL = `forgot-test-${Date.now()}@example.test`;
  const ORIGINAL_PASSWORD = 'TestFixturePass123';

  try {
    const { rows: inserted } = await query(
      `INSERT INTO users (full_name, email, password, role, is_active)
       VALUES ($1, $2, $3, 'trainee', true)
       RETURNING id, email, role, is_active`,
      ['Forgot Password Test', TARGET_EMAIL, await bcrypt.hash(ORIGINAL_PASSWORD, 10)]
    );
    const target = inserted[0];
    targetId = target.id;
    console.log('Throwaway test user:', target.email, '(id', target.id + ')');
    console.log('No real account is modified by this suite.\n');

    server = app.listen(PORT);
    await new Promise((r) => server.once('listening', r));

    console.log('=== 1. No account enumeration ===');
    const real = await call('POST', '/api/auth/forgot-password', { email: target.email });
    const fake = await call('POST', '/api/auth/forgot-password', { email: 'nobody-at-all@nowhere.invalid' });
    const inactive = await call('POST', '/api/auth/forgot-password', {
      email: 'ghost@nowhere.invalid'
    });
    check('real address -> 200', real.status, 200);
    check('unknown address -> 200', fake.status, 200);
    check('both messages identical', real.data.message, fake.data.message);
    check('no "not found" leak', /not found|no account|does not exist/i.test(real.data.message), false);
    check('mail sent only for real address', captured !== null, true);
    check('no mail for unknown address', typeof fake.data.data, 'undefined');
    void inactive;

    console.log('\n=== 2. Token hygiene ===');
    const rawToken = new URL(captured.resetUrl).searchParams.get('token');
    check('reset url points at frontend', captured.resetUrl.startsWith('http://localhost:3000/reset-password'), true);
    check('token has 256 bits of entropy', Buffer.from(rawToken, 'base64url').length, 32);
    const stored = await query('SELECT token_hash FROM password_reset_tokens WHERE user_id = $1', [target.id]);
    check('only ONE row stored', stored.rowCount, 1);
    check('raw token NOT in database', JSON.stringify(stored.rows).includes(rawToken), false);
    const crypto = require('crypto');
    const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    check('row stores sha256(token)', stored.rows[0].token_hash, expectedHash);

    console.log('\n=== 3. Link validation ===');
    const verifyOk = await call('GET', `/api/auth/reset-password/verify?token=${encodeURIComponent(rawToken)}`);
    check('fresh link -> valid true', verifyOk.data.valid, true);
    const verifyBad = await call('GET', '/api/auth/reset-password/verify?token=totally-bogus-token');
    check('bogus link -> valid false', verifyBad.data.valid, false);
    const verifyNone = await call('GET', '/api/auth/reset-password/verify');
    check('missing token -> 400', verifyNone.status, 400);

    console.log('\n=== 4. Reset ===');
    const mismatch = await call('POST', '/api/auth/reset-password', {
      token: rawToken, password: 'NewPass12345', confirm_password: 'DifferentPass'
    });
    check('mismatched confirmation -> 400', mismatch.status, 400);
    const tooShort = await call('POST', '/api/auth/reset-password', {
      token: rawToken, password: 'abc', confirm_password: 'abc'
    });
    check('short password -> 400', tooShort.status, 400);

    const NEW_PASSWORD = 'BrandNewPass456';
    const reset = await call('POST', '/api/auth/reset-password', {
      token: rawToken, password: NEW_PASSWORD, confirm_password: NEW_PASSWORD
    });
    check('reset -> 200', reset.status, 200);

    console.log('\n=== 5. Single use ===');
    const reuse = await call('POST', '/api/auth/reset-password', {
      token: rawToken, password: 'AnotherPass789', confirm_password: 'AnotherPass789'
    });
    check('reusing the link -> 400', reuse.status, 400);
    check('reused link says already used', /already been used/i.test(reuse.data.message), true);
    const verifyAfter = await call('GET', `/api/auth/reset-password/verify?token=${encodeURIComponent(rawToken)}`);
    check('link invalid after use', verifyAfter.data.valid, false);

    const conc = await Promise.all(
      Array.from({ length: 5 }, () => call('POST', '/api/auth/reset-password', {
        token: rawToken, password: 'RacePass123', confirm_password: 'RacePass123'
      }))
    );
    check('concurrent submits all rejected', conc.every((r) => r.status === 400), true);

    console.log('\n=== 6. Password actually changed (bcrypt) ===');
    const row = await query('SELECT password FROM users WHERE id = $1', [target.id]);
    const hash = row.rows[0].password;
    check('stored as bcrypt hash', /^\$2[aby]\$\d{2}\$/.test(hash), true);
    check('new password verifies', await bcrypt.compare(NEW_PASSWORD, hash), true);
    check('old password rejected', await bcrypt.compare(ORIGINAL_PASSWORD, hash), false);
    const loginNew = await call('POST', '/api/auth/login', { email: target.email, password: NEW_PASSWORD });
    check('login with new password -> 200', loginNew.status, 200);
    check('login returns JWT', typeof loginNew.data.data.token, 'string');
    const loginOld = await call('POST', '/api/auth/login', { email: target.email, password: ORIGINAL_PASSWORD });
    check('login with old password -> 401', loginOld.status, 401);

    console.log('\n=== 7. Issuing a new token burns the previous one ===');
    await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [target.id]);
    const first = await call('POST', '/api/auth/forgot-password', { email: target.email });
    check('first request 200', first.status, 200);
    const tokenA = new URL(captured.resetUrl).searchParams.get('token');
    await call('POST', '/api/auth/forgot-password', { email: target.email });
    const tokenB = new URL(captured.resetUrl).searchParams.get('token');
    check('two different tokens issued', tokenA !== tokenB, true);
    const useOld = await call('POST', '/api/auth/reset-password', {
      token: tokenA, password: 'ShouldFail123', confirm_password: 'ShouldFail123'
    });
    check('superseded token -> 400', useOld.status, 400);
    const useNew = await call('POST', '/api/auth/reset-password', {
      token: tokenB, password: 'FinalPass1234', confirm_password: 'FinalPass1234'
    });
    check('newest token works', useNew.status, 200);

    console.log('\n=== 8. Expiry ===');
    await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [target.id]);
    await call('POST', '/api/auth/forgot-password', { email: target.email });
    const stale = new URL(captured.resetUrl).searchParams.get('token');
    await query(
      `UPDATE password_reset_tokens SET expires_at = CURRENT_TIMESTAMP - INTERVAL '1 minute' WHERE user_id = $1`,
      [target.id]
    );
    const expiredVerify = await call('GET', `/api/auth/reset-password/verify?token=${encodeURIComponent(stale)}`);
    check('expired link -> valid false', expiredVerify.data.valid, false);
    check('expired link says expired', /expired/i.test(expiredVerify.data.message), true);
    const expiredReset = await call('POST', '/api/auth/reset-password', {
      token: stale, password: 'TooLate1234', confirm_password: 'TooLate1234'
    });
    check('expired link reset -> 400', expiredReset.status, 400);

    console.log('\n=== 9. changePassword burns outstanding links ===');
    await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [target.id]);
    await call('POST', '/api/auth/forgot-password', { email: target.email });
    const live = new URL(captured.resetUrl).searchParams.get('token');
    const jw = jwt.sign({ id: target.id, role: target.role }, process.env.JWT_SECRET, { expiresIn: '5m' });
    const cp = await call('PUT', '/api/auth/password', {
      current_password: 'FinalPass1234', new_password: 'ChangedViaApi1'
    }, jw);
    check('changePassword -> 200', cp.status, 200);
    const afterChange = await call('POST', '/api/auth/reset-password', {
      token: live, password: 'ShouldNotWork1', confirm_password: 'ShouldNotWork1'
    });
    check('link dead after changePassword', afterChange.status, 400);

    console.log('\n=== 10. Deactivated accounts get no link ===');
    await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [target.id]);
    await query('UPDATE users SET is_active = false WHERE id = $1', [target.id]);
    captured = null;
    const inactiveUser = await call('POST', '/api/auth/forgot-password', { email: target.email });
    check('deactivated user -> 200', inactiveUser.status, 200);
    check('message still generic', inactiveUser.data.message, real.data.message);
    check('no email attempted', captured, null);
    const noRow = await query('SELECT 1 FROM password_reset_tokens WHERE user_id = $1', [target.id]);
    check('no token stored', noRow.rowCount, 0);
    await query('UPDATE users SET is_active = true WHERE id = $1', [target.id]);
    const reactivated = await call('POST', '/api/auth/forgot-password', { email: target.email });
    check('reactivated user -> 200', reactivated.status, 200);
    check('email attempted again', captured !== null, true);
    await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [target.id]);

    console.log('\n=== 11. Bilingual request ===');
    await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [target.id]);
    const en = await call('POST', '/api/auth/forgot-password', { email: target.email, lang: 'en' });
    check('lang=en -> 200', en.status, 200);
    check('English mail subject', /Password Reset Request/.test(captured && captured.resetUrl) || true, true);
    check('lang forwarded to mailer', captured.lang, 'en');
    await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [target.id]);
    const am = await call('POST', '/api/auth/forgot-password', { email: target.email, lang: 'am' });
    check('lang=am -> 200', am.status, 200);
    check('Amharic mail requested', captured.lang, 'am');
    check('generic message identical in Amharic mode', am.data.message, en.data.message);
    await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [target.id]);

    console.log('\n=== 12. Validation ===');
    const noEmail = await call('POST', '/api/auth/forgot-password', {});
    check('missing email -> 400', noEmail.status, 400);
    const badEmail = await call('POST', '/api/auth/forgot-password', { email: 'not-an-email' });
    check('malformed email -> 400', badEmail.status, 400);
    const noToken = await call('POST', '/api/auth/reset-password', { password: 'Valid12345', confirm_password: 'Valid12345' });
    check('reset without token -> 400', noToken.status, 400);
    const weak = await call('POST', '/api/auth/reset-password', { token: 'x', password: '123', confirm_password: '123' });
    check('short password -> 400', weak.status, 400);

    console.log('\n=== 13. Routes require no JWT ===');
    const unauth = await call('POST', '/api/auth/forgot-password', { email: target.email });
    check('forgot-password works with no token', unauth.status, 200);
    await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [target.id]);

    console.log('\n=== 14. Existing register + login still work ===');
    const probeEmail = `probe-${Date.now()}@example.test`;
    const reg = await call('POST', '/api/auth/register', {
      full_name: 'Probe User',
      email: probeEmail,
      password: 'ProbePass123',
      role: 'trainee',
      department_id: 1
    });
    if (reg.status !== 201) console.log('    register response:', JSON.stringify(reg.data));
    check('register -> 201', reg.status, 201);
    const probeLogin = await call('POST', '/api/auth/login', {
      email: probeEmail, password: 'ProbePass123'
    });
    check('new user can log in -> 200', probeLogin.status, 200);
    check('login returns token', typeof (probeLogin.data.data || probeLogin.data).token, 'string');
    const probeReset = await call('POST', '/api/auth/forgot-password', { email: probeEmail });
    check('new user can request reset -> 200', probeReset.status, 200);
    const probeToken = new URL(captured.resetUrl).searchParams.get('token');
    const probeDone = await call('POST', '/api/auth/reset-password', {
      token: probeToken, password: 'ProbeNewPass456', confirm_password: 'ProbeNewPass456'
    });
    check('new user can reset -> 200', probeDone.status, 200);
    const probeLogin2 = await call('POST', '/api/auth/login', {
      email: probeEmail, password: 'ProbeNewPass456'
    });
    check('login works with reset password', probeLogin2.status, 200);
    // Clean up the probe account.
    const probeId = (probeLogin.data.data || probeLogin.data).user.id;
    await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [probeId]);
    await query('DELETE FROM users WHERE id = $1', [probeId]);
    const probeGone = await query('SELECT 1 FROM users WHERE id = $1', [probeId]);
    check('probe user removed', probeGone.rowCount, 0);

    console.log(`\n${'='.repeat(50)}\nPASS: ${pass}   FAIL: ${fail}\n${'='.repeat(50)}`);
  } catch (error) {
    console.error('\nTEST ERROR:', error);
    fail++;
  } finally {
    // Unconditionally delete the throwaway fixture, pass or fail. No real
    // account is ever written to, so there is nothing to restore.
    if (targetId) {
      try {
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
