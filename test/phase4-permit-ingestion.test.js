const fs = require('fs');
const path = require('path');
const os = require('os');

const { syncPermitSources } = require('../backend/permitIngestion');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

async function run() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'affog-ingestion-'));
  const sourceFile = path.join(tempDir, 'demo-source.json');

  const firstBatch = [
    {
      external_id: 'permit-001',
      project_title: 'North Valley Hog Expansion',
      location: 'Iowa, USA',
      country: 'United States',
      activity: 'Swine CAFO Expansion',
      status: 'Pending',
      category: 'Red',
      source_url: 'https://example.org/p/1',
    },
    {
      external_id: 'permit-002',
      project_title: 'Wye Poultry Cluster',
      location: 'Herefordshire, UK',
      country: 'United Kingdom',
      activity: 'Poultry Unit',
      status: 'Approved',
      category: 'Orange',
      source_url: 'https://example.org/p/2',
    },
  ];

  writeJson(sourceFile, firstBatch);

  const sources = [
    {
      key: 'test_feed',
      name: 'Test Feed',
      type: 'local_file',
      path: './demo-source.json',
      enabled: true,
    },
  ];

  const ingestedPermits = [];
  const statusHistory = [];
  const ingestionRuns = [];

  const first = await syncPermitSources({
    sources,
    ingestedPermits,
    statusHistory,
    ingestionRuns,
    baseDir: tempDir,
    now: new Date('2026-02-18T08:00:00Z'),
  });

  assert(first.run.inserted === 2, 'first sync should insert 2 permits');
  assert(first.run.updated === 0, 'first sync should not update permits');
  assert(ingestedPermits.length === 2, 'ingested permit store should have 2 records');
  assert(statusHistory.length === 0, 'status history should be empty on initial import');

  const secondBatch = [
    {
      external_id: 'permit-001',
      project_title: 'North Valley Hog Expansion',
      location: 'Iowa, USA',
      country: 'United States',
      activity: 'Swine CAFO Expansion',
      status: 'Approved',
      category: 'Red',
      source_url: 'https://example.org/p/1',
    },
    {
      external_id: 'permit-003',
      project_title: 'Punjab Dairy Block',
      location: 'Punjab, India',
      country: 'India',
      activity: 'Dairy Facility',
      status: 'Pending',
      category: 'Orange',
      source_url: 'https://example.org/p/3',
    },
  ];

  writeJson(sourceFile, secondBatch);

  const second = await syncPermitSources({
    sources,
    ingestedPermits,
    statusHistory,
    ingestionRuns,
    baseDir: tempDir,
    now: new Date('2026-02-18T09:00:00Z'),
  });

  assert(second.run.inserted === 1, 'second sync should insert exactly one new permit');
  assert(second.run.updated === 1, 'second sync should update one existing permit');
  assert(second.run.status_changed === 1, 'second sync should detect one status change');
  assert(ingestedPermits.length === 3, 'ingested permit store should have 3 records after second sync');
  assert(statusHistory.length === 1, 'status history should have one status change event');
  assert(statusHistory[0].previous_status === 'Pending', 'status history previous_status mismatch');
  assert(statusHistory[0].new_status === 'Approved', 'status history new_status mismatch');

  let missingSourceError = null;
  try {
    await syncPermitSources({
      sources,
      sourceKey: 'missing_source',
      ingestedPermits,
      statusHistory,
      ingestionRuns,
      baseDir: tempDir,
    });
  } catch (error) {
    missingSourceError = error;
  }

  assert(missingSourceError, 'sync with missing source should throw');
  assert(/Source not found/.test(missingSourceError.message), 'missing source error message mismatch');

  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log('phase4 permit ingestion tests passed');
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
