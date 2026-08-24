const express = require('express');
const router = express.Router();
const assessmentController = require('../controllers/assessment.controller');
const { auth, authorize } = require('../middleware/auth');

// ---------------- Trainee ----------------
router.get('/trainings/:trainingId/status', auth, authorize('trainee'), assessmentController.getStatus);
router.post('/trainings/:trainingId/start', auth, authorize('trainee'), assessmentController.start);
router.post('/attempts/:attemptId/submit', auth, authorize('trainee'), assessmentController.submit);

// ---------------- Trainer / Admin ----------------
router.get('/trainings/:trainingId/manage', auth, authorize('admin', 'trainer'), assessmentController.get);
router.post('/trainings/:trainingId', auth, authorize('admin', 'trainer'), assessmentController.upsert);
router.delete('/:assessmentId', auth, authorize('admin', 'trainer'), assessmentController.remove);

router.post('/:assessmentId/questions', auth, authorize('admin', 'trainer'), assessmentController.addQuestion);
router.put('/:assessmentId/questions/reorder', auth, authorize('admin', 'trainer'), assessmentController.reorderQuestions);
router.put('/questions/:questionId', auth, authorize('admin', 'trainer'), assessmentController.updateQuestion);
router.delete('/questions/:questionId', auth, authorize('admin', 'trainer'), assessmentController.deleteQuestion);

module.exports = router;
