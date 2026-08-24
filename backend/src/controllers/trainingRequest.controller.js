const TrainingRequest = require('../models/TrainingRequest.model');
const Training = require('../models/Training.model');
const { ApiError } = require('../middleware/error');

// Trainee requests enrollment for a training (status = pending).
// The trainee's department is derived from the authenticated user.
exports.requestForTraining = async (req, res, next) => {
  try {
    const trainingId = req.params.trainingId;
    const trainee = req.user;

    if (!trainee.department_id) {
      throw new ApiError(400, 'Please select your department in your profile first');
    }

    const training = await Training.findById(trainingId);
    if (!training) {
      throw new ApiError(404, 'Training not found');
    }

    if (training.status !== 'open') {
      throw new ApiError(400, 'Training is not open for registration');
    }

    // Department security: the training's subject must belong to the trainee's
    // department, UNLESS the training is open to all departments.
    if (!training.is_all_departments && training.department_id !== trainee.department_id) {
      throw new ApiError(403, 'This training is not assigned to your department');
    }

    // Duplicate request prevention: only one active request per trainee per training.
    const hasActive = await TrainingRequest.hasActiveRequest(trainingId, trainee.id);
    if (hasActive) {
      throw new ApiError(400, 'You already have an active request for this training');
    }

    // Capacity check against actively enrolled trainees.
    const enrolledCount = await TrainingRequest.getEnrolledCount(trainingId);
    if (enrolledCount >= training.capacity) {
      throw new ApiError(400, 'Training is full');
    }

    const request = await TrainingRequest.request(trainingId, trainee.id);
    res.status(201).json({
      success: true,
      message: 'Enrollment request submitted. Waiting for admin approval.',
      data: { request }
    });
  } catch (error) {
    next(error);
  }
};

// Trainee: all of their requests with training details
exports.getMy = async (req, res, next) => {
  try {
    const requests = await TrainingRequest.getByTrainee(req.user.id);
    res.json({ success: true, data: { requests } });
  } catch (error) {
    next(error);
  }
};

// Admin: request queue with filters (status, department, training, search)
exports.getAll = async (req, res, next) => {
  try {
    const { status, department_id, training_id, search } = req.query;
    const requests = await TrainingRequest.getAll({
      status,
      department_id,
      training_id,
      search
    });
    res.json({ success: true, data: { requests } });
  } catch (error) {
    next(error);
  }
};

// Admin or the requesting trainee can view a single request
exports.getById = async (req, res, next) => {
  try {
    const request = await TrainingRequest.findById(req.params.id);
    if (!request) {
      throw new ApiError(404, 'Request not found');
    }

    if (req.user.role !== 'admin' && request.trainee_id !== req.user.id) {
      throw new ApiError(403, 'You do not have permission to view this request');
    }

    res.json({ success: true, data: { request } });
  } catch (error) {
    next(error);
  }
};

// Admin approves a pending request -> trainee becomes officially enrolled.
exports.approve = async (req, res, next) => {
  try {
    const request = await TrainingRequest.findById(req.params.id);
    if (!request) {
      throw new ApiError(404, 'Request not found');
    }

    if (request.status === 'approved') {
      throw new ApiError(400, 'This request is already approved');
    }
    if (request.status === 'completed') {
      throw new ApiError(400, 'This request is already completed');
    }
    if (request.status === 'rejected') {
      // Allow approving a previously rejected request (re-approval).
    }

    const training = await Training.findById(request.training_id);
    if (training && training.status !== 'open') {
      throw new ApiError(400, 'Cannot approve: training is not open for registration');
    }

    const enrolledCount = await TrainingRequest.getEnrolledCount(request.training_id);
    if (training && enrolledCount >= training.capacity) {
      throw new ApiError(400, 'Training is full');
    }

    const updated = await TrainingRequest.approve(request.id, req.user.id);
    res.json({
      success: true,
      message: 'Enrollment approved. Trainee is now officially enrolled.',
      data: { request: updated }
    });
  } catch (error) {
    next(error);
  }
};

// Admin rejects a pending request (optionally with a reason).
exports.reject = async (req, res, next) => {
  try {
    const request = await TrainingRequest.findById(req.params.id);
    if (!request) {
      throw new ApiError(404, 'Request not found');
    }

    if (request.status === 'approved') {
      throw new ApiError(400, 'This request is already approved');
    }
    if (request.status === 'completed') {
      throw new ApiError(400, 'This request is already completed');
    }

    const updated = await TrainingRequest.reject(request.id, req.user.id, req.body.reason);
    res.json({
      success: true,
      message: 'Enrollment request rejected',
      data: { request: updated }
    });
  } catch (error) {
    next(error);
  }
};

// Admin / Trainer marks an approved participant as completed
exports.markCompleted = async (req, res, next) => {
  try {
    const request = await TrainingRequest.findById(req.params.id);
    if (!request) {
      throw new ApiError(404, 'Request not found');
    }
    if (request.status !== 'approved') {
      throw new ApiError(400, 'Only approved enrollments can be marked as completed');
    }

    const updated = await TrainingRequest.markCompleted(request.id);
    res.json({
      success: true,
      message: 'Enrollment marked as completed',
      data: { request: updated }
    });
  } catch (error) {
    next(error);
  }
};

// Participants for a training (admin, trainer)
exports.getByTraining = async (req, res, next) => {
  try {
    const requests = await TrainingRequest.getByTraining(req.params.trainingId);
    res.json({ success: true, data: { participants: requests } });
  } catch (error) {
    next(error);
  }
};
