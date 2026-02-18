#!/usr/bin/env node
const path = require('path');
const { readArrayFile } = require('../dataStore');
const { previewPermitSource } = require('../permitIngestion');

function parseArgs(argv) {
  const args = {
    includeDisabled: false,
    sourceKey: null,
    sampleLimit: 3,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === '--include-disabled') {
      args.includeDisabled = true;
    } else if (value === '--source' && argv[i + 1]) {
      args.sourceKey = argv[i + 1];
      i += 1;
    } else if (value === '--sample-limit' && argv[i + 1]) {
      const parsed = Number.parseInt(argv[i + 1], 10);
      args.sampleLimit = Number.isFinite(parsed) ? parsed : 3;
      i += 1;
    }
  }

  return args;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const sources = readArrayFile('permit-sources.json');

  let selected = sources;
  if (!args.includeDisabled) {
    selected = selected.filter((source) => source.enabled !== false);
  }
  if (args.sourceKey) {
    selected = selected.filter((source) => source.key === args.sourceKey);
  }

  if (selected.length === 0) {
    console.log('No permit sources matched the selection.');
    process.exit(0);
  }

  const baseDir = path.resolve(__dirname, '..');
  let hadFailure = false;

  for (const source of selected) {
    try {
      const preview = await previewPermitSource({
        source,
        baseDir,
        sampleLimit: args.sampleLimit,
      });

      console.log(`\n[OK] ${preview.sourceKey}`);
      console.log(` fetched=${preview.fetched} normalized=${preview.normalized} errors=${preview.errors}`);
      console.log(` statusBreakdown=${JSON.stringify(preview.statusBreakdown)}`);
      if (preview.samples.length > 0) {
        const sample = preview.samples[0];
        console.log(` sample=${sample.project_title} | ${sample.country} | ${sample.status}`);
      }
    } catch (error) {
      hadFailure = true;
      console.log(`\n[FAIL] ${source.key}`);
      console.log(` reason=${error.message}`);
    }
  }

  if (hadFailure) process.exit(1);
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
