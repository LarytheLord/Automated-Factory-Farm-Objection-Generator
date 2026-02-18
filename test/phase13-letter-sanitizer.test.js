const { sanitizeLetterText } = require('../backend/letterSanitizer');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run() {
  const raw = "Hello\u2014World\n\n\nSection\u00A712\u2028Bullet:\u2022 item\uFFFD";
  const clean = sanitizeLetterText(raw);

  assert(clean.includes('Hello-World'), 'em dash should be normalized');
  assert(!clean.includes('\uFFFD'), 'replacement chars should be removed');
  assert(!clean.includes('\u00A7'), 'section symbol should be normalized');
  assert(!/\n{3,}/.test(clean), 'extra blank lines should be collapsed');

  console.log('phase13 letter sanitizer tests passed');
}

run();
