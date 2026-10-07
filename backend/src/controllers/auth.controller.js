const User = require('../models/User.model');
const Trainer = require('../models/Trainer.model');
const PasswordResetToken = require('../models/PasswordResetToken.model');
const PasswordResetOtp = require('../models/PasswordResetOtp.model');
const emailService = require('../services/email.service');
const googleAuth = require('../services/googleAuth.service');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');
const { ApiError } = require('../middleware/error');
const { passwordResetUrl, FRONTEND_URL, PASSWORD_RESET_EXPIRY_MINUTES } = require('../config/app.config');

// The single response for every "Forgot Password?" submission, whether or not
// the address is registered. Any wording difference here would let an attacker
// enumerate which emails have accounts.
const FORGOT_PASSWORD_RESPONSE =
  'If an account exists for that email address, a password reset link has been sent. Please check your inbox.';

// Debugging aid, OFF by default. When set, the endpoint reports the real
// delivery outcome so a developer can tell "mail sent" from "address
// undeliverable" without reading server logs.
//
// It is deliberately opt-in rather than tied to NODE_ENV: reporting the true
// outcome makes the endpoint an account-enumeration oracle, so it must not
// come along for the ride just because the app is running in development.
// Never enable this in production.
const PASSWORD_RESET_VERBOSE =
  String(process.env.PASSWORD_RESET_VERBOSE || '').toLowerCase() === 'true';

// Burned on the happy path too, so a user who made a typo still waits the same
// amount of time and gets the same status code as one whose mail was sent.
const DUMMY_RESET_HASH = '0'.repeat(64);

// Generate JWT Token
const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Register new user (trainee self-registration, or trainer created by admin)
exports.register = async (req, res, next) => {
  try {
    const {
      full_name, email, password, phone, role = 'trainee',
      department_id, specialization, qualification, biography
    } = req.body;

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw new ApiError(400, 'User with this email already exists');
    }

    let isAdmin = false;
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (user && user.role === 'admin') {
          isAdmin = true;
        }
      } catch (err) {
        // Invalid token: treat the request as public
      }
    }

    const finalRole = role || 'trainee';

    if (finalRole === 'trainer' && !isAdmin) {
      throw new ApiError(403, 'Only administrators can create trainer accounts');
    }

    if (!['trainee', 'trainer'].includes(finalRole)) {
      throw new ApiError(400, 'Invalid role. Allowed roles: trainee, trainer');
    }

    // Trainees must select a department that exists in the system.
    if (finalRole === 'trainee' && !department_id) {
      throw new ApiError(400, 'Please select your department to continue');
    }

    if (finalRole === 'trainee') {
      const deptResult = await query('SELECT id, is_active FROM departments WHERE id = $1', [department_id]);
      if (deptResult.rows.length === 0) {
        throw new ApiError(400, 'Invalid department selected');
      }
      if (!deptResult.rows[0].is_active) {
        throw new ApiError(400, 'Selected department is inactive');
      }
    }

    const newUser = await User.create({
      full_name,
      email,
      password,
      phone,
      role: finalRole,
      department_id: finalRole === 'trainee' ? department_id : (department_id || null)
    });

    // Create trainer profile record when an admin adds a trainer
    if (finalRole === 'trainer' && isAdmin) {
      await Trainer.create({
        user_id: newUser.id,
        department_id,
        specialization,
        qualification,
        biography
      });
    }

    let token = null;
    if (!isAdmin) {
      token = generateToken(newUser.id, newUser.role);
    }

    res.status(201).json({
      success: true,
      message: finalRole === 'trainer' ? 'Trainer created successfully!' : 'Registration successful!',
      data: { user: newUser, token }
    });
  } catch (error) {
    if (error.code === '23505') {
      return next(new ApiError(400, 'User with this email already exists'));
    }
    next(error);
  }
};

// Login user
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    if (user.is_active === false || user.is_active === null) {
      throw new ApiError(401, 'Your account is inactive. Please contact administrator.');
    }

    const isPasswordValid = await User.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid email or password');
    }

    delete user.password;

    const token = generateToken(user.id, user.role);

    res.json({
      success: true,
      message: 'Login successful!',
      data: { token, user }
    });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------------------------
