const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificate.controller');
const { auth, authorize } = require('../middleware/auth');

// Public: verify a certificate by its verification code (used by QR code)
router.get('/verify/:code', certificateController.verify);

// Trainee: my certificates
router.get('/my', auth, authorize('trainee'), certificateController.getMy);

// Admin: all certificates
router.get('/', auth, authorize('admin'), certificateController.getAll);

// Admin / Trainer: certificates for a specific training
router.get('/training/:trainingId', auth, authorize('admin', 'trainer'), certificateController.getByTraining);

// Admin / Trainer: issue a certificate
router.post('/training/:trainingId', auth, authorize('admin', 'trainer'), certificateController.issue);

// Admin / Trainer / Trainee: download or view a certificate
router.get('/:id/download', auth, authorize('admin', 'trainer', 'trainee'), certificateController.download);

// Admin: revoke a certificate (revoked certificates verify as INVALID)
router.post('/:id/revoke', auth, authorize('admin'), certificateController.revoke);

module.exports = router;
