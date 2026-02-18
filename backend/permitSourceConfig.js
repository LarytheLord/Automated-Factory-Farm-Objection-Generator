function normalizeText(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function toPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}

function sanitizeSourcePatch(input) {
  const patch = input && typeof input === 'object' ? input : {};
  const sanitized = {};
  const allowedTypes = new Set(['local_file', 'arcgis_mapserver', 'json_url']);

  if ('name' in patch) sanitized.name = normalizeText(patch.name);
  if ('country' in patch) sanitized.country = normalizeText(patch.country);
  if ('enabled' in patch) sanitized.enabled = Boolean(patch.enabled);
  if ('poll_interval_hours' in patch) {
    sanitized.poll_interval_hours = toPositiveInteger(patch.poll_interval_hours, 24);
  }
  if ('type' in patch) {
    const type = normalizeText(patch.type);
    if (!allowedTypes.has(type)) {
      throw new Error('Invalid source type');
    }
    sanitized.type = type;
  }

  if ('path' in patch) sanitized.path = normalizeText(patch.path);
  if ('url' in patch) sanitized.url = normalizeText(patch.url);
  if ('records_path' in patch) sanitized.records_path = normalizeText(patch.records_path);
  if ('transform' in patch) sanitized.transform = normalizeText(patch.transform);

  if ('query' in patch) {
    if (patch.query && typeof patch.query === 'object' && !Array.isArray(patch.query)) {
      sanitized.query = patch.query;
    } else {
      throw new Error('query must be an object');
    }
  }

  if ('field_map' in patch) {
    if (patch.field_map && typeof patch.field_map === 'object' && !Array.isArray(patch.field_map)) {
      sanitized.field_map = patch.field_map;
    } else {
      throw new Error('field_map must be an object');
    }
  }

  if ('defaults' in patch) {
    if (patch.defaults && typeof patch.defaults === 'object' && !Array.isArray(patch.defaults)) {
      sanitized.defaults = patch.defaults;
    } else {
      throw new Error('defaults must be an object');
    }
  }

  if ('timeout_ms' in patch) {
    const timeout = Number.parseInt(String(patch.timeout_ms), 10);
    if (!Number.isFinite(timeout) || timeout < 1000 || timeout > 120000) {
      throw new Error('timeout_ms must be between 1000 and 120000');
    }
    sanitized.timeout_ms = timeout;
  }

  return sanitized;
}

function applySourcePatch(source, patch) {
  if (!source || typeof source !== 'object') {
    throw new Error('Source is required');
  }
  const sanitizedPatch = sanitizeSourcePatch(patch);
  return {
    ...source,
    ...sanitizedPatch,
  };
}

module.exports = {
  sanitizeSourcePatch,
  applySourcePatch,
};
