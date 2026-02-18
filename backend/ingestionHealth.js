function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hoursBetween(a, b) {
  return Math.max(0, (a.getTime() - b.getTime()) / (1000 * 60 * 60));
}

function buildDuplicateStats(permits) {
  const externalIdMap = new Map();
  const projectLocationMap = new Map();

  for (const permit of permits) {
    const externalId = String(permit.external_id || '').trim();
    if (externalId) {
      const key = externalId.toLowerCase();
      const existing = externalIdMap.get(key) || [];
      existing.push(permit.ingest_key || permit.id);
      externalIdMap.set(key, existing);
    }

    const project = String(permit.project_title || '').trim().toLowerCase();
    const location = String(permit.location || '').trim().toLowerCase();
    if (project && location) {
      const key = `${project}::${location}`;
      const existing = projectLocationMap.get(key) || [];
      existing.push(permit.ingest_key || permit.id);
      projectLocationMap.set(key, existing);
    }
  }

  const duplicateExternalIds = [...externalIdMap.entries()]
    .filter(([, values]) => values.length > 1)
    .map(([externalId, permits]) => ({ externalId, permits }));

  const duplicateProjectLocations = [...projectLocationMap.entries()]
    .filter(([, values]) => values.length > 1)
    .map(([projectLocationKey, permits]) => ({ projectLocationKey, permits }));

  return {
    duplicateExternalIds,
    duplicateProjectLocations,
  };
}

function summarizeIngestionHealth({
  sources,
  ingestedPermits,
  ingestionRuns,
  now = new Date(),
}) {
  const sourceList = Array.isArray(sources) ? sources : [];
  const permits = Array.isArray(ingestedPermits) ? ingestedPermits : [];
  const runs = Array.isArray(ingestionRuns) ? ingestionRuns : [];

  const sourceHealth = sourceList.map((source) => {
    const relevantRuns = runs
      .filter((run) => Array.isArray(run.source_keys) && run.source_keys.includes(source.key))
      .sort((a, b) => new Date(b.started_at || 0) - new Date(a.started_at || 0));

    const lastRun = relevantRuns[0] || null;
    const lastRunAt = parseDate(lastRun?.completed_at || lastRun?.started_at);
    const pollHours = Math.max(1, Number(source.poll_interval_hours) || 24);
    const staleThresholdHours = pollHours * 2;
    const ageHours = lastRunAt ? hoursBetween(now, lastRunAt) : null;
    const stale = source.enabled !== false && (ageHours === null || ageHours > staleThresholdHours);

    const runSourceResult = lastRun?.source_results?.find((result) => result.sourceKey === source.key) || null;
    const lastErrorCount = Number(runSourceResult?.errors || 0);

    return {
      sourceKey: source.key,
      sourceName: source.name || source.key,
      enabled: source.enabled !== false,
      pollIntervalHours: pollHours,
      staleThresholdHours,
      lastRunAt: lastRunAt ? lastRunAt.toISOString() : null,
      ageHours: ageHours === null ? null : Number(ageHours.toFixed(2)),
      stale,
      lastRunErrors: lastErrorCount,
      lastRunFetched: Number(runSourceResult?.fetched || 0),
      lastRunInserted: Number(runSourceResult?.inserted || 0),
      lastRunUpdated: Number(runSourceResult?.updated || 0),
    };
  });

  const staleSources = sourceHealth.filter((source) => source.stale);
  const statusBreakdown = permits.reduce((acc, permit) => {
    const key = String(permit.status || 'Unknown');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const duplicates = buildDuplicateStats(permits);

  return {
    summary: {
      totalSources: sourceList.length,
      enabledSources: sourceHealth.filter((source) => source.enabled).length,
      staleSources: staleSources.length,
      ingestedPermitCount: permits.length,
      totalRuns: runs.length,
    },
    statusBreakdown,
    staleSourceKeys: staleSources.map((source) => source.sourceKey),
    sourceHealth,
    duplicates,
  };
}

module.exports = {
  summarizeIngestionHealth,
};
