// MinT AI Training Assistant — reply engine.
//
// This is a self-contained retrieval-based assistant. It explains the training
// material (current lesson + the rest of the course) in plain language and it
// NEVER answers assessment questions. The engine only ever sees lesson content;
// assessment questions/answers are never loaded or passed to it.
//
// The engine has no external dependencies and works offline.

const MAX_EVIDENCE_SENTENCES = 3;

const TYPE_LABELS = {
  text: 'Reading',
  video: 'Video',
  pdf: 'PDF',
  document: 'Document',
  link: 'External Link'
};

// Phrases that ask the assistant to solve or reveal assessment answers.
// Anything matching these triggers a refusal instead of an answer.
const ASSESSMENT_REQUEST_PATTERNS = [
  // "assessment ... answer", "exam ... correct", "test ... key", etc.
  /(assessment|quiz|exam|final|test|evaluation|mid ?term)\b.{0,60}\b(answer|answers|solve|solved|solution|solutions|correct|key|option|options|choice|cheat|work (it|this) out)\b/i,
  // "answer ... assessment", "solve ... exam", "solution ... test"
  /\b(answer|answers|solve|solved|solution|solutions|correct answer|right answer)\b.{0,50}\b(assessment|quiz|exam|final test|test|evaluation)\b/i,
  // "Which option is correct?", "which answer is right?", "which option should I pick?"
  /\bwhich (option|choice|answer|letter)\b.{0,40}\b(correct|right|answer|one|pick|choose|select)\b/i,
  // "What is the correct option?", "the correct answer", "right choice"
  /\b(the |this |that |is the )?(correct|right) (option|choice|answer)\b/i,
  // "Give me the answers", "tell me the correct answer", "send me the answer key"
  /\b(give|tell|send|share|type) (me|us|the)?\s*(the )?(answers?|correct answer|right answer|answer key|solutions?)\b/i,
  // "What is the correct answer?", "which one is the correct answer?"
  /\b(what|which|is it)\b.{0,30}(correct answer|right answer|actual answer)\b/i,
  // "Pass/bypass/cheat the assessment"
  /\b(pass|bypass|cheat|fake|game)\b.{0,25}\b(the |this |that )?(assessment|quiz|exam|final test|test|evaluation)\b/i,
  // "Solve this assessment for me"
  /\bsolve\b.{0,30}\b(the |this |that )?(assessment|quiz|exam|final test|test|evaluation)\b/i,
  // "Multiple choice answers"
  /\b(multiple choice|mcq|mcqs|objective test)\b.{0,40}\b(answers?|solutions?|answer key)\b/i
];

const REFUSAL_MESSAGE =
  'I can help you understand the concept, but I cannot provide answers to assessment questions. ' +
  'Please use the lesson materials to answer the assessment yourself.\n\n' +
  'If you tell me which topic or concept the question is about, I will be happy to explain that concept in simple terms.';

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'while',
  'of', 'in', 'on', 'at', 'to', 'for', 'from', 'by', 'with', 'without', 'about',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am', 'do', 'does', 'did',
  'have', 'has', 'had', 'having', 'will', 'would', 'shall', 'should', 'can',
  'could', 'may', 'might', 'must', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
  'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their',
  'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom', 'whose',
  'how', 'why', 'where', 'when', 'not', 'no', 'yes', 'so', 'too', 'very',
  'please', 'help', 'explain', 'tell', 'know', 'want', 'would', 'there', 'here',
  'also', 'just', 'only', 'about', 'than', 'then', 'as', 'into', 'over', 'under',
  'again', 'further', 'once', 'every', 'some', 'any', 'all', 'both', 'each',
  'few', 'more', 'most', 'other', 'such', 'own', 'same', 'kind', 'sort', 'way'
]);

