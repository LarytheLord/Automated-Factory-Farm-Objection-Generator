const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');

// Vercel serverless has a read-only filesystem — skip all writes.
const isReadOnly = Boolean(process.env.VERCEL);

function ensureDataDir() {
  if (isReadOnly) return;
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function ensureFile(filePath, defaultValue) {
  if (isReadOnly) return;
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
  }
}

function readArrayFile(fileName) {
  ensureDataDir();
  const filePath = path.join(dataDir, fileName);
  ensureFile(filePath, []);
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeArrayFile(fileName, data) {
  if (isReadOnly) return;
  ensureDataDir();
  const filePath = path.join(dataDir, fileName);
  const tmpPath = `${filePath}.tmp`;
  const safeData = Array.isArray(data) ? data : [];

  fs.writeFileSync(tmpPath, JSON.stringify(safeData, null, 2));
  fs.renameSync(tmpPath, filePath);
}

function readJsonFile(fileName, defaultValue) {
  ensureDataDir();
  const filePath = path.join(dataDir, fileName);
  ensureFile(filePath, defaultValue);
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

function writeJsonFile(fileName, data) {
  if (isReadOnly) return;
  ensureDataDir();
  const filePath = path.join(dataDir, fileName);
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
  fs.renameSync(tmpPath, filePath);
}

function nextId(items) {
  const maxId = items.reduce((max, item) => {
    const value = Number(item?.id);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);
  return maxId + 1;
}

module.exports = {
  readArrayFile,
  writeArrayFile,
  readJsonFile,
  writeJsonFile,
  nextId,
};
