const { scorePermitForObjection, annotateAndSortPermits } = require('../backend/permitPriority');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run() {
  const critical = scorePermitForObjection({
    status: 'Pending',
    category: 'Red',
    activity: 'Swine CAFO Expansion',
    notes: 'Public hearing announced',
  });

  assert(critical.score >= 75, 'expected high score for pending red high-impact permit');
  assert(critical.tier === 'critical', 'expected critical tier for highest-risk permit');

  const low = scorePermitForObjection({
    status: 'Approved',
    category: 'Unknown',
    activity: 'Industrial Facility',
    notes: '',
  });

  assert(low.score < critical.score, 'approved permit should rank lower than pending critical permit');

  const sorted = annotateAndSortPermits([
    { id: 'b', status: 'Approved', category: 'Unknown', activity: 'Industrial', notes: '' },
    { id: 'a', status: 'Pending', category: 'Red', activity: 'Poultry Farm', notes: 'consultation open' },
  ]);

  assert(sorted[0].id === 'a', 'highest objection-priority permit should be first');
  assert(typeof sorted[0].objection_priority_score === 'number', 'annotated score missing');
  assert(Array.isArray(sorted[0].objection_priority_reasons), 'annotated reasons missing');

  console.log('phase12 permit priority tests passed');
}

run();
