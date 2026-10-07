// Google OAuth2 (authorization code flow).
//
// Flow, end to end:
//
//   1. GET /api/auth/google          -> this service builds the Google consent
//                                      URL and the controller redirects there.
//   2. The user consents. Google redirects back to
//      GET /api/auth/google/callback?code=...&state=...
//   3. The controller checks `state` against the value stored in a cookie, so
//      a third party cannot feed us an authorization code of their choosing.
//   4. The code is exchanged for tokens and the id_token is verified against
//      Google's signing keys, our client id and the token's audience.
//   5. The controller matches the verified email to an EXISTING user row and
//      mints the same JWT that password login issues.
//
// Only step 5's outcome is a decision, and it is made in the controller, not
// here. This module's whole job is to turn a code into a verified identity.

const crypto = require('crypto');

const configured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

// The redirect URI must match one registered for this OAuth client in the
// Google Cloud console, byte for byte. Derived from the public API base URL so
// it follows the deployment instead of being a fourth thing to configure.
const callbackUrl = () => process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

/**
 * Opaque, single-use CSRF token for one login attempt.
 *
 * 32 random bytes, hex encoded. It is echoed back by Google in `state` and
 * compared on the way home; a mismatch means the callback did not originate
 * from a redirect this server started.
 */
const createStateToken = () => crypto.randomBytes(32).toString('hex');

/**
 * Constant-time comparison of the returned state against the stored cookie.
 *
 * timingSafeEqual throws when the two buffers differ in length, so the length
 * is checked first and a mismatch short-circuits to false.
 */
const verifyStateToken = (received, expected) => {
  if (!received || !expected) return false;
  const a = Buffer.from(String(received));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length || a.length === 0) return false;
  return crypto.timingSafeEqual(a, b);
};

const client = () => {
  const { OAuth2Client } = require('google-auth-library');
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl()
  );
};

/**
 * The URL to send the browser to.
 *
 * `state` is what ties the callback back to this attempt. `prompt:
 * 'select_account'` keeps an already-signed-in user from being silently
 * re-authorised as a different account than the one they meant to use.
 */
const buildAuthUrl = (state) =>
  client().generateAuthUrl({
    access_type: 'online',
    scope: ['openid', 'email', 'profile'],
    state,
    prompt: 'select_account',
    include_granted_scopes: true
  });

/**
 * Exchanges an authorization code for a verified identity.
 *
 * Throws on: a bad/expired code, an id_token that fails signature, audience,
 * issuer or expiry checks, or a token whose email is not marked verified.
 *
 * Returns { sub, email, emailVerified, name, picture }.
 *
 * `email_verified` is checked here rather than in the controller because an
 * unverified Google email is not proof of ownership of that address, and email
 * is the ONLY thing used to match the account. Google accounts created by a
 * third party are explicitly allowed to carry an unverified email of a domain
 * they do not own, which is exactly the shape of an account-takeover attempt.
 */
const exchangeCode = async (code) => {
  const { OAuth2Client } = require('google-auth-library');
  const oauth = client();

  const { tokens } = await oauth.getToken(code);

  if (!tokens.id_token) {
    throw new Error('Google did not return an ID token');
  }

  // Throws TokenError when the signature, audience, issuer or expiry is wrong.
  const ticket = await oauth.verifyIdToken({
    idToken: tokens.id_token,
    audience: process.env.GOOGLE_CLIENT_ID
  });

  const payload = ticket.getPayload();

  if (!payload.sub || !payload.email) {
    throw new Error('Google token is missing the subject or email claim');
  }

  if (payload.email_verified !== true && payload.email_verified !== 'true') {
    throw new Error('Google email address is not verified');
  }

  return {
    sub: payload.sub,
    email: String(payload.email).toLowerCase(),
    emailVerified: true,
    name: payload.name || null,
    picture: payload.picture || null
  };
};

module.exports = {
  configured,
  callbackUrl,
  createStateToken,
  verifyStateToken,
  buildAuthUrl,
  exchangeCode
};
