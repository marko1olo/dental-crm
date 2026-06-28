import { createHash, randomInt } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { SpeechGatewayProvider } from "@dental/shared";
import { fetch as undiciFetch, ProxyAgent, Agent, Dispatcher } from "undici";
import { SocksClient } from "socks";
import tls from "node:tls";

let cachedProxyAgent: Dispatcher | null = null;
function getProxyAgent(): Dispatcher | null {
  const proxyUrl = process.env.PROXY_URL || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (!proxyUrl) return null;
  if (!cachedProxyAgent) {
    try {
      if (proxyUrl.startsWith("socks")) {
        const parsed = new URL(proxyUrl);
        const proxyHost = parsed.hostname;
        const proxyPort = Number(parsed.port || 1080);
        const proxyType = proxyUrl.includes("socks4") ? 4 : 5;
        
        cachedProxyAgent = new Agent({
          connect: (opts, callback) => {
            const destPort = opts.port ? Number(opts.port) : (opts.protocol === "https:" ? 443 : 80);
            const destHost = opts.host || "";
            
            SocksClient.createConnection({
              proxy: {
                host: proxyHost,
                port: proxyPort,
                type: proxyType as 4 | 5
              },
              command: "connect",
              destination: {
                host: destHost,
                port: destPort
              }
            }, (err, info) => {
              if (err) {
                callback(err, null);
                return;
              }
              
              if (!info) {
                callback(new Error("SOCKS connection returned no info"), null);
                return;
              }
              
              if (opts.protocol === "https:") {
                const tlsSocket = tls.connect({
                  socket: info.socket,
                  servername: opts.servername || opts.host
                }, () => {
                  callback(null, tlsSocket);
                });
                
                tlsSocket.on("error", (tlsErr) => {
                  callback(tlsErr, null);
                });
              } else {
                callback(null, info.socket);
              }
            });
          }
        });
        console.log(`[Proxy Agent] Created undici SOCKS Agent routing to SOCKS proxy: ${proxyUrl}`);
      } else {
        cachedProxyAgent = new ProxyAgent({ uri: proxyUrl });
        console.log(`[Proxy Agent] Created undici ProxyAgent routing to HTTP/HTTPS proxy: ${proxyUrl}`);
      }
    } catch (err) {
      console.error(`[Proxy Agent] Failed to initialize ProxyAgent for ${proxyUrl}:`, err);
    }
  }
  return cachedProxyAgent;
}

type ProviderKeySpec = {
  singles: string[];
  lists: string[];
  numberedBases: string[];
};

export type SpeechProviderKeyCandidate = {
  value: string;
  fingerprint: string;
  source: string;
  ordinal: number;
};

export type SpeechProviderKeyPoolSummary = {
  configuredKeyCount: number;
  availableKeyCount: number;
  coolingDownKeyCount: number;
  rotationEnabled: boolean;
  maxAttemptsPerProvider: number;
  timeoutMs: number;
  rateLimitCooldownMs: number;
  errorCooldownMs: number;
  authCooldownMs: number;
};

export type SpeechProviderKeyHealthSnapshot = {
  fingerprint: string;
  source: string;
  ordinal: number;
  available: boolean;
  coolingDownUntil: string | null;
  failures: number;
  successes: number;
  lastUsedAt: string | null;
  lastStatusCode: number | null;
  lastError: string | null;
};

type KeyHealth = {
  cooldownUntil: number;
  failures: number;
  successes: number;
  lastUsedAt: number | null;
  lastStatusCode: number | null;
  lastError: string | null;
};

const keyHealthByFingerprint = new Map<string, KeyHealth>();
let keyHealthLoadedFromDisk = false;

type PersistedKeyHealthFile = {
  version: 1;
  savedAt: string;
  health: Record<string, KeyHealth>;
};

