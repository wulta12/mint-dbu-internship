// MinT AI Trainer Assistant — content drafting service.
//
// This is a SEPARATE engine from the trainee assistant. It helps trainers
// draft course structure and assessment items; it is never used to answer a
// trainee, and it never reads trainee attempt data or certificates.
//
// It is a self-contained, offline drafting helper: it produces editable
// STRUCTURED DRAFTS that the trainer reviews and saves. It does not publish
// anything on its own.

const LearningContent = require('../models/LearningContent.model');

const CONTENT_TYPES = new Set(['module', 'lesson', 'assessment']);

const LESSON_TYPES = [
  { type: 'text', label: 'Reading lesson' },
  { type: 'video', label: 'Video lesson' },
  { type: 'pdf', label: 'PDF lesson' },
  { type: 'document', label: 'Document lesson' }
];

const QUESTION_BLUEPRINTS = [
  { stem: 'Which of the following best describes {topic}?', answer: 'It is the recognised standard practice for {topic} in this context.', distractors: ['It is unrelated to {topic} and can be ignored', 'It applies only to external contractors', 'It was replaced and no longer applies'] },
  { stem: 'In {topic}, what is the first step a participant should take?', answer: 'Review the requirements and confirm they apply to their own situation.', distractors: ['Skip the requirements and start immediately', 'Wait for an external audit', 'Only consult a colleague after acting'] },
  { stem: 'Who is responsible for following the rules on {topic}?', answer: 'Every participant enrolled in the training is responsible for following them.', distractors: ['Only the trainer is responsible', 'Only the department head is responsible', 'Nobody, because the rules are advisory'] },
  { stem: 'Which statement about {topic} is correct?', answer: 'It should be applied consistently and any deviation must be justified.', distractors: ['It can be applied differently in each department without justification', 'It applies only after the final assessment', 'It is optional and rarely reviewed'] },
  { stem: 'What happens if a requirement on {topic} is missed?', answer: 'It must be corrected and reported through the proper channel.', distractors: ['Nothing happens at all', 'The certificate is issued automatically anyway', 'Only the trainee is affected, never the trainer'] },
  { stem: 'Why is {topic} important for this programme?', answer: 'It reduces risk and is a required part of the standard being taught.', distractors: ['It is important only for historical records', 'It has no effect on the organisation', 'It matters only for external visitors'] }
];

function normaliseTopic(topic) {
  const clean = String(topic || '').trim().replace(/\s+/g, ' ');
  if (!clean) return '';
  return clean.length > 120 ? `${clean.slice(0, 117)}...` : clean;
}

