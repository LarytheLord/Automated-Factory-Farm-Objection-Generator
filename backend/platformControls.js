const DEFAULT_PLATFORM_CONFIG = {
  signupEnabled: true,
  letterGenerationEnabled: true,
  emailSendingEnabled: true,
  quotaEnforcementEnabled: true,
};

function normalizeBoolean(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return fallback;
}

function sanitizePlatformConfig(raw = {}) {
  return {
    signupEnabled: normalizeBoolean(raw.signupEnabled, DEFAULT_PLATFORM_CONFIG.signupEnabled),
    letterGenerationEnabled: normalizeBoolean(raw.letterGenerationEnabled, DEFAULT_PLATFORM_CONFIG.letterGenerationEnabled),
    emailSendingEnabled: normalizeBoolean(raw.emailSendingEnabled, DEFAULT_PLATFORM_CONFIG.emailSendingEnabled),
    quotaEnforcementEnabled: normalizeBoolean(raw.quotaEnforcementEnabled, DEFAULT_PLATFORM_CONFIG.quotaEnforcementEnabled),
  };
}

function applyPlatformPatch(current, patch = {}) {
  const next = { ...current };
  for (const key of Object.keys(DEFAULT_PLATFORM_CONFIG)) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      next[key] = normalizeBoolean(patch[key], current[key]);
    }
  }
  return sanitizePlatformConfig(next);
}

module.exports = {
  DEFAULT_PLATFORM_CONFIG,
  sanitizePlatformConfig,
  applyPlatformPatch,
};