const providerKeySpecs: Record<SpeechGatewayProvider, ProviderKeySpec> = {
  none: { singles: [], lists: [], numberedBases: [] },
  browser_speech: { singles: [], lists: [], numberedBases: [] },
  groq_whisper: {
    singles: ["GROQ_API_KEY"],
    lists: ["GROQ_API_KEYS"],
    numberedBases: ["GROQ_API_KEY"]
  },
  openai_transcribe: {
    singles: ["OPENAI_API_KEY"],
    lists: ["OPENAI_API_KEYS"],
    numberedBases: ["OPENAI_API_KEY"]
  },
  deepgram_streaming: {
    singles: ["DEEPGRAM_API_KEY"],
    lists: ["DEEPGRAM_API_KEYS"],
    numberedBases: ["DEEPGRAM_API_KEY"]
  },
  assemblyai_async: {
    singles: ["ASSEMBLYAI_API_KEY"],
    lists: ["ASSEMBLYAI_API_KEYS"],
    numberedBases: ["ASSEMBLYAI_API_KEY"]
  },
  cloudflare_whisper: {
    singles: ["CLOUDFLARE_API_TOKEN"],
    lists: ["CLOUDFLARE_API_TOKENS"],
    numberedBases: ["CLOUDFLARE_API_TOKEN"]
  },
  azure_speech: {
    singles: ["AZURE_SPEECH_KEY"],
    lists: ["AZURE_SPEECH_KEYS"],
    numberedBases: ["AZURE_SPEECH_KEY"]
  },
  google_speech: {
    singles: ["GOOGLE_APPLICATION_CREDENTIALS", "GOOGLE_API_KEY"],
    lists: ["GOOGLE_API_KEYS"],
    numberedBases: ["GOOGLE_API_KEY"]
  },
  huggingface_asr: {
    singles: ["HUGGINGFACE_API_TOKEN", "HF_TOKEN"],
    lists: ["HUGGINGFACE_API_TOKENS", "HF_TOKENS"],
    numberedBases: ["HUGGINGFACE_API_TOKEN", "HF_TOKEN"]
  },
  mobile_native_speech: { singles: [], lists: [], numberedBases: [] },
  local_whisper: { singles: [], lists: [], numberedBases: [] },
  vosk_local: { singles: [], lists: [], numberedBases: [] }
};

function keyHealthFilePath(): string | null {
  const configured = process.env.DENTAL_SPEECH_KEY_HEALTH_FILE?.trim();
  if (configured && configured.toLowerCase() === "off") return null;
  return resolve(configured || ".data/speech-key-health.json");
}

function keyHealthTtlMs(): number {
  return numberFromEnv("DENTAL_SPEECH_KEY_HEALTH_TTL_MS", 30 * 24 * 60 * 60 * 1000);
}

function isPersistedHealthKey(value: string): boolean {
  return /^[a-z0-9_]+:[a-f0-9]{12}$/i.test(value);
}

function normalizePersistedHealth(value: unknown): KeyHealth | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<KeyHealth>;
  const cooldownUntil = Number(candidate.cooldownUntil ?? 0);
  const failures = Number(candidate.failures ?? 0);
  const successes = Number(candidate.successes ?? 0);
  const lastUsedAt = candidate.lastUsedAt === null || candidate.lastUsedAt === undefined ? null : Number(candidate.lastUsedAt);
  const lastStatusCode =
    candidate.lastStatusCode === null || candidate.lastStatusCode === undefined ? null : Number(candidate.lastStatusCode);
  if (!Number.isFinite(cooldownUntil) || !Number.isFinite(failures) || !Number.isFinite(successes)) return null;
  if (lastUsedAt !== null && !Number.isFinite(lastUsedAt)) return null;
  if (lastStatusCode !== null && !Number.isFinite(lastStatusCode)) return null;
  return {
    cooldownUntil: Math.max(0, Math.floor(cooldownUntil)),
    failures: Math.max(0, Math.floor(failures)),
    successes: Math.max(0, Math.floor(successes)),
    lastUsedAt: lastUsedAt === null ? null : Math.max(0, Math.floor(lastUsedAt)),
    lastStatusCode: lastStatusCode === null ? null : Math.max(0, Math.floor(lastStatusCode)),
    lastError: candidate.lastError ? sanitizeProviderErrorMessage(String(candidate.lastError)) : null
  };
}