// Existing course vocabulary, so drafts match the training the trainer owns.
function courseKeywords(lessons) {
  const counts = new Map();
  for (const lesson of lessons || []) {
    const text = `${lesson.title || ''} ${lesson.content || ''}`.toLowerCase();
    for (const word of text.match(/[a-z][a-z-]{4,}/g) || []) {
      counts.set(word, (counts.get(word) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([word]) => word);
}

function moduleDraft(topic, keywords) {
  const related = keywords.filter((k) => !k.includes(topic.toLowerCase())).slice(0, 5);
  return {
    title: normaliseTopic(topic) || 'New module',
    description:
      `Covers ${normaliseTopic(topic) || 'this topic'} and the practices participants are expected to follow. ` +
      'Review and edit this description before saving.',
    position: null,
    lessons: [
      {
        title: `Introduction to ${normaliseTopic(topic) || 'this topic'}`,
        type: 'text',
        is_required: true,
        content:
          `## Introduction to ${normaliseTopic(topic) || 'this topic'}\n\n` +
          'Use this section to introduce the topic, why it matters, and what participants will be able to do afterwards.\n\n' +
          '### Key points\n' +
          '- Define the topic in plain language\n' +
          '- Explain why it matters in this training\n' +
          '- State what participants must do\n\n' +
          '### What participants will be able to do\n' +
          'After this lesson, participants should be able to describe the topic and apply the standard practice described here.'
      },
      {
        title: `${normaliseTopic(topic) || 'Topic'} requirements and responsibilities`,
        type: 'text',
        is_required: true,
        content:
          `## Requirements for ${normaliseTopic(topic) || 'this topic'}\n\n` +
          'List the specific requirements here, who each one applies to, and how compliance is demonstrated.\n\n' +
          '### Requirements\n' +
          '1. State the first requirement\n' +
          '2. State the second requirement\n' +
          '3. State how compliance is recorded\n\n' +
          '### Responsibilities\n' +
          'Describe the responsibility of the participant, the trainer, and the approving officer.'
      },
      {
        title: `Practical scenarios on ${normaliseTopic(topic) || 'this topic'}`,
        type: 'text',
        is_required: true,
        content:
          `## Practical scenarios\n\n` +
          'Add short real-world scenarios and ask participants what the correct action would be.\n\n' +
          (related.length
            ? `Related terms already used in this course: ${related.join(', ')}.\n\n`
            : '') +
          '### Scenario 1\nDescribe the situation, then ask what should happen and why.'
      },
      {
        title: `Summary and review of ${normaliseTopic(topic) || 'this topic'}`,
        type: 'text',
        is_required: true,
        content:
          `## Summary\n\n` +
          'Summarise the key points, list the requirements again, and point the participant to the assessment.\n\n' +
          'Remember: the final assessment unlocks once participants complete the required lessons, and it is answered by the participant, not by the assistant.'
      }
    ]
  };
}

function lessonDraft(topic) {
  const t = normaliseTopic(topic) || 'this topic';
  return {
    title: t.charAt(0).toUpperCase() + t.slice(1),
    type: 'text',
    is_required: true,
    video_url: null,
    content:
      `## ${t}\n\n` +
      'Opening paragraph: explain the topic in simple language and why it matters in this training.\n\n' +
      '### Main content\n' +
      '1. First key idea\n' +
      '2. Second key idea\n' +
      '3. Third key idea\n\n' +
      '### Practical example\n' +
      'Give one concrete example a participant would recognise.\n\n' +
      '### Key takeaway\n' +
      'Summarise in one sentence what the participant must remember.'
  };
}

function assessmentDraft(topic, count) {
  const t = normaliseTopic(topic) || 'this training';
  const total = Math.max(3, Math.min(10, Number(count) || 5));
  const questions = [];

  for (let i = 0; i < total; i++) {
    const blueprint = QUESTION_BLUEPRINTS[i % QUESTION_BLUEPRINTS.length];
    const options = [blueprint.answer, ...blueprint.distractors.slice(0, 3)];
    // Deterministic rotation so the correct answer is not always A.
    const rotate = i % 4;
    const rotated = [...options.slice(rotate), ...options.slice(0, rotate)];
    const correctIndex = rotated.indexOf(blueprint.answer);

    questions.push({
      question_text: blueprint.stem.replace(/\{topic\}/g, t),
      option_a: rotated[0],
      option_b: rotated[1],
      option_c: rotated[2],
      option_d: rotated[3],
      correct_answer: ['A', 'B', 'C', 'D'][correctIndex]
    });
  }

  return {
    title: `Final assessment: ${t}`,
    description: `Draft questions covering ${t}. Review every question and the marked answer before publishing.`,
    pass_score: 70,
    time_limit_minutes: 20,
    shuffle_questions: true,
    shuffle_options: true,
    questions
  };
}

/**
 * Builds a draft for the trainer. Returns structured, reviewable content.
 * @param {string} contentType 'module' | 'lesson' | 'assessment'
 */
async function generateDraft({ trainingId, contentType, topic, questionCount }) {
  const type = String(contentType || '').toLowerCase();
  if (!CONTENT_TYPES.has(type)) {
    const err = new Error(`contentType must be one of: ${[...CONTENT_TYPES].join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  const cleanTopic = normaliseTopic(topic);
  const lessons = await LearningContent.getPublishedLessonsByTraining(trainingId).catch(() => []);
  const keywords = courseKeywords(lessons);

  if (type === 'module') {
    return { contentType: 'module', draft: moduleDraft(cleanTopic, keywords) };
  }
  if (type === 'lesson') {
    return {
      contentType: 'lesson',
      draft: { ...lessonDraft(cleanTopic), lessonTypeOptions: LESSON_TYPES }
    };
  }
  return {
    contentType: 'assessment',
    draft: assessmentDraft(cleanTopic, questionCount),
    note:
      'This is a draft only. The trainer must verify each question and its marked answer before publishing. ' +
      'Drafts are never shown to trainees and no trainee attempt data is used.'
  };
}

module.exports = {
  generateDraft,
  CONTENT_TYPES,
  LESSON_TYPES
};
