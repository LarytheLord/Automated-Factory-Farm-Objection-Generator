function toPercent(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

function buildSourceValidationReport({ source, preview, dryRun }) {
  const warnings = [];
  const checks = {
    sourceFound: Boolean(source && source.key),
    fetchedRecords: Number(preview?.fetched || 0),
    normalizedRecords: Number(preview?.normalized || 0),
    dryRunErrors: Number(dryRun?.errors || 0),
  };

  if (!checks.sourceFound) {
    return {
      verdict: 'blocked',
      readinessScore: 0,
      checks,
      warnings: ['Source is missing.'],
    };
  }

  if (checks.fetchedRecords === 0) {
    warnings.push('No records fetched from source preview.');
  }

  const normalizationRate = checks.fetchedRecords > 0
    ? checks.normalizedRecords / checks.fetchedRecords
    : 0;

  if (checks.fetchedRecords > 0 && normalizationRate < 0.8) {
    warnings.push('Low normalization rate; inspect field mappings before enabling source.');
  }

  if (checks.dryRunErrors > 0) {
    warnings.push('Dry-run sync reported errors.');
  }

  const score = toPercent((normalizationRate * 0.7) + (checks.dryRunErrors === 0 ? 0.3 : 0));

  let verdict = 'ready';
  if (checks.fetchedRecords === 0 || checks.dryRunErrors > 0) {
    verdict = 'blocked';
  } else if (warnings.length > 0) {
    verdict = 'needs_attention';
  }

  return {
    verdict,
    readinessScore: score,
    checks: {
      ...checks,
      normalizationRate,
    },
    warnings,
  };
}

module.exports = {
  buildSourceValidationReport,
};
