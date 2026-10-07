const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const authController = require('../controllers/auth.controller');
const { auth, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
  forgotPasswordValidation,
  resendOtpValidation,
  verifyOtpValidation,
  resetPasswordValidation
} = require('../validators/auth.validator');

// Configure multer for profile image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/profiles'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif/;
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowed.test(file.mimetype);
    if (extOk && mimeOk) return cb(null, true);
    cb(new Error('Only image files are allowed'));
  }
});

// Public routes
router.post('/register', registerValidation, validate, authController.register);
router.post('/login', loginValidation, validate, authController.login);

// Google sign-in. Public by necessity, because the user has no session yet.
//
// The safety here does not come from the route being protected: it comes from
// (a) the `state` cookie proving this callback answers a redirect this server
// started, (b) the id_token being verified against Google's keys, our client id
// and the token audience, (c) email_verified being required, and (d) the email
// matching an account that already exists, whose role and is_active are then
// re-checked. An attacker holding their own Google account can therefore sign
// in as themselves and nothing else.
//
// These are GETs because Google redirects the browser with a top-level GET.
router.get('/google/status', authController.googleStatus);
router.get('/google', authController.googleStart);
router.get('/google/callback', authController.googleCallback);

// Forgot / reset password. Public by necessity, but constrained: the reset
// token is a single-use, expiring, hashed credential, and forgotPassword never
// discloses whether an address is registered.
//
// The OTP pair is the code-based route into the same flow. verify-otp returns a
// freshly minted token, so resetPassword below stays exactly as it was.
router.post('/forgot-password', forgotPasswordValidation, validate, authController.forgotPassword);
router.post('/forgot-password/resend-otp', resendOtpValidation, validate, authController.resendPasswordOtp);
router.post('/forgot-password/verify-otp', verifyOtpValidation, validate, authController.verifyPasswordOtp);
router.get('/reset-password/verify', authController.verifyResetToken);
router.post('/reset-password', resetPasswordValidation, validate, authController.resetPassword);

// Authenticated routes
router.get('/profile', auth, authController.getProfile);
router.put('/profile', auth, upload.single('profile_image'), updateProfileValidation, validate, authController.updateProfile);
router.put('/password', auth, changePasswordValidation, validate, authController.changePassword);
router.post('/logout', auth, authController.logout);

// Admin creates a trainer account
router.post('/register/trainer', auth, authorize('admin'), registerValidation, validate, authController.register);

module.exports = router;
