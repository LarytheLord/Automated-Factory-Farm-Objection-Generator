const { summarizeUsageEvents, detectUsageAnomalies } = require('../backend/usageAnalytics');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run() {
  const now = new Date('2026-02-18T12:00:00Z');
  const events = [
    { actor_key: 'user:1', role: 'citizen', action: 'generate_letter', outcome: 'success', created_at: '2026-02-18T11:55:00Z' },
    { actor_key: 'user:1', role: 'citizen', action: 'generate_letter', outcome: 'blocked', created_at: '2026-02-18T11:56:00Z' },
    { actor_key: 'user:2', role: 'ngo_admin', action: 'send_email', outcome: 'success', created_at: '2026-02-18T11:57:00Z' },
  ];

  const summary = summarizeUsageEvents(events, 50);
  assert(summary.totalEvents === 3, 'summary totalEvents mismatch');
  assert(summary.byAction.generate_letter === 2, 'summary action count mismatch');
  assert(summary.byOutcome.blocked === 1, 'summary blocked outcome mismatch');

  const noisy = [];
  for (let i = 0; i < 30; i += 1) {
    noisy.push({
      actor_key: 'ip:10.0.0.1',
      role: 'anonymous',
      action: i % 2 === 0 ? 'generate_letter' : 'send_email',
      outcome: i % 5 === 0 ? 'blocked' : 'success',
      created_at: `2026-02-18T11:${String(i).padStart(2, '0')}:00Z`,
    });
  }

  const anomalies = detectUsageAnomalies([...events, ...noisy], {
    now,
    windowHours: 24,
    minEvents: 25,
  });

  assert(anomalies.length >= 1, 'expected at least one anomaly');
  assert(anomalies[0].actor_key === 'ip:10.0.0.1', 'expected noisy actor to be flagged');
  assert(anomalies[0].blocked >= 1, 'expected blocked count on anomaly');

  console.log('phase2 usage analytics tests passed');
}

run();
