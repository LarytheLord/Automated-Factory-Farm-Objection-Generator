const { buildSourceValidationReport } = require('../backend/sourceRollout');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run() {
  const source = { key: 'nc_deq' };

  const ready = buildSourceValidationReport({
    source,
    preview: { fetched: 10, normalized: 10 },
    dryRun: { errors: 0 },
  });
  assert(ready.verdict === 'ready', 'expected ready verdict');
  assert(ready.readinessScore === 100, 'expected readiness score 100');

  const attention = buildSourceValidationReport({
    source,
    preview: { fetched: 10, normalized: 7 },
    dryRun: { errors: 0 },
  });
  assert(attention.verdict === 'needs_attention', 'expected needs_attention verdict');
  assert(attention.warnings.length > 0, 'expected warnings for low normalization rate');

  const blockedNoData = buildSourceValidationReport({
    source,
    preview: { fetched: 0, normalized: 0 },
    dryRun: { errors: 0 },
  });
  assert(blockedNoData.verdict === 'blocked', 'expected blocked verdict for no data');

  const blockedErrors = buildSourceValidationReport({
    source,
    preview: { fetched: 10, normalized: 10 },
    dryRun: { errors: 2 },
  });
  assert(blockedErrors.verdict === 'blocked', 'expected blocked verdict for dry-run errors');

  console.log('phase11 source validation report tests passed');
}

run();
