const Certificate = require('../models/Certificate.model');
const Training = require('../models/Training.model');
const TrainingRequest = require('../models/TrainingRequest.model');
const LearningContent = require('../models/LearningContent.model');
const Assessment = require('../models/Assessment.model');
const Notification = require('../models/Notification.model');
const QRCode = require('qrcode');
const { ApiError } = require('../middleware/error');
const { certificateVerifyUrl } = require('../config/app.config');

const MIN_PROGRESS_FOR_CERTIFICATE = 75;

// ------------------------------------------------------------------
// Public verification. No authentication, and no private data:
// the trainee's email is deliberately NOT part of the public payload.
// Accepts the certificate number (what the QR encodes) or the
// verification code printed on the certificate.
// ------------------------------------------------------------------
exports.verify = async (req, res, next) => {
  try {
    const reference = String(req.params.code || '').trim();
    if (!reference) {
      throw new ApiError(400, 'A certificate number or verification code is required');
    }

    const certificate = await Certificate.findByReference(reference);

    if (!certificate) {
      // Unknown reference: 404 so the page can render an explicit
      // "not found" state.
      throw new ApiError(404, 'No certificate matches that number or code.');
    }

    const isValid = certificate.status === 'valid' || certificate.status === null || certificate.status === undefined;

    res.json({
      success: true,
      data: {
        // The page shows VALID / INVALID from this single flag.
        verified: isValid,
        status: isValid ? 'valid' : certificate.status,
        message: isValid
          ? 'This certificate is valid and was issued by the Ministry of Innovation and Technology.'
          : certificate.status === 'revoked'
            ? 'This certificate has been revoked and is no longer valid.'
            : 'This certificate is not valid.',
        certificate: {
          certificate_number: certificate.certificate_number,
          verification_code: certificate.verification_code,
          trainee_name: certificate.trainee_name,
          training_title: certificate.training_title,
          training_type: certificate.training_type,
          trainer_name: certificate.trainer_name,
          department_name: certificate.department_name,
          issue_date: certificate.issue_date,
          start_date: certificate.start_date,
          end_date: certificate.end_date,
          revoked_at: certificate.revoked_at,
          revoked_reason: certificate.revoked_reason
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Trainee: their own certificates
exports.getMy = async (req, res, next) => {
  try {
    const certificates = await Certificate.getByTrainee(req.user.id);
    res.json({ success: true, data: { certificates } });
  } catch (error) {
    next(error);
  }
};

// Admin: all certificates
exports.getAll = async (req, res, next) => {
  try {
    const certificates = await Certificate.getAll();
    res.json({ success: true, data: { certificates } });
  } catch (error) {
    next(error);
  }
};

// Admin / Trainer: certificates issued for a specific training
exports.getByTraining = async (req, res, next) => {
  try {
    const training = await Training.findById(req.params.trainingId);
    if (!training) {
      throw new ApiError(404, 'Training not found');
    }
    if (req.user.role === 'trainer' && Number(training.trainer_id) !== Number(req.user.id)) {
      throw new ApiError(403, 'You can only view certificates for trainings assigned to you');
    }
    const certificates = await Certificate.findByTraining(req.params.trainingId);
    res.json({ success: true, data: { certificates } });
  } catch (error) {
    next(error);
  }
};

// Admin / Trainer: issue a certificate to an eligible trainee.
//
// The name printed on the certificate always comes from the trainee's
// user record (first_name + last_name), never from the request body.
exports.issue = async (req, res, next) => {
  try {
    const trainingId = req.params.trainingId;
    const traineeId = req.body.trainee_id;

    if (!traineeId) {
      throw new ApiError(400, 'Trainee is required');
    }

    const training = await Training.findById(trainingId);
    if (!training) {
      throw new ApiError(404, 'Training not found');
    }

    if (req.user.role === 'trainer' && Number(training.trainer_id) !== Number(req.user.id)) {
      throw new ApiError(403, 'You can only issue certificates for trainings assigned to you');
    }

    const enrolled = await TrainingRequest.isEnrolled(trainingId, traineeId);
    if (!enrolled) {
      throw new ApiError(400, 'Trainee is not an enrolled participant of this training');
    }

    const existing = await Certificate.getForTrainee(trainingId, traineeId);
    if (existing) {
      throw new ApiError(400, 'A certificate has already been issued to this trainee');
    }

    // Requirements are checked server-side. A certificate is only issued
    // once the trainee has passed the assessment AND completed at least
    // 75% of the training content.
    const progress = await LearningContent.getTrainingProgress(trainingId, traineeId);
    if (progress.percent < MIN_PROGRESS_FOR_CERTIFICATE) {
      throw new ApiError(
        400,
        `Trainee has completed ${progress.percent}% of the training. At least ${MIN_PROGRESS_FOR_CERTIFICATE}% is required to issue a certificate.`
      );
    }

    const passed = await Assessment.hasPassed(trainingId, traineeId);
    if (!passed) {
      throw new ApiError(400, 'Trainee has not passed the final assessment yet');
    }

    const certificate = await Certificate.create(trainingId, traineeId, req.user.id);

    // Keep the enrollment in step with the certificate: 'approved' ->
    // 'completed'. This is the only place the trainee dashboard reads, so
    // skipping it made "Certificates" and "Completed" disagree.
    await TrainingRequest.markCompletedForTrainee(trainingId, traineeId);

    // Best effort: the certificate is already issued either way.
    Notification.notifyUser(traineeId, {
      type: 'certificate_issued',
      title: 'Certificate issued',
      message: `Your certificate for "${training.training_title}" is ready.`,
      link: '/trainee/certificates'
    }).catch((err) => console.error('Notification error:', err.message));

    res.status(201).json({
      success: true,
      message: 'Certificate issued successfully',
      data: { certificate }
    });
  } catch (error) {
    next(error);
  }
};

// Admin: revoke a certificate. Revoked certificates report as INVALID
// on the public verification page.
exports.revoke = async (req, res, next) => {
  try {
    const certificate = await Certificate.findById(req.params.id);
    if (!certificate) {
      throw new ApiError(404, 'Certificate not found');
    }
    const revoked = await Certificate.revoke(certificate.id, req.body.reason, req.user.id);
    if (!revoked) {
      throw new ApiError(400, 'This certificate has already been revoked');
    }

    // Best effort: the revocation itself has already been committed.
    Notification.notifyUser(certificate.trainee_id, {
      type: 'certificate_revoked',
      title: 'Certificate revoked',
      message: req.body.reason
        ? `Your certificate ${certificate.certificate_number} was revoked: ${req.body.reason}`
        : `Your certificate ${certificate.certificate_number} was revoked.`,
      link: '/trainee/certificates'
    }).catch((err) => console.error('Notification error:', err.message));

    res.json({ success: true, message: 'Certificate revoked successfully', data: { certificate: revoked } });
  } catch (error) {
    next(error);
  }
};

// Download / view a certificate (rendered as a printable HTML document with QR verification)
exports.download = async (req, res, next) => {
  try {
    const certificate = await Certificate.findById(req.params.id);
    if (!certificate) {
      throw new ApiError(404, 'Certificate not found');
    }

    // Trainees may only view their own certificates
    if (req.user.role === 'trainee' && Number(certificate.trainee_id) !== Number(req.user.id)) {
      throw new ApiError(403, 'You do not have permission to view this certificate');
    }

    const date = formatDate(certificate.issue_date);
    const isRevoked = certificate.status && certificate.status !== 'valid';

    // The QR encodes ONLY the public verification URL for the certificate
    // number. No API endpoint, no personal data.
    const verifyUrl = certificateVerifyUrl(certificate.certificate_number);
    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 180, margin: 1, color: { dark: '#0b3d2e', light: '#ffffff' } });
    } catch (qrErr) {
      // QR generation is optional; continue without it
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Certificate - ${escapeHtml(certificate.trainee_name)}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; background: #f0f4f1; margin: 0; padding: 40px; }
  .certificate { max-width: 820px; margin: auto; background: #ffffff; border: 12px double #b8860b;
    padding: 48px 56px; text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
  .mint { font-size: 13px; letter-spacing: 3px; color: #0b3d2e; font-weight: bold; margin-bottom: 4px; }
  .subtitle { font-size: 13px; color: #6b7280; letter-spacing: 1px; }
  .title { font-size: 36px; color: #0b3d2e; font-weight: bold; margin: 28px 0 10px; letter-spacing: 4px; }
  .presented { font-size: 15px; color: #374151; margin-top: 8px; font-style: italic; }
  .name { font-size: 38px; color: #0b3d2e; font-weight: bold; margin: 14px 0; border-bottom: 2px solid #b8860b;
    display: inline-block; padding: 0 24px 8px; text-transform: uppercase; }
  .body { font-size: 15px; color: #374151; line-height: 1.7; margin: 6px 0; }
  .program { font-size: 22px; color: #0b3d2e; font-weight: bold; margin: 8px 0; }
  .trainer { font-size: 14px; color: #374151; margin-top: 14px; }
  .info { margin-top: 26px; font-size: 13px; color: #374151; line-height: 1.9; }
  .org { margin-top: 34px; font-size: 14px; color: #0b3d2e; font-weight: bold; letter-spacing: 1px; }
  .sigline { margin-top: 40px; color: #9ca3af; font-size: 18px; letter-spacing: 2px; }
  .siglabel { font-size: 13px; color: #374151; margin-top: 4px; }
  .qrwrap { margin-top: 30px; display: flex; justify-content: center; align-items: center; gap: 16px;
    border-top: 1px solid #e5e7eb; padding-top: 20px; }
  .qrwrap img { width: 100px; height: 100px; }
  .qrtext { text-align: left; font-size: 12px; color: #374151; max-width: 380px; word-break: break-all; }
  .revoked { display: inline-block; margin-top: 18px; padding: 8px 20px; border: 2px solid #b91c1c;
    color: #b91c1c; font-weight: bold; letter-spacing: 2px; }
  @media print { body { padding: 0; background: #fff; } .certificate { box-shadow: none; border-width: 10px; } }
</style>
</head>
<body>
  <div class="certificate">
    <div class="mint">MINISTRY OF INNOVATION AND TECHNOLOGY</div>
    <div class="subtitle">MinT Training Management System</div>
    <div class="title">CERTIFICATE OF COMPLETION</div>
    <div class="presented">This certificate is proudly presented to</div>
    <div class="name">${escapeHtml(certificate.trainee_name)}</div>
    <div class="body">for successfully completing the training program</div>
    <div class="program">${escapeHtml(certificate.training_title)}</div>
    <div class="body">conducted from ${escapeHtml(formatDate(certificate.start_date))} to ${escapeHtml(formatDate(certificate.end_date))}</div>
    <div class="trainer">Trainer: ${escapeHtml(certificate.trainer_name || '—')}</div>
    <div class="info">
      <div>Certificate Number: ${escapeHtml(certificate.certificate_number)}</div>
      <div>Verification Code: ${escapeHtml(certificate.verification_code || certificate.certificate_number)}</div>
      <div>Issued on: ${escapeHtml(date)}</div>
    </div>
    ${isRevoked ? `<div class="revoked">REVOKED</div>` : ''}
    <div class="org">Ministry of Innovation and Technology</div>
    <div class="sigline">________________________</div>
    <div class="siglabel">Authorized Signature</div>
    ${qrDataUrl ? `<div class="qrwrap"><img src="${qrDataUrl}" alt="QR code" /><div class="qrtext">Scan to verify this certificate online:<br />${escapeHtml(verifyUrl)}</div></div>` : ''}
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="certificate-${certificate.certificate_number}.html"`
    );
    res.send(html);
  } catch (error) {
    next(error);
  }
};

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
