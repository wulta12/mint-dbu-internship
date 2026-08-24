const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const learningController = require('../controllers/learning.controller');
const { auth, authorize } = require('../middleware/auth');

// Uploads for lesson files (PDF / documents / videos)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/lessons'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'lesson-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedExt = /pdf|doc|docx|ppt|pptx|xls|xlsx|txt|mp4|webm|ogg|jpg|jpeg|png|zip/;
    const extOk = allowedExt.test(path.extname(file.originalname).toLowerCase());
    if (extOk) return cb(null, true);
    cb(new Error('Unsupported file type for lesson material'));
  }
});

// ---------------- Trainee learning ----------------
router.get('/trainings/:trainingId', auth, learningController.getCourse);
router.get('/lessons/:lessonId', auth, learningController.getLesson);
router.post('/lessons/:lessonId/complete', auth, authorize('trainee'), learningController.completeLesson);
router.put('/lessons/:lessonId/video-position', auth, authorize('trainee'), learningController.saveVideoPosition);

// ---------------- Trainer / Admin content management ----------------
router.get('/trainings/:trainingId/tree', auth, authorize('admin', 'trainer'), learningController.getCourseTree);

router.post('/trainings/:trainingId/modules', auth, authorize('admin', 'trainer'), learningController.createModule);
router.put('/trainings/:trainingId/modules/reorder', auth, authorize('admin', 'trainer'), learningController.reorderModules);
router.put('/modules/:id', auth, authorize('admin', 'trainer'), learningController.updateModule);
router.delete('/modules/:id', auth, authorize('admin', 'trainer'), learningController.deleteModule);

router.post('/trainings/:trainingId/lessons', auth, authorize('admin', 'trainer'), upload.single('file'), learningController.createLesson);
router.put('/trainings/:trainingId/lessons/reorder', auth, authorize('admin', 'trainer'), learningController.reorderLessons);
router.put('/lessons/:id', auth, authorize('admin', 'trainer'), upload.single('file'), learningController.updateLesson);
router.delete('/lessons/:id', auth, authorize('admin', 'trainer'), learningController.deleteLesson);

module.exports = router;
