#!/usr/bin/env node
const path = require('path');
const { spawn } = require('child_process');

function parseBoolean(value, fallback = false) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return fallback;
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

function runNodeScript(relativePath) {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, relativePath);
    const child = spawn(process.execPath, [scriptPath], {
      cwd: __dirname,
      env: process.env,
      stdio: 'inherit',
    });
    child.on('exit', (code) => {
      if (Number(code) !== 0) {
        console.warn(`⚠️  Optional startup sync failed (${relativePath}, exit=${code}). Continuing server startup.`);
      }
      resolve();
    });
    child.on('error', (error) => {
      console.warn(`⚠️  Optional startup sync failed to launch (${relativePath}): ${error.message}`);
      resolve();
    });
  });
}

async function main() {
  const runGlobal = parseBoolean(process.env.RUN_GLOBAL_PENDING_SYNC_ON_START, false);
  const runUk = parseBoolean(process.env.RUN_UK_PENDING_SYNC_ON_START, false);

  if (runGlobal) {
    console.log('🔄 Running global pending permit sync before server start...');
    await runNodeScript('scripts/sync-global-pending-permits-to-supabase.js');
  } else if (runUk) {
    console.log('🔄 Running UK pending permit sync before server start...');
    await runNodeScript('scripts/sync-uk-pending-permits-to-supabase.js');
  }

  const serverPath = path.join(__dirname, 'server.js');
  const server = spawn(process.execPath, ['--max-old-space-size=512', serverPath], {
    cwd: __dirname,
    env: process.env,
    stdio: 'inherit',
  });

  const forwardSignal = (signal) => {
    if (server.exitCode === null && !server.killed) {
      try {
        server.kill(signal);
      } catch (_error) {
        // ignore
      }
    }
  };

  process.on('SIGINT', () => forwardSignal('SIGINT'));
  process.on('SIGTERM', () => forwardSignal('SIGTERM'));

  server.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(Number.isInteger(code) ? code : 1);
  });
}

main().catch((error) => {
  console.error(`❌ Failed to bootstrap backend: ${error.message}`);
  process.exit(1);
});
