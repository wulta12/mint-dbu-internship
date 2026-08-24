const fs = require('fs');
const path = require('path');
const TrainingMaterial = require('../models/TrainingMaterial.model');
const Training = require('../models/Training.model');
const { ApiError } = require('../middleware/error');

const MATERIALS_DIR = path.join(__dirname, '..', '..', 'uploads', 'materials');

// Ensure upload directory exists
if (!fs.existsSync(MATERIALS_DIR)) {
  fs.mkdirSync(MATERIALS_DIR, { recursive: true });
}

// Trainer / Admin: upload a material (PDF / documents) for a training
exports.upload = async (req, res, next) => {
  try {
    const trainingId = req.params.trainingId;
    const training = await Training.findById(trainingId);
    if (!training) {
      throw new ApiError(404, 'Training not found');
    }

    if (req.user.role === 'trainer' && Number(training.trainer_id) !== Number(req.user.id)) {
      throw new ApiError(403, 'You can only upload materials to trainings assigned to you');
    }

    if (!req.file) {
      throw new ApiError(400, 'No file uploaded');
    }

    const material = await TrainingMaterial.create({
      training_id: trainingId,
      uploaded_by: req.user.id,
      file_name: req.file.originalname,
      file_path: req.file.filename,
      file_type: req.file.mimetype,
      file_size: req.file.size
    });

    res.status(201).json({
      success: true,
      message: 'Material uploaded successfully',
      data: { material }
    });
  } catch (error) {
    next(error);
  }
};

// List materials for a training.
// Access: admin/trainer always; trainee only if enrolled in the training.
exports.listByTraining = async (req, res, next) => {
  try {
    const trainingId = req.params.trainingId;
    const training = await Training.findById(trainingId);
    if (!training) {
      throw new ApiError(404, 'Training not found');
    }

    if (req.user.role === 'trainee') {
      const isEnrolled = await require('../models/TrainingRequest.model').isEnrolled(trainingId, req.user.id);
      if (!isEnrolled) {
        throw new ApiError(403, 'You must be enrolled in this training to view its materials');
      }
    }

    const materials = await TrainingMaterial.getByTraining(trainingId);
    res.json({ success: true, data: { materials } });
  } catch (error) {
    next(error);
  }
};

// Delete a material (trainer who uploaded it, or any admin)
exports.remove = async (req, res, next) => {
  try {
    const material = await TrainingMaterial.findById(req.params.id);
    if (!material) {
      throw new ApiError(404, 'Material not found');
    }

    if (req.user.role !== 'admin' && material.uploaded_by !== req.user.id) {
      throw new ApiError(403, 'You do not have permission to delete this material');
    }

    const filePath = path.join(MATERIALS_DIR, material.file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await TrainingMaterial.delete(material.id);
    res.json({ success: true, message: 'Material deleted successfully' });
  } catch (error) {
    next(error);
  }
};