// Google sign-in ("Continue with Google")
//
// Google is an ADDITIONAL door into an account that already exists. It never
// creates one. That is what keeps the existing rules intact:
//
//   * Registration is unchanged - an account still comes into being through
//     POST /register with an email + password, so a Google identity can never
//     be the source of an admin or trainer account.
//   * The verified Google email must already belong to a user row.
//   * The role, department and is_active come from that row, never from the
//     token, so an inactive account stays inactive and a trainer stays a
//     trainer. The Google token is used for authentication only.
//
// The password hash is left untouched, so password login and forgot-password
// keep working exactly as before for every account.
// ------------------------------------------------------------

const GOOGLE_STATE_COOKIE = 'mint_google_oauth_state';

// Read one cookie off the request without pulling in cookie-parser.
// Only ever called with our own fixed cookie name.
function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(eq + 1).trim());
    } catch (e) {
      return null;
    }
  }
  return null;
}

// SameSite=Lax, not Strict: the callback arrives as a top-level GET navigation
// from accounts.google.com, and a Strict cookie is withheld on exactly that
// cross-site navigation, which would break the flow every single time. Lax
// still withholds the cookie on cross-site POST/XHR, which is where CSRF on
// this endpoint would actually matter.
function setStateCookie(res, value) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.append(
    'Set-Cookie',
    `${GOOGLE_STATE_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=600; HttpOnly; SameSite=Lax${secure}`
  );
}

function clearStateCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.append(
    'Set-Cookie',
    `${GOOGLE_STATE_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`
  );
}

// Where the browser lands after the callback. The outcome travels in the URL
// FRAGMENT, not the query string: a fragment is never sent in an HTTP request
// and never appears in a Referer header, so the JWT cannot leak into server
// logs, shared screenshots of the address bar, or another site's analytics.
function googleResultUrl(fields) {
  const hash = fields ? new URLSearchParams(fields).toString() : '';
  return `${FRONTEND_URL}/login#${hash}`;
}

// Every way the flow can end in a message the trainee can act on. Kept here so
// the wording lives next to the decision that produced it, and the frontend
// never has to invent copy for a failure it did not cause.
const GOOGLE_ERROR_MESSAGES = {
  google_not_configured:
    'Sign in with Google is not available on this server. Please sign in with your email and password.',
  google_access_denied: 'Google sign-in was cancelled.',
  google_state_mismatch:
    'Google sign-in could not be verified. Please try again.',
  google_missing_code:
    'Google sign-in did not return a valid authorization code. Please try again.',
  google_verification_failed:
    'Google sign-in could not be verified. Please try again.',
  google_no_account:
    'No MinT account uses that Google email address. Please register with your email and password first, then sign in with Google.',
  google_account_linked_elsewhere:
    'That email address is already linked to a different Google account. Please sign in with your email and password.',
  google_account_inactive:
    'Your account is inactive. Please contact administrator.'
};

function googleFail(res, code) {
  return res.redirect(
    googleResultUrl({ error: code, message: GOOGLE_ERROR_MESSAGES[code] || GOOGLE_ERROR_MESSAGES.google_verification_failed })
  );
}

// Lets the login page hide the Google button on a deployment that has no OAuth
// client configured, instead of showing a button that always fails.
exports.googleStatus = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: { enabled: googleAuth.configured() }
    });
  } catch (error) {
    next(error);
  }
};

// Step 1: send the browser to Google's consent screen.
exports.googleStart = async (req, res, next) => {
  try {
    if (!googleAuth.configured()) {
      return googleFail(res, 'google_not_configured');
    }

    const state = googleAuth.createStateToken();
    setStateCookie(res, state);
    return res.redirect(googleAuth.buildAuthUrl(state));
  } catch (error) {
    next(error);
  }
};

