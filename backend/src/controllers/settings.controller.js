const SystemSetting = require('../models/SystemSetting.model');
const { ApiError } = require('../middleware/error');

const ALLOWED_KEYS = new Set(['trainer_ai_enabled']);

// Any authenticated user can read the toggle so the frontend can show or
// hide the trainer AI controls. Writes are admin-only, enforced in the route.
exports.get = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        settings: await SystemSetting.getAllMap(),
        // Convenience flag for the most-used setting, resolved to a real
        // boolean. Defaults to true when the row is missing so a fresh
        // database still allows trainers to draft content.
        trainer_ai_enabled: await SystemSetting.isTrainerAiEnabled()
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const payload = req.body && req.body.settings ? req.body.settings : req.body;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new ApiError(400, 'Expected an object of settings to update');
    }

    const keys = Object.keys(payload);
    for (const key of keys) {
      if (!ALLOWED_KEYS.has(key)) {
        throw new ApiError(400, `Unknown setting: ${key}`);
      }
    }

    const updated = {};
    for (const key of keys) {
      // Persist a canonical string so the column never mixes 'true', 1 and TRUE.
      await SystemSetting.set(key, payload[key] ? 'true' : 'false', req.user.id);
      updated[key] = payload[key] ? 'true' : 'false';
    }

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: {
        settings: { ...(await SystemSetting.getAllMap()), ...updated },
        trainer_ai_enabled: await SystemSetting.isTrainerAiEnabled()
      }
    });
  } catch (error) {
    next(error);
  }
};
