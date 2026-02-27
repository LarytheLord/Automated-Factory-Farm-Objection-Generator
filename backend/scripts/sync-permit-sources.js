#!/usr/bin/env node
const path = require('path');
const { readArrayFile, writeArrayFile } = require('../dataStore');
const { syncPermitSources } = require('../permitIngestion');

function parseArgs(argv) {
  const args = {
    sourceKey: null,
    includeDisabled: false,
    remoteOnly: false,
    resetData: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === '--source' && argv[i + 1]) {
      args.sourceKey = argv[i + 1];
      i += 1;
    } else if (value === '--include-disabled') {
      args.includeDisabled = true;
    } else if (value === '--remote-only') {
      args.remoteOnly = true;
    } else if (value === '--reset-data') {
      args.resetData = true;
    }
  }

  return args;
}

function selectSources(sources, args) {
  let selected = sources;
  if (args.sourceKey) {
    selected = selected.filter((source) => source.key === args.sourceKey);
  } else if (!args.includeDisabled) {
    selected = selected.filter((source) => source.enabled !== false);
  }

  if (args.remoteOnly) {
    selected = selected.filter((source) => source.type !== 'local_file');
  }

  return selected;
}

async function syncOneSource(source, stores, baseDir) {
  const { ingestedPermits, statusHistory, runs } = stores;
  const { run } = await syncPermitSources({
    sources: [source],
    sourceKey: source.key,
    ingestedPermits,
    statusHistory,
    ingestionRuns: runs,
    baseDir,
  });
  return run;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));

  const sources = readArrayFile('permit-sources.json');
  const selected = selectSources(sources, args);

  if (selected.length === 0) {
    console.log('No sources matched selection.');
    return;
  }

  const stores = {
    ingestedPermits: args.resetData ? [] : readArrayFile('ingested-permits.json'),
    statusHistory: args.resetData ? [] : readArrayFile('permit-status-history.json'),
    runs: args.resetData ? [] : readArrayFile('ingestion-runs.json'),
  };

  const baseDir = path.resolve(__dirname, '..');

  for (const source of selected) {
    const runSummary = await syncOneSource(source, stores, baseDir);
    console.log(`\n[SYNC] ${source.key}`);
    console.log(` inserted=${runSummary.inserted} updated=${runSummary.updated} status_changed=${runSummary.status_changed} errors=${runSummary.errors}`);
  }

  if (stores.runs.length > 1000) stores.runs = stores.runs.slice(-1000);
  if (stores.statusHistory.length > 5000) stores.statusHistory = stores.statusHistory.slice(-5000);

  writeArrayFile('ingested-permits.json', stores.ingestedPermits);
  writeArrayFile('permit-status-history.json', stores.statusHistory);
  writeArrayFile('ingestion-runs.json', stores.runs);

  console.log('\nSync completed.');
  console.log(`Total ingested permits: ${stores.ingestedPermits.length}`);
  console.log(`Total status history events: ${stores.statusHistory.length}`);
  console.log(`Total ingestion runs: ${stores.runs.length}`);
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