// Step 2: Google redirects back here with ?code=...&state=...
exports.googleCallback = async (req, res, next) => {
  try {
    if (!googleAuth.configured()) {
      return googleFail(res, 'google_not_configured');
    }

    const { error: oauthError, state, code } = req.query;

    // The user pressed Cancel, or Google refused.
    if (oauthError) {
      clearStateCookie(res);
      return googleFail(res, oauthError === 'access_denied' ? 'google_access_denied' : 'google_verification_failed');
    }

    // CSRF: the callback must answer a redirect this server started. The stored
    // value is consumed and cleared whether or not it matches, so one attempt
    // cannot be replayed.
    const expectedState = readCookie(req, GOOGLE_STATE_COOKIE);
    clearStateCookie(res);

    if (!googleAuth.verifyStateToken(state, expectedState)) {
      return googleFail(res, 'google_state_mismatch');
    }

    if (!code || typeof code !== 'string') {
      return googleFail(res, 'google_missing_code');
    }

    // Signature, audience, issuer, expiry and email_verified are all checked
    // inside the service; a failure here means we cannot trust the identity.
    let identity;
    try {
      identity = await googleAuth.exchangeCode(code);
    } catch (err) {
      console.error('Google token exchange failed:', err.message);
      return googleFail(res, 'google_verification_failed');
    }

    // Already linked? Resolve by `sub` alone. It is immutable, so the link
    // survives an email change and cannot be re-pointed by anyone.
    let user = await User.findByGoogleId(identity.sub);

    if (!user) {
      // First sign-in: the verified email has to belong to an existing account.
      const byEmail = await User.findByEmailCaseInsensitive(identity.email);
      if (!byEmail) {
        return googleFail(res, 'google_no_account');
      }

      // Already linked to a DIFFERENT Google identity. Refused rather than
      // re-pointed: overwriting would let anyone able to receive mail at that
      // address take the account over.
      if (byEmail.google_id && byEmail.google_id !== identity.sub) {
        return googleFail(res, 'google_account_linked_elsewhere');
      }

      const linked = await User.linkGoogleAccount(byEmail.id, identity.sub);
      if (!linked) {
        // Lost a race against a concurrent callback; refuse rather than retry.
        return googleFail(res, 'google_account_linked_elsewhere');
      }
      user = linked;
    }

    // Exactly the gate password login applies, on exactly the same source of
    // truth (the row).
    if (user.is_active === false || user.is_active === null) {
      return googleFail(res, 'google_account_inactive');
    }

    delete user.password;

    const token = generateToken(user.id, user.role);

    console.log(`[google-auth] user ${user.id} signed in (${user.role})`);

    // Only the token is carried back; the frontend fetches /auth/profile so
    // the user object has one source of truth instead of two.
    return res.redirect(googleResultUrl({ token }));
  } catch (error) {
    next(error);
  }
};

// Get current user profile
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    let profileUser = user;
    if (user.role === 'trainer') {
      const trainerInfo = await Trainer.getTrainerWithUser(req.userId);
      profileUser = { ...user, ...(trainerInfo || {}) };
    }

    res.json({ success: true, data: { user: profileUser } });
  } catch (error) {
    next(error);
  }
};

