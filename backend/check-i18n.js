// Verifies that every t('...') key used by the forgot/reset pages exists in the
// Amharic dictionary, so switching to Amharic never leaves English text behind.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'frontend', 'src');
const dictSrc = fs.readFileSync(path.join(root, 'i18n', 'translations.js'), 'utf8');

const dict = {};
const dictRe = /^\s*'((?:[^'\\]|\\.)*)'\s*:\s*'((?:[^'\\]|\\.)*)'\s*,?\s*$/gm;
let m;
while ((m = dictRe.exec(dictSrc)) !== null) dict[m[1]] = m[2];

// Match only real translation calls: `t('...')`, not `.get('token')`.
const keyRe = /(?<![a-zA-Z0-9_.])t\(\s*'((?:[^'\\]|\\.)*)'/g;

let missing = 0;
let checked = 0;
const files = [
  'pages/ForgotPassword.jsx',
  'pages/ResetPassword.jsx',
  'pages/VerifyOtp.jsx',
  'pages/Login.jsx',
  'components/MeetingsManager.jsx',
  'pages/trainer/Meetings.jsx',
  'pages/admin/TrainingDetails.jsx',
  'pages/trainee/TrainingDetails.jsx'
];

for (const f of files) {
  const src = fs.readFileSync(path.join(root, f), 'utf8');
  const keys = new Set();
  let k;
  while ((k = keyRe.exec(src)) !== null) keys.add(k[1]);
  for (const key of keys) {
    checked++;
    if (!(key in dict)) {
      console.log(`  MISSING  ${f}  ->  "${key}"`);
      missing++;
    }
  }
  console.log(`${f}: ${keys.size} t() keys checked`);
}

// Keys built at runtime, so the literal regex above cannot see them. These
// come from STATUSES in MeetingsManager and from the attendance status stored
// on a meeting, both capitalised before being passed to t().
const dynamicKeys = ['Present', 'Absent', 'Late', 'Excused'];
for (const s of dynamicKeys) {
  checked++;
  if (!(s in dict)) {
    console.log(`  MISSING (dynamic key)  "${s}"`);
    missing++;
  }
}

// Backend messages that get passed through t() dynamically need a translation
// too, otherwise they render in English while in Amharic mode.
const serverMessages = [
  'This password reset link is invalid. Please request a new one.',
  'This password reset link has already been used. Please request a new one.',
  'This password reset link has expired. Please request a new one.',
  'Reset token is required',
  'Password has been reset successfully. You can now sign in.',
  'This verification code is incorrect or has expired. Please request a new one.',
  'This verification code has already been used. Please request a new one.',
  'This verification code has expired. Please request a new one.',
  'Too many incorrect attempts. Please request a new code.',
  'Verification successful. You can now set a new password.'
];
for (const s of serverMessages) {
  checked++;
  if (!(s in dict)) {
    console.log(`  MISSING (server message)  "${s}"`);
    missing++;
  }
}

// No key may be left untranslated (value identical to the English key), and
// no key may be defined twice: an object literal silently keeps only the last
// value for a repeated key, so a duplicate would hide a stale translation.
const untranslated = Object.keys(dict).filter((key) => dict[key] === key);
for (const key of untranslated) {
  console.log(`  UNTRANSLATED  "${key}"`);
}

const counts = new Map();
const keyOccurrences = /^\s*'((?:[^'\\]|\\.)*)'\s*:\s*'((?:[^'\\]|\\.)*)'/gm;
let o;
while ((o = keyOccurrences.exec(dictSrc)) !== null) {
  counts.set(o[1], (counts.get(o[1]) || 0) + 1);
}
const duplicates = [...counts.entries()].filter(([, n]) => n > 1);
for (const [key, n] of duplicates) {
  console.log(`  DUPLICATE KEY x${n}  "${key}" (only the last value is used)`);
}

console.log(`\nchecked: ${checked}   missing: ${missing}   untranslated: ${untranslated.length}   duplicates: ${duplicates.length}`);
process.exit(missing || untranslated.length || duplicates.length ? 1 : 0);
