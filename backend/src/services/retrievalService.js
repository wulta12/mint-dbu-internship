// Retrieval for the trainee AI Training Assistant.
//
// Scope rules enforced here:
//   - only PUBLISHED lessons of the training the trainee is enrolled in
//   - lessons are RANKED by relevance to the question, not dumped wholesale
//   - the TOTAL character budget across all retrieved passages is capped
//   - assessment data is never read, so it cannot reach a reply
//
// Budget: the cap is a TOTAL across every retrieved passage, not a
// per-lesson allowance, so a large course cannot flood the context.

const { contentTokens, wordVariants } = require('./assistantEngine');

// Total retrieval budget in characters.
const MAX_CONTEXT_CHARS = 4000;
// Head-room kept free so the assembled context never exceeds the cap.
const CONTEXT_HEADROOM = 200;

// Scores a lesson against the query tokens using its title and content.
function scoreLesson(lesson, queryTokens) {
  if (!queryTokens || !queryTokens.length) return 0;

  const titleTokens = new Set(contentTokens(lesson.title || ''));
  const bodyTokens = new Set(contentTokens(lesson.content || ''));

  let score = 0;
  const seen = new Set();
  for (const token of queryTokens) {
    const variants = wordVariants(token);
    const inTitle = variants.some((v) => titleTokens.has(v));
    const inBody = variants.some((v) => bodyTokens.has(v));
    if (inTitle) score += 3; // title matches are a stronger signal
    else if (inBody) score += 1;
    if (inTitle || inBody) seen.add(token);
  }

  // Reward covering more of the distinct question terms.
  return score + seen.size * 0.5;
}

// Keeps only the text passages that actually contain question terms, so the
// budget is spent on relevant material rather than the first N characters.
function extractRelevantExcerpt(lesson, queryTokens, maxChars) {
  const content = String(lesson.content || '');
  if (!content) return '';
  if (content.length <= maxChars) return content;
  if (!queryTokens || !queryTokens.length) return content.slice(0, maxChars);

  const sentences = content
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim().length > 0);

  const wanted = [];
  for (const token of queryTokens) {
    const variants = wordVariants(token);
    for (const sentence of sentences) {
      const sTokens = new Set(contentTokens(sentence));
      if (variants.some((v) => sTokens.has(v))) wanted.push(sentence);
    }
  }

  if (!wanted.length) return content.slice(0, maxChars);

  // Keep original reading order and drop duplicates.
  const order = new Map();
  wanted.forEach((s, i) => { if (!order.has(s)) order.set(s, i); });
  const picked = [...order.keys()]
    .sort((a, b) => sentences.indexOf(a) - sentences.indexOf(b))
    .join(' ')
    .slice(0, maxChars);

  return picked || content.slice(0, maxChars);
}

// Builds the retrieval context for one question.
//
// currentLesson is always prioritised (the trainee is looking at it), then
// remaining published lessons are added by relevance until the budget is used.
function buildRetrievalContext({ training, currentLesson, lessons, message }) {
  const budget = MAX_CONTEXT_CHARS - CONTEXT_HEADROOM;
  const queryTokens = [...new Set(contentTokens(String(message || '')))];

  const candidates = (lessons || []).filter((l) => l && l.is_published !== false);

  const ranked = candidates
    .map((lesson) => ({ lesson, score: scoreLesson(lesson, queryTokens) }))
    .sort((a, b) => b.score - a.score);

  const selected = [];
  const seenIds = new Set();
  let used = 0;

  const take = (lesson, isCurrent) => {
    const id = String(lesson.id);
    if (seenIds.has(id)) return false;
    const remaining = budget - used;
    if (remaining <= 0 && !isCurrent) return false;

    const excerpt = extractRelevantExcerpt(lesson, queryTokens, Math.max(0, remaining));

    // The current lesson is always kept, even when it has no text (a video
    // or link lesson). Its title/type still tells the assistant which lesson
    // the trainee is on, and it costs nothing from the budget because only
    // its text counts.
    if (!excerpt && !isCurrent) return false;

    seenIds.add(id);
    used += excerpt.length;
    selected.push({
      id: lesson.id,
      title: lesson.title,
      type: lesson.type,
      module_title: lesson.module_title || null,
      is_current: !!isCurrent,
      content: excerpt
    });
    return true;
  };

  // 1. The lesson the trainee is currently reading, first.
  if (currentLesson) take(currentLesson, true);
  // 2. Then the most relevant published lessons, within the budget.
  for (const { lesson } of ranked) {
    if (used >= budget) break;
    take(lesson, false);
  }

  return {
    training: { id: training.id, training_title: training.training_title },
    currentLesson: selected.find((l) => l.is_current) || null,
    lessons: selected,
    meta: {
      total_context_chars: used,
      max_context_chars: MAX_CONTEXT_CHARS,
      lessons_considered: candidates.length,
      lessons_used: selected.length,
      sources: selected.map((l) => ({ id: l.id, title: l.title, type: l.type }))
    }
  };
}

module.exports = {
  buildRetrievalContext,
  scoreLesson,
  MAX_CONTEXT_CHARS,
  CONTEXT_HEADROOM
};