function pruneKeyHealth(now = Date.now()): void {
  const ttlMs = keyHealthTtlMs();
  for (const [key, health] of keyHealthByFingerprint.entries()) {
    const lastUsedAt = health.lastUsedAt ?? 0;
    if (health.cooldownUntil <= now && lastUsedAt > 0 && now - lastUsedAt > ttlMs) {
      keyHealthByFingerprint.delete(key);
    }
  }
}

function loadKeyHealthFromDisk(): void {
  if (keyHealthLoadedFromDisk) return;
  keyHealthLoadedFromDisk = true;
  const filePath = keyHealthFilePath();
  if (!filePath || !existsSync(filePath)) return;
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as Partial<PersistedKeyHealthFile>;
    const health = parsed.health && typeof parsed.health === "object" ? parsed.health : {};
    for (const [key, value] of Object.entries(health)) {
      if (!isPersistedHealthKey(key)) continue;
      const normalized = normalizePersistedHealth(value);
      if (normalized) keyHealthByFingerprint.set(key, normalized);
    }
    pruneKeyHealth();
  } catch {
    keyHealthByFingerprint.clear();
  }
}

function saveKeyHealthToDisk(): void {
  loadKeyHealthFromDisk();
  const filePath = keyHealthFilePath();
  if (!filePath) return;
  try {
    pruneKeyHealth();
    mkdirSync(dirname(filePath), { recursive: true });
    const payload: PersistedKeyHealthFile = {
      version: 1,
      savedAt: new Date().toISOString(),
      health: Object.fromEntries([...keyHealthByFingerprint.entries()].sort(([left], [right]) => left.localeCompare(right)))
    };
    writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  } catch {
    // Key cooldown persistence is a safety cache; request handling must keep working if disk is read-only.
  }
}

export class SpeechProviderRequestError extends Error {
  statusCode: number | null;
  retryable: boolean;
  rateLimited: boolean;
  timedOut: boolean;

  constructor(
    message: string,
    options: {
      statusCode?: number | null;
      retryable?: boolean;
      rateLimited?: boolean;
      timedOut?: boolean;
    } = {}
  ) {
    super(sanitizeProviderErrorMessage(message));
    this.name = "SpeechProviderRequestError";
    this.statusCode = options.statusCode ?? null;
    this.retryable = Boolean(options.retryable);
    this.rateLimited = Boolean(options.rateLimited);
    this.timedOut = Boolean(options.timedOut);
  }
}

export function numberFromEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export function speechProviderTimeoutMs(): number {
  return numberFromEnv("DENTAL_SPEECH_PROVIDER_TIMEOUT_MS", 45_000);
}

function rateLimitCooldownMs(): number {
  return numberFromEnv("DENTAL_SPEECH_RATE_LIMIT_COOLDOWN_MS", 60_000);
}

function errorCooldownMs(): number {
  return numberFromEnv("DENTAL_SPEECH_ERROR_COOLDOWN_MS", 30_000);
}

function authCooldownMs(): number {
  return numberFromEnv("DENTAL_SPEECH_AUTH_COOLDOWN_MS", 600_000);
}

function maxNumberedKeys(): number {
  return Math.max(1, Math.min(numberFromEnv("DENTAL_SPEECH_MAX_NUMBERED_KEYS", 20), 100));
}

