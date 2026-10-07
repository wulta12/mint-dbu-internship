const LearningContent = require('../models/LearningContent.model');
const Training = require('../models/Training.model');
const TrainingRequest = require('../models/TrainingRequest.model');
const { ApiError } = require('../middleware/error');
const { refuseAssessmentRequest, generateReply, REFUSAL_MESSAGE } = require('../services/assistantEngine');
const { buildRetrievalContext, MAX_CONTEXT_CHARS } = require('../services/retrievalService');

async function ensureEnrolled(trainingId, traineeId) {
  const enrolled = await TrainingRequest.isEnrolled(trainingId, traineeId);
  if (!enrolled) {
    throw new ApiError(403, 'You must be enrolled in this training to use the AI Training Assistant');
  }
}

// POST /api/assistant/chat
//
// Retrieval-based: only PUBLISHED lessons of a training the trainee is
// enrolled in are considered, they are ranked by relevance to the question,
// and the combined passages are capped at MAX_CONTEXT_CHARS in total.
// Assessment questions and answers are never read here.
exports.chat = async (req, res, next) => {
  try {
    const trainingId = req.body.trainingId;
    const lessonId = req.body.lessonId || null;
    const message = String(req.body.message || '').trim();

    const training = await Training.findById(trainingId);
    if (!training) {
      throw new ApiError(404, 'Training not found');
    }
    await ensureEnrolled(trainingId, req.user.id);

    // Assessment security: refuse answer/solution requests before doing
    // anything else, so no retrieval work happens for them.
    if (refuseAssessmentRequest(message)) {
      return res.json({
        success: true,
        data: { message: REFUSAL_MESSAGE, refused: true }
      });
    }

    // Published lessons only - the trainee is enrolled (checked above), and
    // unpublished/draft material is filtered out by the model query.
    const lessons = await LearningContent.getPublishedLessonsByTraining(trainingId);

    let currentLesson = null;
    if (lessonId) {
      const found = lessons.find((l) => Number(l.id) === Number(lessonId));
      if (!found) {
        throw new ApiError(404, 'Lesson not found in this training');
      }
      currentLesson = found;
    }

    const context = buildRetrievalContext({
      training,
      currentLesson,
      lessons,
      message
    });

    const reply = generateReply(context, message);

    res.json({
      success: true,
      data: {
        message: reply,
        refused: false,
        // Transparency about what was searched and how much was used.
        context: {
          ...context.meta,
          max_context_chars: MAX_CONTEXT_CHARS
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