// Update user profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { full_name, phone, department_id, specialization, qualification, biography } = req.body;
    const profile_image = req.file ? req.file.filename : null;

    const currentUser = await User.findById(req.userId);
    if (!currentUser) {
      throw new ApiError(404, 'User not found');
    }

    const updateData = { full_name, phone };
    if (profile_image) {
      updateData.profile_image = profile_image;
    }

    if (department_id !== undefined) {
      const requestedDept = department_id === '' || department_id === null ? null : Number(department_id);

      // Department is locked once chosen; only an admin can change it
      if (currentUser.department_locked && requestedDept !== Number(currentUser.department_id)) {
        throw new ApiError(400, 'Your department is locked. Please contact the administrator to change it.');
      }

      updateData.department_id = requestedDept;

      // First selection of a department locks it
      if (!currentUser.department_locked && requestedDept !== null) {
        updateData.department_locked = true;
      }
    }

    const updatedUser = await User.update(req.userId, updateData);
    if (!updatedUser) {
      throw new ApiError(404, 'User not found');
    }

    // Remove the previous profile picture from disk when a new one is uploaded
    if (profile_image && currentUser.profile_image && currentUser.profile_image !== profile_image) {
      try {
        const oldFilePath = path.join(__dirname, '..', '..', 'uploads', 'profiles', currentUser.profile_image);
        fs.unlink(oldFilePath, () => {});
      } catch (err) {
        // Ignore cleanup errors; the new image is already saved
      }
    }

    // Update the extended trainer profile when the user is a trainer
    if (currentUser.role === 'trainer') {
      const trainerProfile = await Trainer.findByUserId(req.userId);
      if (trainerProfile) {
        await Trainer.update(req.userId, {
          department_id: updateData.department_id !== undefined ? updateData.department_id : trainerProfile.department_id,
          specialization: specialization !== undefined ? specialization : trainerProfile.specialization,
          qualification: qualification !== undefined ? qualification : trainerProfile.qualification,
          biography: biography !== undefined ? biography : trainerProfile.biography
        });
      }
    }

    const refreshedUser = await User.findById(req.userId);
    let trainerInfo = null;
    if (currentUser.role === 'trainer') {
      trainerInfo = await Trainer.getTrainerWithUser(req.userId);
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: { ...refreshedUser, ...(trainerInfo || {}) } }
    });
  } catch (error) {
    next(error);
  }
};

// Change password for the authenticated user
exports.changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;

    const user = await User.findByEmail(req.user.email);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const isPasswordValid = await User.comparePassword(current_password, user.password);
    if (!isPasswordValid) {
      throw new ApiError(400, 'Current password is incorrect');
    }

    const updated = await User.updatePassword(req.userId, new_password);
    if (!updated) {
      throw new ApiError(404, 'User not found');
    }

    // Any reset link emailed before this change must stop working, otherwise a
    // leaked old link could still reset the freshly chosen password.
    await PasswordResetToken.invalidateAllForUser(req.userId);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Logout (client clears token)
exports.logout = async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
};

// ------------------------------------------------------------------
// Shared issuance for both entry points (first request and resend).
//
// Issues a link token AND a 6-digit code, then emails both, so the user can
// take whichever route suits them. Issuing both here - rather than bolting the
// OTP on afterwards - is also what makes "resend" invalidate the previous
// code: a resend is simply another issuance.
//
// Never throws and never returns anything account-revealing: the caller
// reports the same response either way.
// ------------------------------------------------------------------
const issueResetCredentials = async (user, lang) => {
  const { rawToken } = await PasswordResetToken.issue(user.id, PASSWORD_RESET_EXPIRY_MINUTES);
  const { otp } = await PasswordResetOtp.issue(user.id);

  // Housekeeping. Best effort; never affects the response.
  PasswordResetToken.purgeExpired()
    .catch((err) => console.error('Token purge error:', err.message));
  PasswordResetOtp.purge()
    .catch((err) => console.error('OTP purge error:', err.message));

  // `to` is always the address that came back from the database for this
  // lookup, never a configured or hard-coded mailbox.
  const delivery = await emailService.sendPasswordResetEmail({
    to: user.email,
    fullName: User.resolveFullName(user),
    resetUrl: passwordResetUrl(rawToken),
    lang,
    expiryMinutes: PASSWORD_RESET_EXPIRY_MINUTES,
    otp,
    otpExpiryMinutes: PasswordResetOtp.EXPIRY_MINUTES
  });

  if (!delivery.delivered) {
    // Credentials exist and the user was told to check their inbox, so a
    // silent failure here is the exact case that looks like "the feature is
    // broken". Log it where the operator will actually see it. The code itself
    // is never logged - only the outcome.
    console.warn(
      `[forgot-password] user ${user.id} (${user.email}): reset mail NOT delivered` +
      ` [${delivery.reason}${delivery.responseCode ? ' ' + delivery.responseCode : ''}]`
    );
  } else {
    console.log(`[forgot-password] user ${user.id} (${user.email}): reset mail delivered`);
  }

  return delivery;
};

