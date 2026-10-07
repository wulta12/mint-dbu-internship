const Training = require('../models/Training.model');
const SystemSetting = require('../models/SystemSetting.model');
const { generateDraft } = require('../services/trainerAssistant.service');
const { ApiError } = require('../middleware/error');

const SETTING_KEY = 'trainer_ai_enabled';
const DISABLED_MESSAGE = 'The Trainer AI Assistant is currently disabled by the administrator.';

// Trainers may only use the assistant on trainings assigned to them.
async function ensureCanManage(trainingId, user) {
  const training = await Training.findById(trainingId);
  if (!training) {
    throw new ApiError(404, 'Training not found');
  }
  if (user.role === 'trainer' && Number(training.trainer_id) !== Number(user.id)) {
    throw new ApiError(403, 'You can only use the AI assistant for trainings assigned to you');
  }
  return training;
}

// GET /api/assistant/trainer/status
// Lets the frontend show or hide the trainer AI controls.
exports.status = async (req, res, next) => {
  try {
    const enabled = await SystemSetting.isTrainerAiEnabled();
    res.json({ success: true, data: { enabled, setting: SETTING_KEY } });
  } catch (error) {
    next(error);
  }
};

// POST /api/assistant/trainer/generate
// The admin ON/OFF switch is enforced HERE, on the server, so turning the
// feature off actually removes the capability rather than just hiding a button.
exports.generate = async (req, res, next) => {
  try {
    const enabled = await SystemSetting.isTrainerAiEnabled();
    if (!enabled) {
      throw new ApiError(403, DISABLED_MESSAGE);
    }

    const trainingId = req.body.trainingId;
    const training = await ensureCanManage(trainingId, req.user);

    if (!req.body.topic || !String(req.body.topic).trim()) {
      throw new ApiError(400, 'A topic is required so the assistant knows what to draft');
    }

    const result = await generateDraft({
      trainingId: training.id,
      contentType: req.body.contentType,
      topic: req.body.topic,
      questionCount: req.body.questionCount
    });

    res.json({
      success: true,
      message: 'Draft generated. Review it and edit before saving.',
      data: {
        ...result,
        training: { id: training.id, training_title: training.training_title }
      }
    });
  } catch (error) {
    next(error);
  }
};
