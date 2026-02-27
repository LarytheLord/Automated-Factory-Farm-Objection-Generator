const CHAR_MAP = {
  '\u2018': "'",
  '\u2019': "'",
  '\u201C': '"',
  '\u201D': '"',
  '\u2013': '-',
  '\u2014': '-',
  '\u2026': '...',
  '\u00A0': ' ',
  '\u2022': '-',
  '\u00B7': '-',
  '\u00A7': ' Section ',
};

function replaceMappedChars(text) {
  let output = String(text || '');
  for (const [key, value] of Object.entries(CHAR_MAP)) {
    output = output.split(key).join(value);
  }
  return output;
}

function sanitizeLetterText(text) {
  let output = replaceMappedChars(text);

  // Remove control characters except tab/newline/carriage return.
  output = output.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Normalize Unicode separators to newlines.
  output = output.replace(/[\u2028\u2029]/g, '\n');

  // Drop replacement chars from malformed decoding.
  output = output.replace(/\uFFFD/g, '');

  // Collapse repeated blank lines.
  output = output.replace(/\n{3,}/g, '\n\n');

  return output.trim();
}

module.exports = {
  sanitizeLetterText,
};
