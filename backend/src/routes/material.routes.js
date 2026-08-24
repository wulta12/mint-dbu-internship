const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const materialController = require('../controllers/material.controller');
const { auth, authorize } = require('../middleware/auth');

// Configure multer for training material uploads (PDF / documents)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/materials'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'material-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedExt = /pdf|doc|docx|ppt|pptx|xls|xlsx|txt|zip|mp4|jpg|jpeg|png/;
    const extOk = allowedExt.test(path.extname(file.originalname).toLowerCase());
    if (extOk) return cb(null, true);
    cb(new Error('Unsupported file type. Please upload PDF, Office documents, images or archives.'));
  }
});

// Trainer / Admin upload a material for a training
router.post('/trainings/:trainingId/materials', auth, authorize('admin', 'trainer'), upload.single('file'), materialController.upload);

// List materials for a training (enrolled trainees, trainers, admins)
router.get('/trainings/:trainingId/materials', auth, materialController.listByTraining);

// Delete a material (uploader or admin)
router.delete('/materials/:id', auth, authorize('admin', 'trainer'), materialController.remove);

module.exports = router;
