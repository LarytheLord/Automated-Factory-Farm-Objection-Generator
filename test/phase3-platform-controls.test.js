const {
  DEFAULT_PLATFORM_CONFIG,
  sanitizePlatformConfig,
  applyPlatformPatch,
} = require('../backend/platformControls');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run() {
  const sanitized = sanitizePlatformConfig({
    signupEnabled: false,
    letterGenerationEnabled: 'true',
    emailSendingEnabled: 'false',
    quotaEnforcementEnabled: 'not-bool',
  });

  assert(sanitized.signupEnabled === false, 'signupEnabled sanitize failed');
  assert(sanitized.letterGenerationEnabled === true, 'letterGenerationEnabled sanitize failed');
  assert(sanitized.emailSendingEnabled === false, 'emailSendingEnabled sanitize failed');
  assert(sanitized.quotaEnforcementEnabled === DEFAULT_PLATFORM_CONFIG.quotaEnforcementEnabled, 'quota fallback failed');

  const patched = applyPlatformPatch(DEFAULT_PLATFORM_CONFIG, {
    signupEnabled: false,
    quotaEnforcementEnabled: false,
  });

  assert(patched.signupEnabled === false, 'patch signup failed');
  assert(patched.quotaEnforcementEnabled === false, 'patch quota flag failed');
  assert(patched.emailSendingEnabled === true, 'unchanged field unexpectedly modified');

  const noopPatched = applyPlatformPatch(patched, {
    unknownKey: false,
    emailSendingEnabled: 'true',
  });

  assert(noopPatched.emailSendingEnabled === true, 'string true patch failed');
  assert(noopPatched.signupEnabled === false, 'existing value changed unexpectedly');

  console.log('phase3 platform controls tests passed');
}

run();