function splitKeyList(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(/[\n\r,;]+/)
    .map((item) => item.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

function fingerprintSecret(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function healthKey(providerId: SpeechGatewayProvider, candidate: Pick<SpeechProviderKeyCandidate, "fingerprint">): string {
  return `${providerId}:${candidate.fingerprint}`;
}

function healthFor(providerId: SpeechGatewayProvider, candidate: Pick<SpeechProviderKeyCandidate, "fingerprint">): KeyHealth {
  loadKeyHealthFromDisk();
  return (
    keyHealthByFingerprint.get(healthKey(providerId, candidate)) ?? {
      cooldownUntil: 0,
      failures: 0,
      successes: 0,
      lastUsedAt: null,
      lastStatusCode: null,
      lastError: null
    }
  );
}

function isLikelyTransientProviderError(error: unknown): boolean {
  const message = sanitizeProviderErrorMessage(error instanceof Error ? error.message : String(error ?? "")).toLowerCase();
  return /fetch failed|network|econnreset|econnrefused|etimedout|timeout|socket|terminated|temporar|dns|enotfound/.test(message);
}

export function getProviderKeyCandidates(providerId: SpeechGatewayProvider): SpeechProviderKeyCandidate[] {
  const spec = providerKeySpecs[providerId];
  const values: Array<{ value: string; source: string }> = [];

  for (const envName of spec.lists) {
    splitKeyList(process.env[envName]).forEach((value, index) => {
      values.push({ value, source: `${envName}[${index + 1}]` });
    });
  }

  for (const baseName of spec.numberedBases) {
    for (let index = 1; index <= maxNumberedKeys(); index += 1) {
      const value = process.env[`${baseName}_${index}`]?.trim();
      if (value) values.push({ value, source: `${baseName}_${index}` });
    }
  }

  for (const envName of spec.singles) {
    const value = process.env[envName]?.trim();
    if (value) values.push({ value, source: envName });
  }

  const seen = new Set<string>();
  return values
    .filter((candidate) => {
      if (seen.has(candidate.value)) return false;
      seen.add(candidate.value);
      return true;
    })
    .map((candidate, index) => ({
      ...candidate,
      fingerprint: fingerprintSecret(candidate.value),
      ordinal: index + 1
    }));
}

export function getProviderAcceptedKeyEnvVars(providerId: SpeechGatewayProvider): string[] {
  const spec = providerKeySpecs[providerId];
  return [
    ...spec.lists,
    ...spec.numberedBases.map((baseName) => `${baseName}_1..N`),
    ...spec.singles
  ].filter((envName, index, envNames) => envNames.indexOf(envName) === index);
}

export function providerKeyCount(providerId: SpeechGatewayProvider): number {
  return getProviderKeyCandidates(providerId).length;
}

export function keyRetryLimit(providerId: SpeechGatewayProvider): number {
  const configuredKeyCount = providerKeyCount(providerId);
  if (!configuredKeyCount) return 0;
  const requested = numberFromEnv("DENTAL_SPEECH_KEY_RETRY_LIMIT", Math.min(3, configuredKeyCount));
  return Math.max(1, Math.min(requested, configuredKeyCount));
}

export function getProviderKeyPoolSummary(providerId: SpeechGatewayProvider): SpeechProviderKeyPoolSummary {
  const candidates = getProviderKeyCandidates(providerId);
  const now = Date.now();
  const coolingDownKeyCount = candidates.filter((candidate) => healthFor(providerId, candidate).cooldownUntil > now).length;

  return {
    configuredKeyCount: candidates.length,
    availableKeyCount: Math.max(0, candidates.length - coolingDownKeyCount),
    coolingDownKeyCount,
    rotationEnabled: candidates.length > 1,
    maxAttemptsPerProvider: keyRetryLimit(providerId),
    timeoutMs: speechProviderTimeoutMs(),
    rateLimitCooldownMs: rateLimitCooldownMs(),
    errorCooldownMs: errorCooldownMs(),
    authCooldownMs: authCooldownMs()
  };
}

export function getProviderKeyHealthSnapshots(providerId: SpeechGatewayProvider): SpeechProviderKeyHealthSnapshot[] {
  const now = Date.now();
  return getProviderKeyCandidates(providerId).map((candidate) => {
    const health = healthFor(providerId, candidate);
    const coolingDown = health.cooldownUntil > now;
    return {
      fingerprint: candidate.fingerprint,
      source: candidate.source,
      ordinal: candidate.ordinal,
      available: !coolingDown,
      coolingDownUntil: coolingDown ? new Date(health.cooldownUntil).toISOString() : null,
      failures: health.failures,
      successes: health.successes,
      lastUsedAt: health.lastUsedAt ? new Date(health.lastUsedAt).toISOString() : null,
      lastStatusCode: health.lastStatusCode,
      lastError: health.lastError
    };
  });
}

export function selectProviderKey(
  providerId: SpeechGatewayProvider,
  triedFingerprints: Set<string> = new Set<string>()
): SpeechProviderKeyCandidate | null {
  const now = Date.now();
  const candidates = getProviderKeyCandidates(providerId).filter((candidate) => {
    const health = healthFor(providerId, candidate);
    return health.cooldownUntil <= now && !triedFingerprints.has(candidate.fingerprint);
  });
  if (!candidates.length) return null;
  return candidates[randomInt(candidates.length)] ?? null;
}

export function recordProviderKeySuccess(providerId: SpeechGatewayProvider, candidate: SpeechProviderKeyCandidate): void {
  const previous = healthFor(providerId, candidate);
  keyHealthByFingerprint.set(healthKey(providerId, candidate), {
    cooldownUntil: 0,
    failures: 0,
    successes: previous.successes + 1,
    lastUsedAt: Date.now(),
    lastStatusCode: null,
    lastError: null
  });
  saveKeyHealthToDisk();
}

export function recordProviderKeyFailure(
  providerId: SpeechGatewayProvider,
  candidate: SpeechProviderKeyCandidate,
  error: unknown
): void {
  const previous = healthFor(providerId, candidate);
  const requestError = error instanceof SpeechProviderRequestError ? error : null;
  const statusCode = requestError?.statusCode ?? null;
  let cooldownMs = 0;

  if (requestError?.rateLimited || statusCode === 429) {
    cooldownMs = rateLimitCooldownMs();
  } else if (statusCode === 401 || statusCode === 403) {
    cooldownMs = authCooldownMs();
  } else if (requestError?.timedOut || requestError?.retryable || (statusCode !== null && statusCode >= 500)) {
    cooldownMs = errorCooldownMs();
  } else if (isLikelyTransientProviderError(error)) {
    cooldownMs = errorCooldownMs();
  }

  keyHealthByFingerprint.set(healthKey(providerId, candidate), {
    cooldownUntil: cooldownMs > 0 ? Date.now() + cooldownMs : previous.cooldownUntil,
    failures: previous.failures + 1,
    successes: previous.successes,
    lastUsedAt: Date.now(),
    lastStatusCode: statusCode,
    lastError: sanitizeProviderErrorMessage(error instanceof Error ? error.message : "unknown provider error")
  });
  saveKeyHealthToDisk();
}

export function shouldTryNextProviderKey(error: unknown): boolean {
  if (!(error instanceof SpeechProviderRequestError)) return isLikelyTransientProviderError(error);
  if (error.rateLimited || error.timedOut || error.retryable) return true;
  return error.statusCode === 401 || error.statusCode === 403;
}

export function providerHttpError(statusCode: number, statusText: string, message?: string): SpeechProviderRequestError {
  const rateLimited = statusCode === 429;
  const retryable = rateLimited || statusCode === 408 || statusCode >= 500 || statusCode === 401 || statusCode === 403;
  const detail = sanitizeProviderErrorMessage(message || `${statusCode} ${statusText}`);
  return new SpeechProviderRequestError(detail, { statusCode, retryable, rateLimited });
}

export async function fetchWithProviderTimeout(
  input: Parameters<typeof fetch>[0],
  init: Parameters<typeof fetch>[1] = {},
  timeoutMs = speechProviderTimeoutMs()
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const dispatcher = getProxyAgent();
  try {
    return await undiciFetch(input as any, {
      ...init,
      signal: controller.signal,
      dispatcher: dispatcher || undefined
    } as any) as any;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new SpeechProviderRequestError(`Источник распознавания не ответил за ${Math.round(timeoutMs / 1000)} сек.`, {
        retryable: true,
        timedOut: true
      });
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function sanitizeProviderErrorMessage(message: string): string {
  return message
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .replace(/Token\s+[A-Za-z0-9._-]+/gi, "Token [redacted]")
    .replace(/Authorization\s*:\s*[^\s,;]+(?:\s+[^\s,;]+)?/gi, "Authorization: [redacted]")
    .replace(/([?&](?:api[_-]?key|key|token|access[_-]?token)=)[^&\s]+/gi, "$1[redacted]")
    .replace(/\b(api[_-]?key|token|secret|password)\s*[:=]\s*[A-Za-z0-9._~+/-]{12,}/gi, "$1=[redacted]")
    .replace(/sk-[A-Za-z0-9_-]{16,}/g, "sk-[redacted]")
    .replace(/[A-Za-z0-9_-]{48,}/g, "[redacted]")
    .slice(0, 240);
}
