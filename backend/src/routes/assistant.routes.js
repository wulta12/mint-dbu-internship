const express = require('express');
const router = express.Router();
const assistantController = require('../controllers/assistant.controller');
const trainerAssistantController = require('../controllers/trainerAssistant.controller');
const { auth, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { chatValidation, trainerGenerationValidation } = require('../validators/assistant.validator');

// ---------------- Trainee ----------------
// Trainee AI Training Assistant (retrieval over published lessons only)
router.post('/chat', auth, authorize('trainee'), chatValidation, validate, assistantController.chat);

// ---------------- Trainer ----------------
// Separate Trainer AI Assistant. The admin ON/OFF switch is enforced in the
// controller, so a disabled setting removes the capability server-side.
router.get('/trainer/status', auth, authorize('trainer', 'admin'), trainerAssistantController.status);
router.post(
  '/trainer/generate',
  auth,
  authorize('trainer', 'admin'),
  trainerGenerationValidation,
  validate,
  trainerAssistantController.generate
);

module.exports = router;