function tok(text) {
  return String(text).toLowerCase().match(/[\p{L}][\p{L}\p{N}']*/gu) || [];
}

function contentTokens(text) {
  return tok(text).filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function splitSentences(text) {
  return String(text || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/(?<=[.!?])\s+/g, '\n')
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Common English plural/number variants for a single word, so that "octet"
// still matches "octets", "address" matches "addresses", "virus" matches "viruses".
function wordVariants(word) {
  const forms = new Set([word]);
  if (/ies$/.test(word)) forms.add(word.slice(0, -3) + 'y');
  if (/es$/.test(word)) forms.add(word.slice(0, -2));
  if (/s$/.test(word) && !/ss$/.test(word)) forms.add(word.slice(0, -1));
  if (/y$/.test(word) && !/ies$/.test(word) && !/ay|ey|oy|uy$/.test(word)) forms.add(word.slice(0, -1) + 'ies');
  if (/[^s]$/.test(word)) forms.add(word + 's');
  return [...forms];
}

function typeLabel(type) {
  return TYPE_LABELS[type] || 'Lesson';
}

function formatShort(lesson) {
  switch (lesson.type) {
    case 'video': return 'a video presentation';
    case 'pdf': return 'a PDF document';
    case 'document': return 'a document';
    case 'link': return 'an external online resource';
    default: return 'a reading lesson';
  }
}

// Returns true when the user is clearly asking for assessment answers.
function refuseAssessmentRequest(message) {
  const clean = String(message || '').trim();
  if (!clean) return false;
  return ASSESSMENT_REQUEST_PATTERNS.some((pattern) => pattern.test(clean));
}

function getWelcome(context) {
  return (
    `Hello! I am your AI Training Assistant for "${context.training.training_title}".\n\n` +
    'I can help you understand the learning material. Just ask me to:\n' +
    '\u2022 Explain a concept from your lessons in simple terms\n' +
    '\u2022 Define a term or phrase\n' +
    '\u2022 Summarize the current lesson\n' +
    '\u2022 Give examples\n' +
    '\nOne thing I will not do is answer assessment questions for you. You will answer those yourself using the lesson materials.\n\n' +
    'What would you like help with?'
  );
}

// ---------------------------------------------------------------------------
// Ordinary conversation
//
// "Hi", "Hello", "Good morning" and "Thank you" are not lesson questions, and
// two things used to go wrong:
//
//   1. Anything outside a short hand-written list of exact openers ("hi",
//      "hello", "hey", "good morning", "thanks", ...) fell through to the
//      retrieval fallback and was answered with 'I could not find an exact
//      match for that in the lesson ...'. A trainee who said "morning", "yo",
//      "ok" or "bye" got told their own greeting could not be found.
//
//   2. Worse - a greeting in FRONT of a real question swallowed the question.
//      "Hi, what is this lesson about?" answered with the welcome banner and
//      never mentioned the lesson the trainee was actually on.
//
// The rule now:
//
//   - a message that is ONLY small talk is answered conversationally;
//   - a message that merely STARTS with small talk keeps its question and loses
//     only the greeting.
//
// So a lesson question always reaches the retrieval pipeline below, which still
// answers from the currently selected lesson first.
// ---------------------------------------------------------------------------

// Small talk is matched on a normalised key - lowercased with spaces and
// punctuation removed - so "Hey there!", "hey  there" and "HEY!" are one entry
// rather than three, and multiword forms ("thank you very much") collapse the
// same way.
const normalizeForSmallTalk = (text) =>
  String(text == null ? '' : text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');

const SMALL_TALK = {
  greetings: new Set([
    'hi', 'hii', 'hiii', 'hiiii', 'hey', 'heyya', 'heyy', 'heya', 'hello',
    'hallo', 'helo', 'yo', 'yoo', 'howdy', 'hiya', 'sup', 'whatsup',
    'greetings', 'salutations', 'goodmorning', 'goodafternoon', 'goodevening',
    'goodday', 'morning', 'afternoon', 'evening',
    'namaste', 'salam', 'assalamualaikum', 'marhaba', 'bonjour', 'salut',
    'ciao', 'hola', 'ohayo', 'konnichiwa', 'annyeonghaseyo',
    // Amharic
    'ሰላም', 'ሰላምዎት', 'ጤናይስጥልኝ'
  ]),
  thanks: new Set([
    'thanks', 'thank', 'thankyou', 'thanku', 'thankyouverymuch',
    'thankyousomuch', 'thankyoualot', 'thanksalot', 'thanksyou',
    'thanksyouverymuch', 'thx', 'thnx', 'tnx', 'ty', 'tysm',
    'appreciate', 'appreciated', 'grateful', 'cheers', 'manythanks',
    // Amharic
    'አመሰግናለሁ', 'አመሰግናለህ', 'በጣምነኝ'
  ]),
  farewells: new Set([
    'bye', 'byebye', 'goodbye', 'goodbyes', 'farewell', 'seeyou', 'seeyousoon',
    'seeyalater', 'cya', 'later', 'takecare'
  ]),
  // "ok", "got it", "I understand" - an acknowledgement, not a question. Answered
  // as thanks rather than searched for in the lesson material.
  acknowledgements: new Set([
    'ok', 'okay', 'k', 'kk', 'yes', 'yeah', 'yep', 'yup', 'gotit', 'gotcha',
    'understood', 'iunderstand', 'nowiunderstand', 'makesense', 'thathelped',
    'thatmakessense', 'thatclarifies', 'clear', 'perfect', 'great', 'nice',
    'cool', 'awesome', 'soundsgood'
  ])
};

// Questions about the assistant itself rather than about the material.
const IDENTITY_QUESTIONS = new Set([
  'whoareyou', 'whatareyou', 'whatis yourname'.replace(' ', ''), 'whatsyourname',
  'areyouhuman', 'areyoureal', 'areyouai', 'areyoutheassistant', 'areyouabot',
  'areyouarobot'
]);

const CAPABILITY_QUESTIONS = new Set([
  'whatcanyoudo', 'whatdo youdo'.replace(' ', ''), 'howcanyouhelp',
  'howcanyouhelpme', 'how do youwork'.replace(' ', ''), 'howdoyouwork',
  'whatsyourjob', 'whatareyoufor'
]);

const SMALL_TALK_QUESTIONS = new Set([
  'howareyou', 'howareyoudoing', 'howsitgoing', 'howsyourday', 'howhasyourdaybeen',
  'whatsup', 'whatsgoingon'
]);

// Leading punctuation or a spaced dash, i.e. the tail of a split clause.
const CLAUSE_TAIL = /^[,;:!?.\u2026\s\u2013\u2014-]+/;

// Trailing filler that does not change the meaning of an opener: "hi there",
// "hello everyone" and "ok all" are the same messages as "hi", "hello" and "ok".
const GREETING_FILLER = ['there', 'everyone', 'everybody', 'all', 'folks', 'guys', 'team'];

function stripGreetingFiller(key) {
  for (const filler of GREETING_FILLER) {
    if (key.length > filler.length && key.endsWith(filler)) {
      return key.slice(0, -filler.length);
    }
  }
  return key;
}

// Returns 'thanks' | 'greeting' | 'farewell' | null.
// A real lesson question never normalises to a bare key like "hi" or "thanks",
// so an exact whole-message match is safe.
function classifySmallTalk(text) {
  const key = normalizeForSmallTalk(text);
  if (!key) return null;
  const withoutFiller = stripGreetingFiller(key);
  for (const candidate of withoutFiller === key ? [key] : [key, withoutFiller]) {
    if (SMALL_TALK.thanks.has(candidate) || SMALL_TALK.acknowledgements.has(candidate)) return 'thanks';
    if (SMALL_TALK.greetings.has(candidate)) return 'greeting';
    if (SMALL_TALK.farewells.has(candidate)) return 'farewell';
  }
  return null;
}

// Returns 'chitchat' | 'identity' | 'capability' | null for questions that are
// about the assistant rather than about the lesson material.
function classifyConversationalQuestion(text) {
  const key = normalizeForSmallTalk(text);
  if (!key) return null;
  if (SMALL_TALK_QUESTIONS.has(key)) return 'chitchat';
  if (IDENTITY_QUESTIONS.has(key)) return 'identity';
  if (CAPABILITY_QUESTIONS.has(key)) return 'capability';
  return null;
}

/**
 * Splits a leading small-talk clause off a message.
 *
 *   'Hi, what is this lesson about?' -> { smallTalk: 'greeting', rest: 'what is this lesson about?' }
 *   'Good morning'                   -> { smallTalk: 'greeting', rest: '' }
 *   'What is a variable, and ...?'   -> { smallTalk: null,     rest: <unchanged> }
 *
 * Only the text before the FIRST clause separator is considered, and it is
 * treated as small talk only when it is nothing but small talk. That is what
 * keeps a comma inside a real question from being mistaken for a greeting.
 */
function splitLeadingSmallTalk(text) {
  const raw = String(text == null ? '' : text).trim();
  if (!raw) return { smallTalk: null, rest: '' };

  const dash = raw.search(/\s[-\u2013\u2014]\s/);
  const punctuation = raw.search(/[,;:!?.\u2026]/);
  const cuts = [dash, punctuation].filter((i) => i >= 0);

  // No clause separator at all: the whole message is one clause. It may still be
  // small talk on its own ("Hi", "thank you very much"), so it is classified
  // whole rather than passed on as a question.
  if (!cuts.length) {
    const whole = classifySmallTalk(raw);
    return whole ? { smallTalk: whole, rest: '' } : { smallTalk: null, rest: raw };
  }

  const at = Math.min(...cuts);
  const head = raw.slice(0, at).trim();
  const kind = classifySmallTalk(head);
  if (!kind) return { smallTalk: null, rest: raw };

  return { smallTalk: kind, rest: raw.slice(at).replace(CLAUSE_TAIL, '').trim() };
}

// "Good morning" before noon, and so on. Uses the server's clock, which only
// affects how warm the opening line is.
function greetingFor(hour = new Date().getHours()) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// Greets naturally AND says which lesson the assistant is answering about, so
// the reply is anchored to what the trainee is actually looking at.
function getGreeting(context) {
  const lesson = context.currentLesson;
  const where = lesson
    ? `You are currently on the lesson "${lesson.title}", so feel free to ask me anything about it.`
    : 'Open a lesson from the course content and I will answer from the lesson you are viewing.';

  return (
    `${greetingFor()}! I am your AI Training Assistant for "${context.training.training_title}".\n\n` +
    `${where}\n\n` +
    'I can help you:\n' +
    '\u2022 Explain a concept from your lessons in simple terms\n' +
    '\u2022 Define a term or phrase\n' +
    '\u2022 Summarize the current lesson\n' +
    '\u2022 Give examples\n' +
    '\nOne thing I will not do is answer assessment questions for you. You will answer those yourself using the lesson materials.\n\n' +
    'What would you like help with?'
  );
}

function getThanks(context) {
  const lesson = context.currentLesson;
  const tail = lesson
    ? `If there is anything else in the lesson "${lesson.title}" you want me to explain, just ask.`
    : 'If there is any other concept from the training material you want me to explain, just ask.';
  return `You are welcome! ${tail}`;
}

function getGoodbye() {
  return 'Goodbye! Come back whenever you need a hand with the training material.';
}

function getChitchat(context) {
  return (
    'I am doing well, thank you for asking! I am here and ready to help with ' +
    `"${context.training.training_title}".` +
    (context.currentLesson
      ? `\n\nAsk me anything about the lesson "${context.currentLesson.title}".`
      : '\n\nAsk me about any concept from the training material.')
  );
}

function replyForSmallTalk(kind, context) {
  switch (kind) {
    case 'greeting':
      return getGreeting(context);
    case 'identity':
    case 'capability':
      return getWelcome(context);
    case 'chitchat':
      return getChitchat(context);
    case 'farewell':
      return getGoodbye();
    case 'thanks':
    default:
      return getThanks(context);
  }
}

// Acknowledges the small talk, then gives the lesson answer the greeting was
// wrapped around. The answer is never dropped.
function prefixWithSmallTalk(kind, body) {
  if (kind === 'greeting') return `${greetingFor()}!\n\n${body}`;
  if (kind === 'thanks') return `You are welcome.\n\n${body}`;
  return body;
}

function listLessons(context) {
  const byModule = {};
  for (const l of context.lessons) {
    const module = l.module_title || 'General';
    if (!byModule[module]) byModule[module] = [];
    byModule[module].push(l.title);
  }
  if (Object.keys(byModule).length === 0) return 'No lessons have been published yet in this training.';
  return Object.entries(byModule)
    .map(([module, titles]) => `\u2022 ${module}: ${titles.join(', ')}`)
    .join('\n');
}

function getHowTo(context) {
  const lesson = context.currentLesson;
  if (!lesson) {
    return (
      'To make progress in this training:\n1. Open each required lesson from the course content.\n' +
      '2. Review the reading/video/PDF material.\n3. Click "Mark as Complete" when you are done.\n' +
      'Once you complete at least 75% of the training, the final assessment unlocks. Pass it and the certificate is issued automatically.'
    );
  }
  const reviewTip = lesson.type === 'video'
    ? 'Watch the video to at least 80% completion (your progress is saved automatically)'
    : `Review the ${typeLabel(lesson.type).toLowerCase()} material carefully`;
  return (
    `To complete this lesson ("${lesson.title}"):\n` +
    `1. ${reviewTip}.\n` +
    '2. Click the "Mark as Complete" button below the material.\n\n' +
    'This lesson counts toward your training progress. When you have enough progress the final assessment unlocks, and passing it issues your certificate. I can help you understand the material — just ask!'
  );
}

function getLessonSummary(context) {
  const lesson = context.currentLesson;
  if (!lesson) {
    return (
      `Here is an overview of "${context.training.training_title}":\n${listLessons(context)}\n\n` +
      'Ask me to explain any concept from these lessons or to define any term you find.'
    );
  }
  const head = `Learning Material: Lesson "${lesson.title}" (${typeLabel(lesson.type)})${lesson.module_title ? ` in module "${lesson.module_title}"` : ''}.`;
  if (lesson.content) {
    const preview = splitSentences(lesson.content).slice(0, 3).join(' ');
    return (
      `${head}\n\n${preview}\n\n` +
      'Ask me about any term or concept in this lesson and I will explain it in simple terms, or give you examples.'
    );
  }
  return (
    `${head}\n\n` +
    `This lesson is based on ${formatShort(lesson)} and does not include a written summary in the material. ` +
    'Tell me which specific concept you want me to explain and I will search this training\'s content for you.'
  );
}

function findTermDefinition(term, context) {
  const variants = wordVariants(term).map(escapeRegExp).join('|');
  const termRegex = new RegExp(`\\b(${variants})\\b`, 'i');
  const items = [];
  if (context.currentLesson && context.currentLesson.content) {
    items.push(context.currentLesson);
  }
  for (const l of context.lessons) {
    if (l.content && (!context.currentLesson || String(l.id) !== String(context.currentLesson.id))) {
      items.push(l);
    }
  }
  for (const item of items) {
    const sentences = splitSentences(item.content);
    const idx = sentences.findIndex((s) => termRegex.test(s));
    if (idx >= 0) {
      const contextSentence = sentences[idx + 1] || null;
      const joined = contextSentence ? `${sentences[idx]} ${contextSentence}` : sentences[idx];
      const learned = item.title === (context.currentLesson && context.currentLesson.title)
        ? 'in this lesson'
        : `in the lesson "${item.title}"`;
      return `"${term}" ${learned}:\n${joined}\n\nI hope that makes sense. I can also give you an example if you would like one.`;
    }
  }
  return null;
}

function retrieveEvidence(items, qTokens) {
  const matches = [];
  for (const item of items) {
    if (!item.content) continue;
    for (const sentence of splitSentences(item.content)) {
      const sTokens = new Set(contentTokens(sentence));
      let score = 0;
      const distinct = new Set();
      for (const t of qTokens) {
        const variants = wordVariants(t);
        const hit = variants.some((v) => sTokens.has(v));
        if (hit) {
          score += 1;
          distinct.add(t);
        }
      }
      if (score > 0) {
        matches.push({ sentence, score, distinct: distinct.size, title: item.title });
      }
    }
  }
  matches.sort((a, b) => b.score - a.score || b.distinct - a.distinct);
  return matches.slice(0, MAX_EVIDENCE_SENTENCES);
}

function dedupe(matches) {
  const seen = new Set();
  const out = [];
  for (const m of matches) {
    const key = m.sentence.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  return out;
}

function composeEvidenceAnswer(matches) {
  if (!matches.length) return null;
  const unique = dedupe(matches);
  const body = unique.map((m, i) => `${i + 1}. ${m.sentence}`).join('\n');
  const titles = new Set(unique.map((m) => m.title));
  if (titles.size <= 1) {
    return (
      `In the lesson "${unique[0].title}", the material explains it as follows:\n${body}\n\n` +
      'I hope this helps! You can also ask me to define a term or give you an example.'
    );
  }
  const labeled = unique.map((m, i) => `${i + 1}. [${m.title}] ${m.sentence}`).join('\n');
  return `Here is what I found across your training material:\n${labeled}\n\nI hope this helps!`;
}

function getFallback(context) {
  const lesson = context.currentLesson;
  if (lesson) {
    return (
      `I could not find an exact match for that in the lesson "${lesson.title}".\n\n` +
      'You can ask me things like:\n' +
      '\u2022 "What is this lesson about?"\n' +
      '\u2022 "Explain <a concept> from this lesson"\n' +
      '\u2022 "Define <a term>"\n' +
      '\nIf the concept belongs to another lesson in this training, mention it and I will search the course material and explain it to you.'
    );
  }
  return (
    'I could not find that information in this training\'s material. Try asking me to "summarize this training", ' +
    '"explain" a concept, or "define" a term, and I will search the course content for you.'
  );
}

// ---------------------------------------------------------------------------
// Public: generate a reply for a trainee question given the course context.
// context = { training, currentLesson, lessons }
// ---------------------------------------------------------------------------
function generateReply(context, question) {
  let clean = String(question || '').trim().replace(/\s+/g, ' ');
  if (!clean) return 'Please ask me a question about the training material.';

  // Split any leading small talk off the question, e.g. "Hi, define variable"
  // becomes "define variable" with kind='greeting', or "Thanks!" becomes rest=''
  // and kind='thanks'.
  const split = splitLeadingSmallTalk(clean);
  const kind = split.smallTalk;
  const tail = split.rest;

  // Only small talk. No question after it.
  if (kind && !tail) {
    return replyForSmallTalk(kind, context);
  }

  // Small talk + a real question. Answer the question (always), then prefix with
  // a light acknowledgement, so the lesson answer is never lost.
  const chitchat = !kind ? classifyConversationalQuestion(clean) : null;
  if (!kind && chitchat && !contentTokens(clean).length) {
    return replyForSmallTalk(chitchat, context);
  }

  // -------------------------------------------------------------------------
  // From here on the message is a lesson question (possibly with a small-talk
  // prefix). Process the tail (or the original if no small talk) to keep the
  // lesson context answer intact.
  // -------------------------------------------------------------------------
  const queryText = kind && tail ? tail : clean;

  // How to complete / make progress
  if (/how (do|can|should) (i|a trainee) (complete|finish|pass|mark|go through)\b|what do i need to do|mark (it|this)/i.test(queryText)) {
    const body = getHowTo(context);
    return kind ? prefixWithSmallTalk(kind, body) : body;
  }

  // Summarize the current lesson / training
  if (/(summarize|summary of|give me an? overview|what is this (lesson|module|material|training)|explain this (lesson|module|material|training) (in simple terms)|break down)/i.test(queryText)) {
    const body = getLessonSummary(context);
    return kind ? prefixWithSmallTalk(kind, body) : body;
  }

  // Definition of a specific term
  const termMatch = queryText.match(
    /\b(?:define|definition of|meaning of|what does|what is|what are|what's)\s+(?:the |a |an |this |that )?([\p{L}][\p{L}\p{N}\s'&-]{1,40}?)\s*(?:[?.!]|$)/iu
  );
  if (termMatch && termMatch[1]) {
    const term = termMatch[1].trim().toLowerCase().replace(/\s+/g, ' ');
    if (term.split(/\s+/).length <= 5) {
      const definition = findTermDefinition(term, context);
      if (definition) return kind ? prefixWithSmallTalk(kind, definition) : definition;
    }
  }

  // Generic question answered from the lesson material
  const qTokens = contentTokens(queryText);
  if (!qTokens.length) {
    // If it was just small talk that got stripped to empty in an odd case,
    // answer small talk. Otherwise ask for rephrase.
    if (kind) return replyForSmallTalk(kind, context);
    return 'Please rephrase your question and I will help you. For example: "Explain the main idea of this lesson" or "Define <a term>".';
  }

  const lessonItems = context.currentLesson && context.currentLesson.content ? [context.currentLesson] : [];
  let matches = retrieveEvidence(lessonItems, qTokens);
  let source = 'current lesson';
  if (!matches.length) {
    const allItems = context.lessons.filter((l) => l.content);
    const broader = retrieveEvidence(allItems, qTokens);
    if (broader.length) {
      matches = broader;
      source = 'training material';
    }
  }
  const answer = composeEvidenceAnswer(matches);
  if (answer) return kind ? prefixWithSmallTalk(kind, answer) : answer;

  const fallback = getFallback(context);
  return kind ? prefixWithSmallTalk(kind, fallback) : fallback;
}

module.exports = {
  refuseAssessmentRequest,
  generateReply,
  classifySmallTalk,
  classifyConversationalQuestion,
  splitLeadingSmallTalk,
  ASSESSMENT_REQUEST_PATTERNS,
  SMALL_TALK,
  REFUSAL_MESSAGE,
  splitSentences,
  contentTokens,
  wordVariants
};