#!/usr/bin/env node
const path = require('path');
const { readArrayFile, writeArrayFile } = require('../dataStore');
const { syncPermitSources } = require('../permitIngestion');

function parseArgs(argv) {
  const args = {
    sourceKey: null,
    includeDisabled: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === '--source' && argv[i + 1]) {
      args.sourceKey = argv[i + 1];
      i += 1;
    } else if (value === '--include-disabled') {
      args.includeDisabled = true;
    }
  }

  return args;
}

function selectSources(sources, args) {
  if (args.sourceKey) {
    return sources.filter((source) => source.key === args.sourceKey);
  }
  if (args.includeDisabled) return sources;
  return sources.filter((source) => source.enabled !== false);
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
    ingestedPermits: readArrayFile('ingested-permits.json'),
    statusHistory: readArrayFile('permit-status-history.json'),
    runs: readArrayFile('ingestion-runs.json'),
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