// ------------------------------------------------------------------
// Forgot Password
//
// Requests a reset link and a one-time code for an email address.
// Intentionally reveals nothing about whether the address is registered:
// always HTTP 200, always the same message, and roughly constant time (the
// dummy lookup below keeps the unknown-address path as slow as the real one).
// ------------------------------------------------------------------
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email, lang = 'en' } = req.body;
    const user = await User.findByEmail(email);

    // Tracked for the server log and the opt-in verbose payload only. Never
    // put this in the default response: that is what would leak which addresses
    // are registered.
    let delivery = { delivered: false, reason: 'no_account' };

    if (user && user.is_active !== false && user.is_active !== null) {
      delivery = await issueResetCredentials(user, lang);
    } else {
      // Equalise timing so the response does not disclose account existence.
      await Promise.all([
        PasswordResetToken.findUsable(DUMMY_RESET_HASH),
        PasswordResetOtp.findCurrent(-1)
      ]);
    }

    const payload = { success: true, message: FORGOT_PASSWORD_RESPONSE };

    // Opt-in diagnostics. Deliberately omits the token and the code: both are
    // bearer credentials and must not travel back over HTTP.
    if (PASSWORD_RESET_VERBOSE) {
      payload.debug = {
        accountFound: delivery.reason !== 'no_account',
        delivered: delivery.delivered,
        reason: delivery.reason,
        responseCode: delivery.responseCode || null
      };
    }

    res.json(payload);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------------------------------
