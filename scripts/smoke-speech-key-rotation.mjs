import { existsSync, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const keyPoolPath = path.resolve("apps/api/dist/speech/keyPool.js");
if (!existsSync(keyPoolPath)) {
  throw new Error("Build the API first: npm run build");
}

const rawKeys = [
  "gsk_synthetic_rotation_key_one_do_not_leak_111111111111111111",
  "gsk_synthetic_rotation_key_two_do_not_leak_222222222222222222",
  "gsk_synthetic_rotation_key_three_do_not_leak_333333333333333333"
];
const healthFile = path.join(os.tmpdir(), `dental-speech-key-health-${process.pid}-${Date.now()}.json`);

delete process.env.GROQ_API_KEYS;
delete process.env.GROQ_API_KEY;
for (let index = 1; index <= 20; index += 1) {
  delete process.env[`GROQ_API_KEY_${index}`];
}

process.env.DENTAL_SPEECH_KEY_HEALTH_FILE = healthFile;
process.env.DENTAL_SPEECH_KEY_RETRY_LIMIT = "3";
process.env.DENTAL_SPEECH_PROVIDER_TIMEOUT_MS = "5000";
process.env.DENTAL_SPEECH_RATE_LIMIT_COOLDOWN_MS = "60000";
process.env.DENTAL_SPEECH_ERROR_COOLDOWN_MS = "30000";
process.env.DENTAL_SPEECH_AUTH_COOLDOWN_MS = "600000";
process.env.DENTAL_SPEECH_MAX_NUMBERED_KEYS = "5";
process.env.GROQ_API_KEYS = `${rawKeys[0]},${rawKeys[1]}`;
process.env.GROQ_API_KEY_1 = rawKeys[2];
process.env.GROQ_API_KEY = rawKeys[1];

const {
  SpeechProviderRequestError,
  getProviderKeyCandidates,
  getProviderKeyHealthSnapshots,
  getProviderKeyPoolSummary,
  providerHttpError,
  recordProviderKeyFailure,
  recordProviderKeySuccess,
  sanitizeProviderErrorMessage,
  selectProviderKey,
  shouldTryNextProviderKey
} = await import(pathToFileURL(keyPoolPath).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertNoSecretLeak(text, label) {
  for (const key of rawKeys) {
    assert(!text.includes(key), `${label} leaked raw key material`);
  }
  assert(!text.includes("Authorization: Bearer"), `${label} leaked authorization header`);
  assert(!text.includes("api_key=gsk_"), `${label} leaked query key`);
  assert(!text.includes("sk-abcdefghijklmnopqrstuvwxyz1234567890"), `${label} leaked OpenAI-style key`);
}

try {
  await fs.rm(healthFile, { force: true });

  const candidates = getProviderKeyCandidates("groq_whisper");
  assert(candidates.length === 3, `Expected 3 de-duplicated Groq keys, got ${candidates.length}`);
  assert(new Set(candidates.map((candidate) => candidate.value)).size === 3, "Expected raw key values to be de-duplicated");
  assert(new Set(candidates.map((candidate) => candidate.fingerprint)).size === 3, "Expected unique key fingerprints");

  const initialSummary = getProviderKeyPoolSummary("groq_whisper");
  assert(initialSummary.configuredKeyCount === 3, "Expected configured key count 3");
  assert(initialSummary.availableKeyCount === 3, "Expected all keys available initially");
  assert(initialSummary.coolingDownKeyCount === 0, "Expected no initial cooldowns");
  assert(initialSummary.rotationEnabled === true, "Expected rotation to be enabled for multi-key pool");
  assert(initialSummary.maxAttemptsPerProvider === 3, "Expected retry limit 3");
  assert(initialSummary.timeoutMs === 5000, "Expected provider timeout from env");

  const first = selectProviderKey("groq_whisper");
  assert(first, "Expected first key selection");
  const rateLimitError = providerHttpError(
    429,
    "Too Many Requests",
    `Authorization: Bearer ${first.value} api_key=${rawKeys[1]}`
  );
  assert(shouldTryNextProviderKey(rateLimitError), "Expected 429 to allow key rotation");
  recordProviderKeyFailure("groq_whisper", first, rateLimitError);

  const afterRateLimit = getProviderKeyPoolSummary("groq_whisper");
  assert(afterRateLimit.availableKeyCount === 2, `Expected 2 keys after one cooldown, got ${afterRateLimit.availableKeyCount}`);
  assert(afterRateLimit.coolingDownKeyCount === 1, "Expected one cooling-down key after 429");

  const tried = new Set([first.fingerprint]);
  const second = selectProviderKey("groq_whisper", tried);
  assert(second, "Expected second key selection");
  assert(second.fingerprint !== first.fingerprint, "Expected second selection to avoid tried fingerprint");
  const timeoutError = new SpeechProviderRequestError("Источник распознавания не ответил за 5 сек.", {
    retryable: true,
    timedOut: true
  });
  assert(shouldTryNextProviderKey(timeoutError), "Expected timeout to allow key rotation");
  recordProviderKeyFailure("groq_whisper", second, timeoutError);

  const afterTimeout = getProviderKeyPoolSummary("groq_whisper");
  assert(afterTimeout.availableKeyCount === 1, `Expected 1 available key after two cooldowns, got ${afterTimeout.availableKeyCount}`);
  assert(afterTimeout.coolingDownKeyCount === 2, "Expected two cooling-down keys");

  tried.add(second.fingerprint);
  const third = selectProviderKey("groq_whisper", tried);
  assert(third, "Expected third key selection");
  assert(third.fingerprint !== first.fingerprint && third.fingerprint !== second.fingerprint, "Expected final available key");
  recordProviderKeySuccess("groq_whisper", third);

  const snapshots = getProviderKeyHealthSnapshots("groq_whisper");
  assert(snapshots.length === 3, "Expected one health snapshot per key");
  assert(snapshots.filter((snapshot) => !snapshot.available).length === 2, "Expected two unavailable cooling-down snapshots");
  assert(snapshots.some((snapshot) => snapshot.successes === 1), "Expected one successful key snapshot");
  assert(snapshots.every((snapshot) => !rawKeys.includes(snapshot.fingerprint)), "Fingerprints must not equal raw key values");

  const persisted = await fs.readFile(healthFile, "utf8");
  assertNoSecretLeak(persisted, "persisted health file");
  assert(persisted.includes("groq_whisper:"), "Expected provider fingerprint namespace in persisted health");
  assert(/"cooldownUntil"\s*:\s*[1-9]/.test(persisted), "Expected persisted cooldown timestamp");

  const sanitized = sanitizeProviderErrorMessage(
    "Authorization: Bearer abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 api_key=gsk_synthetic_rotation_key_one_do_not_leak_111111111111111111 sk-abcdefghijklmnopqrstuvwxyz1234567890"
  );
  assertNoSecretLeak(sanitized, "sanitized error");
  assert(sanitized.includes("[redacted]"), "Expected sanitized error to contain redaction marker");

  const result = {
    configured: initialSummary.configuredKeyCount,
    initialAvailable: initialSummary.availableKeyCount,
    afterRateLimitAvailable: afterRateLimit.availableKeyCount,
    afterTimeoutAvailable: afterTimeout.availableKeyCount,
    coolingDown: afterTimeout.coolingDownKeyCount,
    snapshots: snapshots.map((snapshot) => ({
      ordinal: snapshot.ordinal,
      available: snapshot.available,
      failures: snapshot.failures,
      successes: snapshot.successes,
      status: snapshot.lastStatusCode,
      lastError: snapshot.lastError
    })),
    persistedWithoutSecrets: true,
    sanitizedWithoutSecrets: true
  };

  console.log(JSON.stringify(result));
} finally {
  await fs.rm(healthFile, { force: true });
}
