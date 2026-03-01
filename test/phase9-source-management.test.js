const fs = require('fs');
const os = require('os');
const path = require('path');

const { previewPermitSource } = require('../backend/permitIngestion');
const { applySourcePatch } = require('../backend/permitSourceConfig');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function run() {
  const source = {
    key: 'demo_source',
    name: 'Demo Source',
    type: 'local_file',
    path: './demo.json',
    enabled: true,
    poll_interval_hours: 24,
  };

  const patched = applySourcePatch(source, {
    enabled: false,
    poll_interval_hours: 12,
    timeout_ms: 9000,
  });

  assert(patched.enabled === false, 'applySourcePatch did not update enabled');
  assert(patched.poll_interval_hours === 12, 'applySourcePatch did not update poll interval');
  assert(patched.timeout_ms === 9000, 'applySourcePatch did not update timeout');

  let invalidTypeError = null;
  try {
    applySourcePatch(source, { type: 'xml_feed' });
  } catch (error) {
    invalidTypeError = error;
  }
  assert(invalidTypeError, 'invalid type should throw');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'op-preview-'));
  const sourceFile = path.join(tempDir, 'demo.json');
  fs.writeFileSync(
    sourceFile,
    JSON.stringify(
      [
        {
          external_id: 'A1',
          project_title: 'Permit One',
          location: 'Loc One',
          country: 'United States',
          activity: 'Animal Operations',
          status: 'In Process',
        },
        {
          external_id: 'A2',
          project_title: 'Permit Two',
          location: 'Loc Two',
          country: 'United States',
          activity: 'Animal Operations',
          status: 'Permit Issued',
        },
      ],
      null,
      2
    )
  );

  const preview = await previewPermitSource({
    source: {
      key: 'demo_preview',
      name: 'Demo Preview',
      type: 'local_file',
      path: './demo.json',
      defaults: { country: 'United States' },
    },
    baseDir: tempDir,
    sampleLimit: 1,
    now: new Date('2026-02-18T12:00:00Z'),
  });

  assert(preview.fetched === 2, 'preview fetched count mismatch');
  assert(preview.normalized === 2, 'preview normalized count mismatch');
  assert(preview.statusBreakdown.Pending === 1, 'preview pending status count mismatch');
  assert(preview.statusBreakdown.Approved === 1, 'preview approved status count mismatch');
  assert(preview.samples.length === 1, 'preview sample limit mismatch');

  fs.rmSync(tempDir, { recursive: true, force: true });

  console.log('phase9 source management tests passed');
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