// Resend OTP
//
// Identical to a first request: a fresh code is minted, which burns the
// previous one, and a fresh link is issued alongside it. The response is the
// same generic one so this cannot be used to probe for accounts either.
// ------------------------------------------------------------------
exports.resendPasswordOtp = async (req, res, next) => {
  try {
    const { email, lang = 'en' } = req.body;
    const user = await User.findByEmail(email);

    let delivery = { delivered: false, reason: 'no_account' };

    if (user && user.is_active !== false && user.is_active !== null) {
      delivery = await issueResetCredentials(user, lang);
    } else {
      await Promise.all([
        PasswordResetToken.findUsable(DUMMY_RESET_HASH),
        PasswordResetOtp.findCurrent(-1)
      ]);
    }

    const payload = { success: true, message: FORGOT_PASSWORD_RESPONSE };

    if (PASSWORD_RESET_VERBOSE) {
      payload.debug = {
        accountFound: delivery.reason !== 'no_account',
        delivered: delivery.delivered,
        reason: delivery.reason,
        responseCode: delivery.responseCode || null
      };
    }

    res.json(payload);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------------------------------
// Verify OTP
//
// On success the code is burned and a short-lived link token is minted, so the
// existing Reset Password page needs no changes at all - the OTP step simply
// hands off to the flow that was already there.
//
// Failure reasons are deliberately narrowed. "Wrong code" and "no such
// account" return the identical message, otherwise this endpoint would reveal
// which addresses are registered. "Locked" and "expired" are only reachable
// once a correct email has a live row, so they reveal nothing new, and the
// user needs them to know to request a new code.
// ------------------------------------------------------------------
exports.verifyPasswordOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const INVALID = 'This verification code is incorrect or has expired. Please request a new one.';
    const user = await User.findByEmail(email);

    // Unknown address: identical to a wrong code, and still does a comparable
    // amount of work so timing does not give it away either.
    if (!user || user.is_active === false || user.is_active === null) {
      await PasswordResetOtp.findAnyForUser(-1, otp);
      throw new ApiError(400, INVALID);
    }

    const claimed = await PasswordResetOtp.consume(user.id, otp);

    if (!claimed) {
      // Work out which failure this is, so the user is told whether to retype
      // or to request a new code.
      const any = await PasswordResetOtp.findAnyForUser(user.id, otp);

      // "Already used" and "expired" are safe to distinguish: reaching either
      // one means the caller already submitted the correct code, so they knew
      // it. They reveal nothing about whether the account exists.
      if (any && any.used_at) {
        throw new ApiError(400, 'This verification code has already been used. Please request a new one.');
      }
      if (any && new Date(any.expires_at) <= new Date()) {
        throw new ApiError(400, 'This verification code has expired. Please request a new one.');
      }

      // Everything else - a wrong guess, or a code that is out of attempts -
      // collapses into the SAME message as an unknown address. Reporting "3
      // attempts remaining", or a distinct lockout error, would tell a caller
      // probing addresses that this one is a real account with a live code.
      // The real reason is logged for the operator instead.
      const failed = await PasswordResetOtp.registerFailedAttempt(user.id);
      if (failed) {
        const left = failed.max_attempts - failed.attempts;
        console.warn(
          `[forgot-password] user ${user.id} (${user.email}): wrong OTP, ${left} attempt(s) left`
        );
      } else {
        console.warn(
          `[forgot-password] user ${user.id} (${user.email}): wrong OTP, no attempts left or no live code`
        );
      }

      throw new ApiError(400, INVALID);
    }

    // Burn any link still outstanding, then mint a fresh one for the existing
    // reset page to consume.
    const { rawToken } = await PasswordResetToken.issue(user.id, PASSWORD_RESET_EXPIRY_MINUTES);
    await PasswordResetOtp.invalidateAllForUser(user.id);

    console.log(`[forgot-password] user ${user.id} (${user.email}): OTP verified`);

    res.json({
      success: true,
      verified: true,
      message: 'Verification successful. You can now set a new password.',
      resetToken: rawToken
    });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------------------------------
// Reset Password
//
// The token arrives as a query param because that is how the emailed link
// carries it. Only the SHA-256 hash is ever looked up, the row is consumed
// atomically (so a link is single-use even under concurrent submits), and the
// new password goes through the same bcrypt path as everywhere else.
// ------------------------------------------------------------------
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token) {
      throw new ApiError(400, 'Reset token is required');
    }

    const tokenHash = PasswordResetToken.hashToken(token);

    // Distinguish the failure reasons so the user gets an actionable message.
    // This leaks nothing about which accounts exist, only about this link.
    const existing = await PasswordResetToken.findAny(tokenHash);
    if (!existing) {
      throw new ApiError(400, 'This password reset link is invalid. Please request a new one.');
    }
    if (existing.used_at) {
      throw new ApiError(400, 'This password reset link has already been used. Please request a new one.');
    }
    if (new Date(existing.expires_at) <= new Date()) {
      throw new ApiError(400, 'This password reset link has expired. Please request a new one.');
    }

    // Atomically claim the token. Losing this race means it was consumed
    // between the checks above, which is still a single-use enforcement.
    const claimed = await PasswordResetToken.consume(tokenHash);
    if (!claimed) {
      throw new ApiError(400, 'This password reset link has already been used. Please request a new one.');
    }

    const updated = await User.updatePassword(claimed.user_id, password);
    if (!updated) {
      // The token is already burned, so the user must start again. This is
      // only reachable if the account was deleted mid-flow.
      throw new ApiError(404, 'User not found');
    }

    // A password change should never leave a live reset link behind.
    await PasswordResetToken.invalidateAllForUser(claimed.user_id);

    res.json({ success: true, message: 'Password has been reset successfully. You can now sign in.' });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------------------------------
// Validate a reset link before showing the new-password form, so the page
// can tell the user up front whether their link is still good.
// ------------------------------------------------------------------
exports.verifyResetToken = async (req, res, next) => {
  try {
    const token = req.query.token;

    if (!token) {
      return res.status(400).json({ success: false, valid: false, message: 'Reset token is required' });
    }

    const usable = await PasswordResetToken.findUsable(PasswordResetToken.hashToken(token));

    if (!usable) {
      const any = await PasswordResetToken.findAny(PasswordResetToken.hashToken(token));
      let message = 'This password reset link is invalid. Please request a new one.';
      if (any && any.used_at) {
        message = 'This password reset link has already been used. Please request a new one.';
      } else if (any) {
        message = 'This password reset link has expired. Please request a new one.';
      }
      return res.json({ success: true, valid: false, message });
    }

    res.json({ success: true, valid: true });
  } catch (error) {
    next(error);
  }
};
