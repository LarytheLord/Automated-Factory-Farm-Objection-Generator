const {
  extractEmailsFromPermit,
  getRecipientSuggestions,
} = require('../backend/recipientFinder');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function testEmailExtraction() {
  const permit = {
    project_title: 'Demo CAFO Expansion',
    details: {
      applicant_contact: 'permitting@example.gov',
      extra: ['ops@agency.gov', { note: 'backup: ops@agency.gov' }],
    },
  };

  const emails = extractEmailsFromPermit(permit);
  assert(Array.isArray(emails), 'extractEmailsFromPermit should return an array');
  assert(emails.includes('permitting@example.gov'), 'expected permitting email not found');
  assert(emails.includes('ops@agency.gov'), 'expected nested email not found');
  assert(emails.length === 2, 'emails should be de-duplicated');
}

function testFallbackSuggestions() {
  const permit = {
    id: 'uk-ea-1',
    source_key: 'uk_ea_public_register',
    country: 'United Kingdom',
    source_url: 'https://environment.data.gov.uk/public-register/view/search',
  };

  const payload = getRecipientSuggestions(permit);
  assert(payload.count >= 2, 'expected at least source record + EA register suggestions');
  assert(payload.suggestions.some((item) => item.id === 'source-record'), 'missing source record suggestion');
  assert(payload.suggestions.some((item) => item.id === 'uk-ea-public-register'), 'missing UK EA fallback suggestion');
}

function run() {
  testEmailExtraction();
  testFallbackSuggestions();
  console.log('phase14 recipient suggestions tests passed');
}

run();
