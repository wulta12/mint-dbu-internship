const Certificate = require('../models/Certificate.model');
const Training = require('../models/Training.model');
const TrainingRequest = require('../models/TrainingRequest.model');
const QRCode = require('qrcode');
const { ApiError } = require('../middleware/error');

// Public: verify a certificate by verification code (also used by the QR code)
exports.verify = async (req, res, next) => {
  try {
    const code = String(req.params.code || '').toUpperCase();
    const certificate = await Certificate.findByVerificationCode(code);
    if (!certificate) {
      throw new ApiError(404, 'Certificate not found or verification code is invalid');
    }
    res.json({
      success: true,
      data: {
        verified: true,
        certificate: {
          certificate_number: certificate.certificate_number,
          verification_code: certificate.verification_code,
          trainee_name: certificate.trainee_name,
          trainee_email: certificate.trainee_email,
          training_title: certificate.training_title,
          department_name: certificate.department_name,
          issue_date: certificate.issue_date,
          start_date: certificate.start_date,
          end_date: certificate.end_date
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
    const certificates = await Certificate.findByTraining(req.params.trainingId);
    res.json({ success: true, data: { certificates } });
  } catch (error) {
    next(error);
  }
};

// Admin / Trainer: issue a certificate to an eligible (approved/completed) trainee
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

    const enrolled = await TrainingRequest.isEnrolled(trainingId, traineeId);
    if (!enrolled) {
      throw new ApiError(400, 'Trainee is not an enrolled participant of this training');
    }

    const existing = await Certificate.findByTraining(trainingId);
    if (existing.some((c) => c.trainee_id === Number(traineeId))) {
      throw new ApiError(400, 'A certificate has already been issued to this trainee');
    }

    const certificate = await Certificate.create(trainingId, traineeId, req.user.id);

    const request = await TrainingRequest.findEnrolled(trainingId, traineeId);
    if (request && request.status === 'approved') {
      await TrainingRequest.markCompleted(request.id);
    }

    res.status(201).json({
      success: true,
      message: 'Certificate issued successfully',
      data: { certificate }
    });
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

    const date = new Date(certificate.issue_date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const verifyBase = `${req.protocol}://${req.get('host')}/api/certificates/verify/${encodeURIComponent(certificate.verification_code || certificate.certificate_number)}`;
    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(verifyBase, { width: 180, margin: 1, color: { dark: '#0b3d2e', light: '#ffffff' } });
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
  .info { margin-top: 26px; font-size: 13px; color: #6b7280; line-height: 1.9; }
  .org { margin-top: 34px; font-size: 14px; color: #0b3d2e; font-weight: bold; letter-spacing: 1px; }
  .sigline { margin-top: 40px; color: #9ca3af; font-size: 18px; letter-spacing: 2px; }
  .siglabel { font-size: 13px; color: #374151; margin-top: 4px; }
  .qrwrap { margin-top: 30px; display: flex; justify-content: center; align-items: center; gap: 16px;
    border-top: 1px solid #e5e7eb; padding-top: 20px; }
  .qrwrap img { width: 100px; height: 100px; }
  .qrtext { text-align: left; font-size: 12px; color: #6b7280; max-width: 380px; }
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
    <div class="org">Ministry of Innovation and Technology</div>
    <div class="sigline">________________________</div>
    <div class="siglabel">Authorized Signature</div>
    ${qrDataUrl ? `<div class="qrwrap"><img src="${qrDataUrl}" alt="QR code" /><div class="qrtext">Scan to verify this certificate. You can also verify it online at:<br />${escapeHtml(verifyBase)}</div></div>` : ''}
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
