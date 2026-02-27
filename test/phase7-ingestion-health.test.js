const { summarizeIngestionHealth } = require('../backend/ingestionHealth');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run() {
  const now = new Date('2026-02-18T12:00:00Z');

  const sources = [
    { key: 'demo', name: 'Demo', enabled: true, poll_interval_hours: 24 },
    { key: 'nc_deq_application_tracker', name: 'NC DEQ', enabled: true, poll_interval_hours: 12 },
    { key: 'disabled_source', name: 'Disabled Source', enabled: false, poll_interval_hours: 12 },
  ];

  const ingestedPermits = [
    {
      ingest_key: 'demo:p1',
      external_id: 'X-1',
      project_title: 'Permit A',
      location: 'Loc 1',
      status: 'Pending',
    },
    {
      ingest_key: 'nc:p2',
      external_id: 'X-1',
      project_title: 'Permit B',
      location: 'Loc 2',
      status: 'Approved',
    },
    {
      ingest_key: 'nc:p3',
      external_id: 'Y-1',
      project_title: 'Permit A',
      location: 'Loc 1',
      status: 'Rejected',
    },
  ];

  const ingestionRuns = [
    {
      id: 'run-1',
      started_at: '2026-02-18T05:00:00Z',
      completed_at: '2026-02-18T05:05:00Z',
      source_keys: ['demo'],
      source_results: [
        {
          sourceKey: 'demo',
          fetched: 3,
          inserted: 1,
          updated: 2,
          errors: 0,
        },
      ],
    },
    {
      id: 'run-2',
      started_at: '2026-02-16T00:00:00Z',
      completed_at: '2026-02-16T00:01:00Z',
      source_keys: ['nc_deq_application_tracker'],
      source_results: [
        {
          sourceKey: 'nc_deq_application_tracker',
          fetched: 10,
          inserted: 2,
          updated: 8,
          errors: 1,
        },
      ],
    },
  ];

  const health = summarizeIngestionHealth({
    sources,
    ingestedPermits,
    ingestionRuns,
    now,
  });

  assert(health.summary.totalSources === 3, 'totalSources mismatch');
  assert(health.summary.enabledSources === 2, 'enabledSources mismatch');
  assert(health.summary.staleSources === 1, 'stale source count mismatch');
  assert(health.statusBreakdown.Pending === 1, 'status breakdown pending mismatch');
  assert(health.statusBreakdown.Approved === 1, 'status breakdown approved mismatch');
  assert(health.duplicates.duplicateExternalIds.length === 1, 'duplicate external id detection mismatch');
  assert(health.duplicates.duplicateProjectLocations.length === 1, 'duplicate project/location detection mismatch');
  assert(health.staleSourceKeys.includes('nc_deq_application_tracker'), 'stale source key missing');

  console.log('phase7 ingestion health tests passed');
}

run();
