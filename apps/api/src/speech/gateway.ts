import type {
  DentalSpecialty,
  SpeechChunkUploadInput,
  SpeechGatewayProvider,
  SpeechGatewayHealthReport,
  SpeechGatewayStatus,
  SpeechProviderHealthLevel,
  SpeechRecordingStrategy,
  SpeechRecordingStrategyRequest,
  SpeechProviderRuntimeStatus,
  SpeechProviderKind,
  SpeechTranscriptionQuality,
  SpeechTranscriptionStatus,
  SpeechTranscriptionResponse
} from "@dental/shared";
import { recordSpeechTranscriptionChunk, speechProviders } from "../sampleData.js";
import { buildDentalSttPrompt, getDentalSttPromptPolicy } from "./dentalPrompt.js";
import {
  fetchWithProviderTimeout,
  getProviderAcceptedKeyEnvVars,
  getProviderKeyHealthSnapshots,
  getProviderKeyPoolSummary,
  keyRetryLimit,
  numberFromEnv,
  providerHttpError,
  providerKeyCount,
  recordProviderKeyFailure,
  recordProviderKeySuccess,
  sanitizeProviderErrorMessage,
  selectProviderKey,
  SpeechProviderRequestError,
  shouldTryNextProviderKey
} from "./keyPool.js";
import { getSpeechPolishPolicy } from "./polish.js";

type ProviderTranscript = {
  text: string;
  confidence: number | null;
  warnings: string[];
};

export class SpeechChunkPayloadError extends Error {
  readonly statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = "SpeechChunkPayloadError";
  }
}

const wiredServerProviders: SpeechProviderKind[] = [
  "groq_whisper",
  "openai_transcribe",
  "deepgram_streaming",
  "assemblyai_async",
  "cloudflare_whisper"
];
const localSpeechProviders: SpeechProviderKind[] = ["local_whisper", "vosk_local"];

type LocalSpeechBridgeProbeStatus = "unknown" | "ready" | "unreachable" | "blocked" | "misconfigured";

type LocalSpeechBridgeProbeState = {
  status: LocalSpeechBridgeProbeStatus;
  checkedAt: number | null;
  latencyMs: number | null;
  urlRedacted: string | null;
  warning: string | null;
  pending: Promise<void> | null;
};

const providerLabels: Record<SpeechGatewayProvider, string> = {
  none: "Не настроен",
  browser_speech: "Браузерная диктовка",
  groq_whisper: "Groq Whisper",
  openai_transcribe: "OpenAI Transcribe",
  deepgram_streaming: "Deepgram",
  assemblyai_async: "AssemblyAI",
  cloudflare_whisper: "Cloudflare Workers AI Whisper",
  azure_speech: "Azure AI Speech",
  google_speech: "Google Cloud Speech-to-Text",
  huggingface_asr: "Hugging Face распознавание",
  mobile_native_speech: "Мобильная диктовка",
  local_whisper: "Локальный Whisper.cpp",
  vosk_local: "Vosk Local"
};

const providerAliases: Record<string, SpeechGatewayProvider> = {
  browser: "browser_speech",
  groq: "groq_whisper",
  openai: "openai_transcribe",
  deepgram: "deepgram_streaming",
  assemblyai: "assemblyai_async",
  cloudflare: "cloudflare_whisper",
  azure: "azure_speech",
  google: "google_speech",
  huggingface: "huggingface_asr",
  hf: "huggingface_asr",
  mobile: "mobile_native_speech",
  native: "mobile_native_speech",
  local: "local_whisper",
  whisper: "local_whisper",
  vosk: "vosk_local"
};

function selectedProvider(): SpeechGatewayProvider {
  const rawProvider = (process.env.DENTAL_SPEECH_PROVIDER ?? "").trim().toLowerCase();
  return providerAliases[rawProvider] ?? (rawProvider in providerLabels ? (rawProvider as SpeechGatewayProvider) : "none");
}

function isWiredServerProvider(providerId: SpeechGatewayProvider): boolean {
  return providerId !== "none" && wiredServerProviders.includes(providerId as SpeechProviderKind);
}

function isLocalSpeechProvider(providerId: SpeechGatewayProvider): boolean {
  return providerId !== "none" && localSpeechProviders.includes(providerId as SpeechProviderKind);
}

function speechProviderFailureReason(error: unknown): string {
  if (error instanceof SpeechProviderRequestError) {
    if (error.timedOut) return "источник распознавания не ответил вовремя";
    if (error.rateLimited || error.statusCode === 429) return "источник временно ограничил запросы";
    if (error.statusCode === 401 || error.statusCode === 403) return "серверный доступ к источнику отклонен";
    if (error.statusCode && error.statusCode >= 500) return "у источника временный сбой";
    if (error.statusCode) return "источник отклонил аудиофрагмент";
  }
  const message = sanitizeProviderErrorMessage(error instanceof Error ? error.message : String(error ?? "")).toLowerCase();
  if (/fetch failed|network|econnreset|econnrefused|etimedout|timeout|socket|terminated|temporar|dns|enotfound/.test(message)) {
    return "нет устойчивого соединения с источником распознавания";
  }
  return "источник распознавания не вернул готовый текст";
}

function publicSpeechProviderFailure(providerLabel: string, error: unknown): string {
  return `${providerLabel}: ${speechProviderFailureReason(error)}; локальный черновик и очередь повтора сохранены.`;
}

function providerConnector(providerId: SpeechGatewayProvider): SpeechProviderRuntimeStatus["connector"] {
  if (providerId === "browser_speech") return "client_only";
  if (isWiredServerProvider(providerId)) return "server_wired";
  if (isLocalSpeechProvider(providerId)) return "local_bridge";
  if (providerId === "mobile_native_speech") {
    return "local_planned";
  }
  return "server_cataloged";
}

function cloudflareAccountId(): string {
  return (process.env.CLOUDFLARE_ACCOUNT_ID ?? process.env.CF_ACCOUNT_ID ?? "").trim();
}

function envString(names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

function localBridgeRemoteAllowed(): boolean {
  return (process.env.DENTAL_ALLOW_REMOTE_LOCAL_BRIDGES ?? "").trim().toLowerCase() === "true";
}

function isPrivateBridgeHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host === "::1" || host.endsWith(".local")) return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return true;
  const match = host.match(/^172\.(\d{1,2})\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

function localBridgeUrlAllowed(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && (localBridgeRemoteAllowed() || isPrivateBridgeHost(url.hostname));
  } catch {
    return false;
  }
}

function redactedBridgeUrl(value: string): string | null {
  try {
    const url = new URL(value);
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function localWhisperTranscribeUrlFromBase(value: string): string {
  const url = new URL(value);
  const cleanPath = url.pathname.replace(/\/+$/g, "");
  if (cleanPath.endsWith("/v1/audio/transcriptions")) return url.toString();
  if (cleanPath.endsWith("/health") || cleanPath.endsWith("/healthz") || cleanPath.endsWith("/status")) {
    url.pathname = `${cleanPath.replace(/\/(health|healthz|status)$/i, "")}/v1/audio/transcriptions`;
    return url.toString();
  }
  url.pathname = `${cleanPath || ""}/v1/audio/transcriptions`;
  return url.toString();
}

function localSpeechTranscribeUrl(providerId: SpeechGatewayProvider): string | null {
  const explicit =
    providerId === "local_whisper"
      ? envString(["DENTAL_LOCAL_WHISPER_TRANSCRIBE_URL", "WHISPER_CPP_TRANSCRIBE_URL", "LOCAL_WHISPER_TRANSCRIBE_URL"])
      : providerId === "vosk_local"
        ? envString(["DENTAL_VOSK_TRANSCRIBE_URL", "VOSK_TRANSCRIBE_URL", "LOCAL_VOSK_TRANSCRIBE_URL"])
        : "";
  if (explicit) return localBridgeUrlAllowed(explicit) ? explicit : null;

  if (providerId === "local_whisper") {
    const base = envString(["DENTAL_LOCAL_WHISPER_URL", "WHISPER_CPP_URL", "LOCAL_WHISPER_URL"]);
    if (!base || !localBridgeUrlAllowed(base)) return null;
    return localWhisperTranscribeUrlFromBase(base);
  }

  if (providerId === "vosk_local") {
    const base = envString(["DENTAL_VOSK_URL", "VOSK_SERVER_URL", "LOCAL_VOSK_URL"]);
    if (!base || !localBridgeUrlAllowed(base)) return null;
    return base;
  }

  return null;
}

function localSpeechHealthUrlFromBase(value: string): string {
  const url = new URL(value);
  const cleanPath = url.pathname.replace(/\/+$/g, "");
  if (cleanPath.endsWith("/health") || cleanPath.endsWith("/healthz") || cleanPath.endsWith("/status")) {
    return url.toString();
  }
  if (cleanPath.endsWith("/v1/audio/transcriptions")) {
    url.pathname = `${cleanPath.replace(/\/v1\/audio\/transcriptions$/i, "")}/health`;
    return url.toString();
  }
  url.pathname = `${cleanPath || ""}/health`;
  return url.toString();
}

function localSpeechHealthUrl(providerId: SpeechGatewayProvider): string | null {
  const explicit =
    providerId === "local_whisper"
      ? envString(["DENTAL_LOCAL_WHISPER_HEALTH_URL", "WHISPER_CPP_HEALTH_URL", "LOCAL_WHISPER_HEALTH_URL"])
      : providerId === "vosk_local"
        ? envString(["DENTAL_VOSK_HEALTH_URL", "VOSK_HEALTH_URL", "LOCAL_VOSK_HEALTH_URL"])
        : "";
  if (explicit) return localBridgeUrlAllowed(explicit) ? explicit : null;

  const base =
    providerId === "local_whisper"
      ? envString(["DENTAL_LOCAL_WHISPER_URL", "WHISPER_CPP_URL", "LOCAL_WHISPER_URL"])
      : providerId === "vosk_local"
        ? envString(["DENTAL_VOSK_URL", "VOSK_SERVER_URL", "LOCAL_VOSK_URL"])
        : "";
  if (base && localBridgeUrlAllowed(base)) {
    return localSpeechHealthUrlFromBase(base);
  }

  const transcribeUrl = localSpeechTranscribeUrl(providerId);
  if (transcribeUrl && localBridgeUrlAllowed(transcribeUrl)) {
    return localSpeechHealthUrlFromBase(transcribeUrl);
  }

  return null;
}

function localSpeechTimeoutMs(): number {
  return numberFromEnv("DENTAL_LOCAL_STT_TIMEOUT_MS", 25_000);
}

function localSpeechProbeTimeoutMs(): number {
  return Math.max(250, Math.min(numberFromEnv("DENTAL_LOCAL_STT_PROBE_TIMEOUT_MS", 900), 5_000));
}

function localSpeechProbeTtlMs(): number {
  return Math.max(500, Math.min(numberFromEnv("DENTAL_LOCAL_STT_PROBE_TTL_MS", 7_000), 60_000));
}

const localSpeechBridgeProbeByProvider = new Map<SpeechGatewayProvider, LocalSpeechBridgeProbeState>();

function defaultLocalSpeechBridgeProbeState(): LocalSpeechBridgeProbeState {
  return {
    status: "unknown",
    checkedAt: null,
    latencyMs: null,
    urlRedacted: null,
    warning: null,
    pending: null
  };
}

function providerMinimumChunkMs(providerId: SpeechGatewayProvider): number {
  return providerId === "groq_whisper" ? 10_000 : 1_000;
}

function normalizeSpeechChunkTimings(input: {
  providerId: SpeechGatewayProvider;
  recommendedChunkMs: number;
  minChunkMs: number;
  maxChunkMs: number;
  warnings: string[];
}): { recommendedChunkMs: number; minChunkMs: number; maxChunkMs: number } {
  const rawMin = Math.min(input.minChunkMs, input.maxChunkMs);
  const rawMax = Math.max(input.minChunkMs, input.maxChunkMs);
  const providerFloor = providerMinimumChunkMs(input.providerId);
  const minChunkMs = Math.max(rawMin, providerFloor);
  const maxChunkMs = Math.max(rawMax, minChunkMs);
  const recommendedChunkMs = Math.min(Math.max(input.recommendedChunkMs, minChunkMs), maxChunkMs);

  if (input.providerId === "groq_whisper" && (rawMin < providerFloor || input.recommendedChunkMs < providerFloor)) {
    input.warnings.push("Для Groq распознавания включен минимум 10 секунд на фрагмент, чтобы не тратить короткие запросы впустую.");
  }
  if (input.recommendedChunkMs !== recommendedChunkMs || rawMin !== minChunkMs || rawMax !== maxChunkMs) {
    input.warnings.push(
      `Длительность аудиофрагментов нормализована до ${Math.round(minChunkMs / 1000)}-${Math.round(maxChunkMs / 1000)} сек.; рекомендовано ${Math.round(
        recommendedChunkMs / 1000
      )} сек.`
    );
  }

  return { recommendedChunkMs, minChunkMs, maxChunkMs };
}

function localSpeechBridgeProbeState(providerId: SpeechGatewayProvider): LocalSpeechBridgeProbeState {
  const existing = localSpeechBridgeProbeByProvider.get(providerId);
  if (existing) return existing;
  const state = defaultLocalSpeechBridgeProbeState();
  localSpeechBridgeProbeByProvider.set(providerId, state);
  return state;
}

function localSpeechBridgeProbeFresh(state: LocalSpeechBridgeProbeState): boolean {
  return state.checkedAt !== null && Date.now() - state.checkedAt < localSpeechProbeTtlMs();
}

async function runLocalSpeechBridgeProbe(providerId: SpeechGatewayProvider): Promise<void> {
  const state = localSpeechBridgeProbeState(providerId);
  const url = localSpeechHealthUrl(providerId);
  if (!url) {
    state.status = providerConfigReady(providerId) ? "blocked" : "misconfigured";
    state.checkedAt = Date.now();
    state.latencyMs = null;
    state.urlRedacted = null;
    state.warning = `${providerLabels[providerId]}: адрес проверки не настроен или находится вне localhost/частной сети.`;
    return;
  }

  state.urlRedacted = redactedBridgeUrl(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), localSpeechProbeTimeoutMs());
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json,text/plain,*/*" },
      signal: controller.signal
    });
    state.checkedAt = Date.now();
    state.latencyMs = state.checkedAt - startedAt;
    if (response.ok) {
      state.status = "ready";
      state.warning = null;
    } else {
      state.status = "unreachable";
      state.warning = `${providerLabels[providerId]}: локальный модуль не подтвердил готовность; аудио в очереди остается локально.`;
    }
  } catch (error) {
    state.status = "unreachable";
    state.checkedAt = Date.now();
    state.latencyMs = null;
    const probeReason =
      error instanceof Error && error.name === "AbortError"
        ? "локальный модуль не ответил вовремя"
        : "локальный модуль недоступен по локальной сети";
    state.warning = `${providerLabels[providerId]}: ${probeReason}; аудио в очереди остается локально.`;
  } finally {
    clearTimeout(timeout);
  }
}

function primeLocalSpeechBridgeProbe(providerId: SpeechGatewayProvider): LocalSpeechBridgeProbeState {
  const state = localSpeechBridgeProbeState(providerId);
  if (!isLocalSpeechProvider(providerId)) return state;
  if (!providerConfigReady(providerId)) return state;
  if (state.pending || localSpeechBridgeProbeFresh(state)) return state;

  const pending = runLocalSpeechBridgeProbe(providerId)
    .catch((error) => {
      state.status = "unreachable";
      state.checkedAt = Date.now();
      state.latencyMs = null;
      const probeReason =
        error instanceof Error && error.name === "AbortError"
          ? "локальный модуль не ответил вовремя"
          : "локальный модуль недоступен по локальной сети";
      state.warning = `${providerLabels[providerId]}: ${probeReason}; аудио в очереди остается локально.`;
    })
    .finally(() => {
      state.pending = null;
    });
  state.pending = pending;
  return state;
}

function localSpeechBridgeReady(providerId: SpeechGatewayProvider): boolean {
  const state = primeLocalSpeechBridgeProbe(providerId);
  return state.status === "ready";
}

function localSpeechBridgeProbeWarning(providerId: SpeechGatewayProvider): string | null {
  const state = primeLocalSpeechBridgeProbe(providerId);
  if (!providerConfigReady(providerId)) return null;
  const urlSuffix = state.urlRedacted ? ` (${state.urlRedacted})` : "";
  if (state.status === "ready") {
    const latency = state.latencyMs !== null ? `, проверка ${state.latencyMs} мс` : "";
    return `${providerLabels[providerId]}: локальный модуль доступен${latency}; фрагменты остаются на localhost или в частной сети.`;
  }
  if (state.pending || state.status === "unknown") {
    return `${providerLabels[providerId]}: адрес локального модуля настроен, проверка доступности еще идет${urlSuffix}; аудио в очереди остается локально до готовности модуля.`;
  }
  return `${state.warning ?? `${providerLabels[providerId]}: локальный модуль недоступен`}${urlSuffix}`;
}

function localSpeechApiKey(providerId: SpeechGatewayProvider): string | null {
  const value =
    providerId === "local_whisper"
      ? envString(["DENTAL_LOCAL_WHISPER_API_KEY", "WHISPER_CPP_API_KEY", "LOCAL_WHISPER_API_KEY"])
      : providerId === "vosk_local"
        ? envString(["DENTAL_VOSK_API_KEY", "VOSK_API_KEY", "LOCAL_VOSK_API_KEY"])
        : "";
  return value || null;
}

function providerConfigMissingEnvVars(providerId: SpeechGatewayProvider): string[] {
  if (providerId === "cloudflare_whisper" && !cloudflareAccountId()) {
    return ["CLOUDFLARE_ACCOUNT_ID"];
  }
  if (providerId === "local_whisper" && !localSpeechTranscribeUrl(providerId)) {
    return ["DENTAL_LOCAL_WHISPER_TRANSCRIBE_URL", "DENTAL_LOCAL_WHISPER_URL"];
  }
  if (providerId === "vosk_local" && !localSpeechTranscribeUrl(providerId)) {
    return ["DENTAL_VOSK_TRANSCRIBE_URL", "DENTAL_VOSK_URL"];
  }
  return [];
}

function providerConfigReady(providerId: SpeechGatewayProvider): boolean {
  if (isWiredServerProvider(providerId)) {
    return providerKeyCount(providerId) > 0 && providerConfigMissingEnvVars(providerId).length === 0;
  }
  if (isLocalSpeechProvider(providerId)) {
    return Boolean(localSpeechTranscribeUrl(providerId)) && providerConfigMissingEnvVars(providerId).length === 0;
  }
  return false;
}

function providerTranscriptionCurrentlyAvailable(providerId: SpeechGatewayProvider): boolean {
  if (isWiredServerProvider(providerId)) {
    return providerConfigReady(providerId) && getProviderKeyPoolSummary(providerId).availableKeyCount > 0;
  }
  if (isLocalSpeechProvider(providerId)) {
    return providerConfigReady(providerId) && localSpeechBridgeReady(providerId);
  }
  return false;
}

function anyProviderTranscriptionCurrentlyAvailable(providerIds: SpeechGatewayProvider[]): boolean {
  return providerIds.some((providerId) => providerTranscriptionCurrentlyAvailable(providerId));
}

function configuredWiredProviders(): SpeechProviderKind[] {
  return [...wiredServerProviders, ...localSpeechProviders].filter((providerId) => providerConfigReady(providerId));
}

function fallbackLimit(): number {
  return Math.max(1, Math.min(numberFromEnv("DENTAL_SPEECH_FALLBACK_LIMIT", 2), wiredServerProviders.length));
}

function resolveSpeechProvider(): {
  providerId: SpeechGatewayProvider;
  requestedProviderId: SpeechGatewayProvider;
  providerSelectionMode: "disabled" | "manual" | "auto" | "fallback";
  configuredProviderIds: SpeechProviderKind[];
  fallbackProviderIds: SpeechProviderKind[];
  warnings: string[];
  nextSetupStep: string;
} {
  const requestedProviderId = selectedProvider();
  const configuredProviderIds = configuredWiredProviders();
  const warnings: string[] = [];
  const requestedKeyPresent = providerKeyCount(requestedProviderId) > 0;
  const requestedConfigured = providerConfigReady(requestedProviderId);

  if ((isWiredServerProvider(requestedProviderId) || isLocalSpeechProvider(requestedProviderId)) && requestedConfigured) {
    const fallbackProviderIds: SpeechProviderKind[] = [
      requestedProviderId as SpeechProviderKind,
      ...configuredProviderIds.filter((providerId) => providerId !== requestedProviderId)
    ].slice(0, fallbackLimit());
    return {
      providerId: requestedProviderId,
      requestedProviderId,
      providerSelectionMode: "manual",
      configuredProviderIds,
      fallbackProviderIds,
      warnings,
      nextSetupStep: isLocalSpeechProvider(requestedProviderId)
        ? `${providerLabels[requestedProviderId]}: локальный модуль указан в серверных настройках; перед отправкой аудио из очереди проверка доступности должна показать готовность.`
        : `${providerLabels[requestedProviderId]} готов: источник распознавания подключен, резервная цепочка ${fallbackProviderIds.map((providerId) => providerLabels[providerId]).join(" -> ")}.`
    };
  }

  if (configuredProviderIds.length) {
    const providerId = configuredProviderIds[0] ?? "none";
    const fallbackProviderIds = configuredProviderIds.slice(0, fallbackLimit());
    const providerSelectionMode = requestedProviderId === "none" ? "auto" : "fallback";
    if (requestedProviderId === "none") {
      warnings.push(`${providerLabels[providerId]} выбран автоматически, потому что источник распознавания уже есть в серверных настройках.`);
    } else {
      warnings.push(`${providerLabels[requestedProviderId]} сейчас не может принимать аудиофрагменты; временно используется ${providerLabels[providerId]}.`);
    }
    return {
      providerId,
      requestedProviderId,
      providerSelectionMode,
      configuredProviderIds,
      fallbackProviderIds,
      warnings,
      nextSetupStep: `Активен ${providerLabels[providerId]}. Для ручного выбора откройте серверные настройки распознавания; для первого пилота достаточно одного подключенного облачного источника.`
    };
  }

  const nextSetupStep =
    requestedProviderId === "none"
      ? "Для серверного распознавания подключите один облачный источник в серверных настройках. Пока врач может печатать, использовать браузерную диктовку и офлайн-парсер."
      : isWiredServerProvider(requestedProviderId) && requestedKeyPresent && providerConfigMissingEnvVars(requestedProviderId).length
        ? `${providerLabels[requestedProviderId]}: источник найден, но не хватает серверных настроек: ${providerConfigMissingEnvVars(requestedProviderId).length}.`
      : isLocalSpeechProvider(requestedProviderId)
        ? `${providerLabels[requestedProviderId]} требует адрес локального модуля в серверных настройках: ${Math.max(1, providerConfigMissingEnvVars(requestedProviderId).length)} пункт.`
      : requestedKeyPresent && !isWiredServerProvider(requestedProviderId)
        ? `${providerLabels[requestedProviderId]} есть в каталоге, но прямой серверный коннектор пока не включен; для рабочего распознавания подключите поддерживаемый облачный источник.`
        : `Для ${providerLabels[requestedProviderId]} нужен серверный ключ в серверных настройках. До подключения врач может использовать браузерную диктовку или печатный черновик.`;

  return {
    providerId: requestedProviderId,
    requestedProviderId,
    providerSelectionMode: "disabled",
    configuredProviderIds,
    fallbackProviderIds: [],
    warnings,
    nextSetupStep
  };
}

export function getSpeechGatewayStatus(): SpeechGatewayStatus {
  const resolvedProvider = resolveSpeechProvider();
  const providerId = resolvedProvider.providerId;
  const keyPool = getProviderKeyPoolSummary(providerId);
  const missingConfigEnvVars = providerConfigMissingEnvVars(providerId);
  const providerReady = providerConfigReady(providerId);
  const keyConfigured = keyPool.configuredKeyCount > 0 || (isLocalSpeechProvider(providerId) && providerReady);
  const serverTranscriptionCurrentlyAvailable = anyProviderTranscriptionCurrentlyAvailable(
    resolvedProvider.fallbackProviderIds.length ? resolvedProvider.fallbackProviderIds : [providerId]
  );
  const maxChunkBytes = numberFromEnv("DENTAL_SPEECH_MAX_CHUNK_BYTES", 6_000_000);
  const recommendedChunkMs = numberFromEnv("DENTAL_SPEECH_RECOMMENDED_CHUNK_MS", 15_000);
  const minChunkMs = numberFromEnv("DENTAL_SPEECH_MIN_CHUNK_MS", 10_000);
  const maxChunkMs = numberFromEnv("DENTAL_SPEECH_MAX_CHUNK_MS", 25_000);
  const silenceMs = numberFromEnv("DENTAL_SPEECH_SILENCE_MS", 900);
  const monitorIntervalMs = numberFromEnv("DENTAL_SPEECH_MONITOR_INTERVAL_MS", 250);
  const overlapMs = Math.min(numberFromEnv("DENTAL_SPEECH_CHUNK_OVERLAP_MS", 500), 3_000);
  const dedupeWindowChars = Math.min(numberFromEnv("DENTAL_SPEECH_DEDUPE_WINDOW_CHARS", 600), 4_000);
  const rmsThreshold = Number(process.env.DENTAL_SPEECH_RMS_THRESHOLD ?? 0.015);
  const warnings: string[] = [...resolvedProvider.warnings];
  const chunkTimings = normalizeSpeechChunkTimings({
    providerId,
    recommendedChunkMs,
    minChunkMs,
    maxChunkMs,
    warnings
  });

  if (providerId === "none") {
    warnings.push("Серверное распознавание не настроено: врач может печатать, использовать браузерную диктовку и офлайн-парсер.");
  } else if (providerId === "browser_speech") {
    warnings.push("Браузерная диктовка работает без серверного подключения и не отправляет аудио на сервер.");
  } else if (isLocalSpeechProvider(providerId) && providerReady) {
    const localProbeWarning = localSpeechBridgeProbeWarning(providerId);
    if (localProbeWarning) warnings.push(localProbeWarning);
  } else if (isLocalSpeechProvider(providerId)) {
    warnings.push(`${providerLabels[providerId]} требует адрес локального модуля в серверных настройках перед офлайн-распознаванием фрагментов.`);
  } else if (!keyConfigured) {
    warnings.push(`Для ${providerLabels[providerId]} нужен серверный доступ в настройках распознавания. До подключения врач может использовать локальный черновик.`);
  }

  if (keyConfigured && missingConfigEnvVars.length) {
    warnings.push(`${providerLabels[providerId]} подключен частично: не хватает серверных настроек (${missingConfigEnvVars.length}).`);
  }

  if (providerReady && !serverTranscriptionCurrentlyAvailable) {
    warnings.push("Серверное распознавание настроено, но сейчас нет доступного резервного источника; аудио остается в локальной очереди до восстановления серверного доступа или локального модуля.");
  }

  if (keyConfigured && keyPool.rotationEnabled) {
    warnings.push(
      `Резервное переключение распознавания активно: доступно ${keyPool.availableKeyCount}/${keyPool.configuredKeyCount}, лимит повторов ${keyPool.maxAttemptsPerProvider}.`
    );
  } else if (keyConfigured && !isLocalSpeechProvider(providerId) && keyPool.availableKeyCount === 0) {
    warnings.push("Выбранный источник распознавания временно на паузе из-за лимитов; локальный черновик остается доступен.");
  }

  if (["azure_speech", "google_speech", "huggingface_asr", "mobile_native_speech"].includes(providerId)) {
    warnings.push(`${providerLabels[providerId]} добавлен в каталог выбора, но прямое серверное распознавание пока не включено в текущий шлюз.`);
  }

  return {
    providerId,
    requestedProviderId: resolvedProvider.requestedProviderId,
    providerLabel: providerLabels[providerId],
    providerSelectionMode: resolvedProvider.providerSelectionMode,
    serverTranscriptionEnabled: providerReady,
    serverTranscriptionCurrentlyAvailable,
    keyConfigured,
    keyPool,
    configuredProviderIds: resolvedProvider.configuredProviderIds,
    fallbackProviderIds: resolvedProvider.fallbackProviderIds,
    maxChunkBytes,
    recommendedChunkMs: chunkTimings.recommendedChunkMs,
    chunkingPolicy: {
      strategy: "time_and_silence",
      minChunkMs: chunkTimings.minChunkMs,
      maxChunkMs: chunkTimings.maxChunkMs,
      silenceMs,
      rmsThreshold: Number.isFinite(rmsThreshold) && rmsThreshold > 0 ? rmsThreshold : 0.015,
      monitorIntervalMs,
      overlapMs,
      dedupeWindowChars
    },
    polishPolicy: getSpeechPolishPolicy(),
    promptPolicy: getDentalSttPromptPolicy(),
    audioRetention: "discard_after_transcription",
    nextSetupStep: resolvedProvider.nextSetupStep,
    warnings
  };
}

export function getSpeechProviderRuntimeStatuses(): SpeechProviderRuntimeStatus[] {
  const gateway = getSpeechGatewayStatus();
  return speechProviders.map((provider) => {
    const providerId = provider.id;
    const keyPool = getProviderKeyPoolSummary(providerId);
    const acceptedEnvVars = getProviderAcceptedKeyEnvVars(providerId);
    const missingConfigEnvVars = providerConfigMissingEnvVars(providerId);
    const connector = providerConnector(providerId);
    const configured =
      provider.status === "usable_without_key" ||
      (connector === "local_bridge" && providerConfigReady(providerId)) ||
      (keyPool.configuredKeyCount > 0 && missingConfigEnvVars.length === 0);
    const localBridgeCurrentlyReady = connector === "local_bridge" && providerTranscriptionCurrentlyAvailable(providerId);
    const canTranscribeChunks =
      provider.status === "usable_without_key" ||
      (connector === "server_wired" && configured) ||
      localBridgeCurrentlyReady;
    const missingEnvVars =
      provider.status === "usable_without_key"
        ? []
        : [
            ...(keyPool.configuredKeyCount > 0 || connector === "local_bridge" ? [] : acceptedEnvVars),
            ...missingConfigEnvVars
          ].filter((envName, index, envNames) => envNames.indexOf(envName) === index);
    const warnings: string[] = [];

    if (connector === "server_wired" && keyPool.configuredKeyCount > 1) {
      warnings.push(`Резервное переключение включено: ${keyPool.availableKeyCount}/${keyPool.configuredKeyCount} доступно.`);
    }
    if (connector === "server_wired" && keyPool.configuredKeyCount > 0 && keyPool.availableKeyCount === 0) {
      warnings.push("Все ключи источника распознавания на временной паузе из-за лимитов; врач продолжит через локальный текст и очередь.");
    }
    if (connector === "server_wired" && keyPool.configuredKeyCount > 0 && missingConfigEnvVars.length) {
      warnings.push(`Серверные настройки распознавания неполные: не хватает пунктов (${missingConfigEnvVars.length}) до приема аудиофрагментов этим маршрутом.`);
    }
    if (connector === "server_cataloged" && keyPool.configuredKeyCount > 0) {
      warnings.push("Ключ найден, но прямой серверный коннектор пока не включен в текущий шлюз.");
    }
    if (connector === "local_planned") {
      warnings.push("Нужен отдельный desktop/mobile модуль; браузерный интерфейс не должен получать локальные модели.");
    }
    if (connector === "local_bridge" && configured) {
      const localProbeWarning = localSpeechBridgeProbeWarning(providerId);
      if (localProbeWarning) warnings.push(localProbeWarning);
    }

    const nextStep =
      provider.status === "usable_without_key"
        ? "Можно использовать сразу как быстрый ввод, но врач всё равно проверяет текст."
        : connector === "local_bridge" && localBridgeCurrentlyReady
          ? `${providerLabels[providerId]}: локальный модуль готов; сервер может отправлять фрагменты без облачного распознавания.`
        : connector === "local_bridge" && configured
          ? `${providerLabels[providerId]} указан, но проверка доступности не готова; держите аудио в локальном восстановлении и запустите или исправьте локальный модуль.`
        : connector === "local_bridge"
          ? `Заполните серверные настройки локального модуля (${Math.max(1, missingEnvVars.length)}). До этого врач может печатать или использовать браузерную диктовку.`
        : connector === "server_wired" && configured
          ? `${providerLabels[providerId]} готов для серверных аудиофрагментов; повторов ${keyPool.maxAttemptsPerProvider}, ожидание ответа ${Math.round(keyPool.timeoutMs / 1000)} c.`
          : connector === "server_wired" && missingEnvVars.length
            ? `Заполните серверные настройки распознавания (${missingEnvVars.length}). До этого врач может печатать или использовать браузерную диктовку.`
          : connector === "server_wired"
            ? `Подключите один серверный источник распознавания. До этого врач печатает или использует браузерную диктовку.`
            : connector === "server_cataloged"
              ? `Источник распознавания оставлен как админский вариант; для включения нужен отдельный маршрут и проверка тарифов/данных.`
              : "Запланировать локальный модуль после стабилизации серверного распознавания и офлайн-парсера.";

    return {
      providerId,
      providerLabel: providerLabels[providerId],
      connector,
      doctorFacing: providerId === "browser_speech" || providerId === gateway.providerId,
      canTranscribeChunks,
      configured,
      keyPool,
      acceptedSettingsCount: acceptedEnvVars.length,
      missingSettingsCount: missingEnvVars.length,
      recommendedUse: provider.recommendedFor[0] ?? "админский выбор источника распознавания",
      nextStep,
      warnings
    };
  });
}

export function getSpeechGatewayHealthReport(): SpeechGatewayHealthReport {
  const gateway = getSpeechGatewayStatus();
  const runtimeStatuses = getSpeechProviderRuntimeStatuses();
  const providers = runtimeStatuses.map((runtime) => {
    const keyHealth = getProviderKeyHealthSnapshots(runtime.providerId);
    const connector = runtime.connector;
    const fallbackIndex = gateway.fallbackProviderIds.indexOf(runtime.providerId);
    const fallbackRank = fallbackIndex >= 0 ? fallbackIndex : null;
    const hasAvailableServerKey = runtime.keyPool.configuredKeyCount > 0 && runtime.keyPool.availableKeyCount > 0;
    const localBridgeReady = connector === "local_bridge" && runtime.canTranscribeChunks;
    const healthLevel: SpeechProviderHealthLevel =
      connector === "client_only"
        ? "ready"
        : connector === "local_bridge"
          ? localBridgeReady
            ? "ready"
            : "setup_required"
        : connector === "local_planned" || connector === "server_cataloged"
          ? "planned"
          : !runtime.configured
            ? "setup_required"
            : hasAvailableServerKey
              ? "ready"
              : "degraded";
    const safeToUseInVisit =
      runtime.providerId === "browser_speech" ||
      localBridgeReady ||
      (connector === "server_wired" && runtime.canTranscribeChunks && runtime.keyPool.availableKeyCount > 0);
    const warnings = [...runtime.warnings];

    if (connector === "server_wired" && runtime.configured && runtime.keyPool.availableKeyCount === 0) {
      warnings.push("Все настроенные ключи на временной паузе из-за лимитов; прием сохраняет локальный черновик и очередь повтора без блокировки врача.");
    }
    if (fallbackRank !== null && fallbackRank > 0) {
      warnings.push(`Резервный источник распознавания в очереди N ${fallbackRank + 1}; используется только после ошибки или паузы из-за лимитов у более ранних источников.`);
    }

    return {
      providerId: runtime.providerId,
      providerLabel: runtime.providerLabel,
      connector,
      configured: runtime.configured,
      canTranscribeChunks: runtime.canTranscribeChunks,
      keyPool: runtime.keyPool,
      keyHealth,
      healthLevel,
      fallbackRank,
      safeToUseInVisit,
      warnings: uniqueNonEmpty(warnings),
      nextStep: runtime.nextStep
    };
  });

  const totals = providers.reduce(
    (accumulator, provider) => ({
      configured: accumulator.configured + provider.keyPool.configuredKeyCount,
      available: accumulator.available + provider.keyPool.availableKeyCount,
      coolingDown: accumulator.coolingDown + provider.keyPool.coolingDownKeyCount
    }),
    { configured: 0, available: 0, coolingDown: 0 }
  );
  const warnings = [...gateway.warnings];

  if (gateway.serverTranscriptionEnabled && !gateway.serverTranscriptionCurrentlyAvailable) {
    warnings.push("Сейчас нет доступного источника распознавания; фрагменты остаются восстанавливаемыми и не блокируют врача.");
  } else if (gateway.serverTranscriptionEnabled && !isLocalSpeechProvider(gateway.providerId) && gateway.keyPool.availableKeyCount === 0) {
    warnings.push("Активный источник распознавания сейчас недоступен; перед повтором будут проверены резервные источники.");
  }
  if (gateway.serverTranscriptionEnabled && !isLocalSpeechProvider(gateway.providerId) && gateway.fallbackProviderIds.length < 2) {
    warnings.push("Настроен только один источник распознавания; добавьте второй источник для устойчивого резервирования.");
  }
  if (!gateway.promptPolicy.enabled) {
    warnings.push("Пакет стоматологических подсказок для распознавания отключен; материалы, номера зубов и процедуры будут распознаваться хуже.");
  }
  if (!gateway.polishPolicy.deterministicEnabled) {
    warnings.push("Детерминированный стоматологический парсер отключен; для работы без интернета его лучше держать включенным.");
  }

  const activeLocalBridgeReady = isLocalSpeechProvider(gateway.providerId) && gateway.serverTranscriptionCurrentlyAvailable;
  const nextAction =
    activeLocalBridgeReady
      ? `${gateway.providerLabel}: локальный модуль готов; фрагменты остаются на localhost/private LAN, облачное распознавание не нужно.`
    : gateway.serverTranscriptionCurrentlyAvailable
      ? `${gateway.providerLabel}: в резервной цепочке есть доступный путь распознавания, доступных маршрутов ${gateway.keyPool.availableKeyCount}/${gateway.keyPool.configuredKeyCount}, источников ${gateway.fallbackProviderIds.length}.`
      : totals.configured > 0 && totals.available === 0
        ? "Все настроенные серверные маршруты распознавания на временной паузе из-за лимитов; держите браузерную или локальную диктовку активной и повторите очередь позже."
        : gateway.nextSetupStep;

  return {
    generatedAt: new Date().toISOString(),
    activeProviderId: gateway.providerId,
    activeProviderLabel: gateway.providerLabel,
    serverTranscriptionEnabled: gateway.serverTranscriptionEnabled,
    fallbackProviderIds: gateway.fallbackProviderIds,
    totalConfiguredKeys: totals.configured,
    totalAvailableKeys: totals.available,
    totalCoolingDownKeys: totals.coolingDown,
    timeoutMs: gateway.keyPool.timeoutMs,
    retryLimit: gateway.keyPool.maxAttemptsPerProvider,
    promptEnabled: gateway.promptPolicy.enabled,
    deterministicParserEnabled: gateway.polishPolicy.deterministicEnabled,
    providers,
    warnings: uniqueNonEmpty(warnings).slice(0, 10),
    nextAction
  };
}

export function buildSpeechRecordingStrategy(input: SpeechRecordingStrategyRequest): SpeechRecordingStrategy {
  const gateway = getSpeechGatewayStatus();
  const expectedDurationMs = input.expectedDurationMs ?? null;
  const estimatedChunkCount = expectedDurationMs
    ? Math.max(1, Math.ceil(expectedDurationMs / gateway.recommendedChunkMs))
    : null;
  const steps: string[] = [];
  const warnings: string[] = [];
  const longRecording = Boolean(expectedDurationMs && expectedDurationMs > 20 * 60_000);

  if (input.privacyMode === "local_only") {
    return {
      recommendedPath: "local_transcript_only",
      providerId: "browser_speech",
      providerLabel: providerLabels.browser_speech,
      serverUploadAllowed: false,
      localQueueRequired: true,
      deterministicParserRequired: true,
      neuralPolishAllowed: false,
      chunkMs: gateway.recommendedChunkMs,
      minChunkMs: gateway.chunkingPolicy.minChunkMs,
      maxChunkMs: gateway.chunkingPolicy.maxChunkMs,
      estimatedChunkCount,
      maxChunkBytes: gateway.maxChunkBytes,
      reason: "Режим приватности запрещает облачную отправку; держите текст локально и запускайте детерминированный стоматологический парсер.",
      steps: [
        "Используйте браузерную или мобильную диктовку, когда она доступна.",
        "Автосохраняйте текст локально после каждого изменения.",
        "Запускайте детерминированный профильный парсер до создания черновика ЭМК.",
        "Синхронизируйте только проверенный текст, когда клиника разрешает серверное хранение."
      ],
      warnings: ["Облачное распознавание и нейронная полировка отключены в локальном режиме."]
    };
  }

  if (input.networkState === "offline") {
    return {
      recommendedPath: "offline_queue",
      providerId: gateway.providerId,
      providerLabel: gateway.providerLabel,
      serverUploadAllowed: false,
      localQueueRequired: true,
      deterministicParserRequired: true,
      neuralPolishAllowed: false,
      chunkMs: gateway.recommendedChunkMs,
      minChunkMs: gateway.chunkingPolicy.minChunkMs,
      maxChunkMs: gateway.chunkingPolicy.maxChunkMs,
      estimatedChunkCount,
      maxChunkBytes: gateway.maxChunkBytes,
      reason: "Сети нет; врач должен продолжать работу без блокирующего окна.",
      steps: [
        "Сохраняйте аудиофрагменты в IndexedDB, если аудио есть.",
        "Держите видимый текст в локальном черновике.",
        "Используйте детерминированный парсер для немедленной очистки черновика.",
        "После появления сети отправьте очередь и соберите серверный текст."
      ],
      warnings: ["Внешнее распознавание и нейронная полировка отложены до восстановления связи."]
    };
  }

  if (!gateway.serverTranscriptionEnabled) {
    return {
      recommendedPath: "browser_live",
      providerId: "browser_speech",
      providerLabel: providerLabels.browser_speech,
      serverUploadAllowed: false,
      localQueueRequired: true,
      deterministicParserRequired: true,
      neuralPolishAllowed: false,
      chunkMs: gateway.recommendedChunkMs,
      minChunkMs: gateway.chunkingPolicy.minChunkMs,
      maxChunkMs: gateway.chunkingPolicy.maxChunkMs,
      estimatedChunkCount,
      maxChunkBytes: gateway.maxChunkBytes,
      reason: "Серверный источник распознавания не готов; браузерная диктовка и печать остаются самым быстрым режимом.",
      steps: [
        "Добавляйте распознанный браузером текст в автосохраняемое поле диктовки.",
        "Разрешайте ручной ввод в любой момент.",
        "Запускайте детерминированную очистку до черновика ЭМК.",
        "Показывайте выбор источника распознавания только в настройках, не на экране лечения."
      ],
      warnings: gateway.warnings
    };
  }

  if (!gateway.serverTranscriptionCurrentlyAvailable) {
    return {
      recommendedPath: "offline_queue",
      providerId: gateway.providerId,
      providerLabel: gateway.providerLabel,
      serverUploadAllowed: false,
      localQueueRequired: true,
      deterministicParserRequired: true,
      neuralPolishAllowed: false,
      chunkMs: gateway.recommendedChunkMs,
      minChunkMs: gateway.chunkingPolicy.minChunkMs,
      maxChunkMs: gateway.chunkingPolicy.maxChunkMs,
      estimatedChunkCount,
      maxChunkBytes: gateway.maxChunkBytes,
      reason: "Серверное распознавание настроено, но текущие источники или ключи недоступны; записывайте локально и повторяйте без блокировки приема.",
      steps: [
        "Сохраняйте каждый аудиофрагмент в IndexedDB до любой попытки отправки.",
        "Не отправляйте аудиофрагменты, пока в резервной цепочке распознавания нет доступного источника.",
        "Держите видимый текст редактируемым и автосохраненным локально.",
        "Отправьте локальную очередь и соберите запись, когда появится ключ или локальный модуль."
      ],
      warnings: gateway.warnings
    };
  }

  if (longRecording) {
    warnings.push("Длинные записи нужно делить на фрагменты или переносить в async-задачу; не загружайте один большой файл всего приема.");
  }
  if (gateway.keyPool.coolingDownKeyCount > 0) {
    warnings.push(`${gateway.keyPool.coolingDownKeyCount} ключ(а) распознавания на временной паузе из-за лимитов; повтор возьмет доступные ключи по резервному переключению.`);
  }
  if (gateway.providerId === "groq_whisper" && gateway.chunkingPolicy.minChunkMs < 10_000) {
    warnings.push("Groq распознавание не должно получать слишком короткие фрагменты: короткие запросы могут расходовать минимальную длительность впустую.");
  }

  steps.push(
    `Записывайте фрагменты около ${Math.round(gateway.recommendedChunkMs / 1000)} секунд с отсечкой тишины и жестким максимумом ${Math.round(gateway.chunkingPolicy.maxChunkMs / 1000)} секунд.`,
    `Убирайте дубли текста на границе фрагментов в последних ${gateway.chunkingPolicy.dedupeWindowChars} символах; ${gateway.chunkingPolicy.overlapMs} мс зарезервированы как будущий предзахват для мобильных и настольных рекордеров.`,
    "Сохраняйте каждый ожидающий аудиофрагмент в IndexedDB до отправки.",
    "Отправляйте фрагменты только через сервер приложения; никогда не раскрывайте ключи источников распознавания в браузере.",
    "Собирайте сохраненные фрагменты по recordingId после остановки или повтора очереди.",
    "Сначала запускайте детерминированный стоматологический парсер; нейронная полировка может менять только формулировки и не должна добавлять факты."
  );

  return {
    recommendedPath: longRecording ? "async_long_recording" : "server_chunked",
    providerId: gateway.providerId,
    providerLabel: gateway.providerLabel,
    serverUploadAllowed: true,
    localQueueRequired: true,
    deterministicParserRequired: true,
    neuralPolishAllowed: gateway.polishPolicy.neuralEnabled,
    chunkMs: gateway.recommendedChunkMs,
    minChunkMs: gateway.chunkingPolicy.minChunkMs,
    maxChunkMs: gateway.chunkingPolicy.maxChunkMs,
    estimatedChunkCount,
    maxChunkBytes: gateway.maxChunkBytes,
    reason: longRecording
      ? "Серверное распознавание настроено, но длинное аудио требует асинхронного потока."
      : "Серверное распознавание настроено; фрагментированная загрузка балансирует качество, лимиты источника и локальное восстановление.",
    steps,
    warnings
  };
}

export function speechJsonBodyLimitBytes(): number {
  return Math.ceil(getSpeechGatewayStatus().maxChunkBytes * 1.4) + 4096;
}

function decodeBase64Audio(value: string | undefined, maxChunkBytes: number): Buffer {
  if (!value?.trim()) return Buffer.alloc(0);
  if (!/^[A-Za-z0-9+/=]+$/.test(value)) {
    throw new SpeechChunkPayloadError(
      "Аудиофрагмент поврежден или передан не как файл записи. Повторите запись либо оставьте текстовый черновик."
    );
  }
  const buffer = Buffer.from(value, "base64");
  if (buffer.byteLength > maxChunkBytes) {
    throw new SpeechChunkPayloadError(
      `Аудиофрагмент слишком большой для текущих настроек (${Math.ceil(buffer.byteLength / 1024 / 1024)} МБ из ${Math.ceil(
        maxChunkBytes / 1024 / 1024
      )} МБ). Запишите короче или дождитесь отправки очереди.`
    );
  }
  return buffer;
}

function publicProviderFailureReason(error: unknown): string {
  return speechProviderFailureReason(error);
}

function fileNameForMime(mimeType: string): string {
  if (mimeType.includes("ogg")) return "chunk.ogg";
  if (mimeType.includes("wav")) return "chunk.wav";
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "chunk.m4a";
  return "chunk.webm";
}

function normalizeLanguage(value: string): string {
  const lower = value.toLowerCase();
  if (lower.startsWith("ru")) return "ru";
  if (lower.startsWith("en")) return "en";
  return lower.slice(0, 8);
}

function uniqueNonEmpty(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => sanitizeProviderErrorMessage(value).trim()).filter(Boolean)));
}

function countTranscriptWords(text: string): number {
  return text.match(/[A-Za-zА-Яа-яЁё0-9]+(?:[-'][A-Za-zА-Яа-яЁё0-9]+)*/g)?.length ?? 0;
}

function roundMetric(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function confidenceFromWhisperLogprob(values: number[]): number | null {
  const cleanValues = values.filter((value) => Number.isFinite(value));
  if (!cleanValues.length) return null;
  const averageLogprob = cleanValues.reduce((total, value) => total + value, 0) / cleanValues.length;
  return roundMetric(Math.max(0, Math.min(1, Math.exp(averageLogprob))));
}

function buildSpeechTranscriptionQuality(input: {
  transcript: string;
  confidence: number | null;
  status: SpeechTranscriptionStatus;
  warnings: string[];
  byteLength: number;
  durationMs: number | null;
  providerLabel: string;
}): SpeechTranscriptionQuality {
  const normalizedTranscript = input.transcript.replace(/\s+/g, " ").trim();
  const wordCount = countTranscriptWords(normalizedTranscript);
  const charCount = normalizedTranscript.length;
  const durationMs = input.durationMs && input.durationMs > 0 ? input.durationMs : null;
  const bytesPerSecond = durationMs ? roundMetric(input.byteLength / (durationMs / 1000), 1) : null;
  const providerWarnings = uniqueNonEmpty(input.warnings).slice(0, 8);
  const signals: string[] = [];

  if (input.status === "failed") signals.push("provider_failed");
  if (input.status === "fallback_text") signals.push("local_fallback_transcript");
  if (input.status === "needs_provider_key") signals.push("provider_key_missing");
  if (!normalizedTranscript) signals.push("empty_transcript");
  if (input.confidence !== null && input.confidence < 0.72) signals.push("low_confidence");
  if (durationMs !== null && durationMs > 6000 && wordCount <= 1) signals.push("short_text_for_audio");
  if (durationMs !== null && durationMs > 120000) signals.push("long_chunk");
  if (bytesPerSecond !== null && bytesPerSecond > 0 && bytesPerSecond < 500) signals.push("tiny_audio_payload");
  if (providerWarnings.length) signals.push("provider_warning");

  const uniqueSignals = uniqueNonEmpty(signals);
  const level: SpeechTranscriptionQuality["level"] =
    input.status === "failed"
      ? "failed"
      : !normalizedTranscript
        ? "empty"
        : uniqueSignals.length
          ? "review"
          : "clear";
  const emptyNextAction = uniqueSignals.includes("tiny_audio_payload")
    ? "CRM получила почти пустой аудиофрагмент. Проверьте выбранный микрофон, говорите ближе и повторите запись."
    : providerWarnings.some((warning) => /тишин|пуст/i.test(warning))
      ? "Похоже, в фрагменте была тишина или голос был слишком далеко. Проверьте микрофон и повторите фразу."
      : durationMs !== null && durationMs > 6000
        ? "Запись длинная, но слов нет. Проверьте, выбран ли правильный микрофон, и повторите фразу ближе к нему."
        : "Повторите фразу ближе к микрофону или допечатайте текст вручную.";
  const nextAction =
    level === "clear"
      ? "Можно использовать как черновик; врач подтверждает смысл перед сохранением."
      : level === "review"
        ? `Проверьте фрагмент ${input.providerLabel}: распознавание сохранило текст, но есть признаки риска.`
        : level === "empty"
          ? `Не блокировать прием: ${emptyNextAction}`
          : !normalizedTranscript
            ? `Не блокировать прием: ${emptyNextAction}`
          : "Не блокировать прием: фрагмент сохранен в аудио/recovery, используйте локальный текст или повторите отправку.";

  return {
    level,
    confidence: input.confidence,
    wordCount,
    charCount,
    durationMs,
    bytesPerSecond,
    providerWarnings,
    signals: uniqueSignals,
    nextAction
  };
}

async function transcribeOpenAiCompatible(input: {
  endpoint: string;
  apiKey?: string | null;
  model: string;
  audio: Buffer;
  mimeType: string;
  language: string;
  responseFormat?: "json" | "verbose_json";
  prompt?: string | null;
  timeoutMs?: number;
}): Promise<ProviderTranscript> {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(input.audio)], { type: input.mimeType }), fileNameForMime(input.mimeType));
  form.append("model", input.model);
  form.append("language", normalizeLanguage(input.language));
  form.append("response_format", input.responseFormat ?? "json");
  if (input.prompt?.trim()) form.append("prompt", input.prompt.trim());

  const headers: Record<string, string> = {};
  if (input.apiKey?.trim()) {
    headers.Authorization = `Bearer ${input.apiKey.trim()}`;
  }

  const response = await fetchWithProviderTimeout(input.endpoint, {
    method: "POST",
    headers,
    body: form
  }, input.timeoutMs);
  const payload = (await response.json().catch(() => ({}))) as {
    text?: unknown;
    segments?: Array<{
      text?: unknown;
      avg_logprob?: unknown;
      compression_ratio?: unknown;
      no_speech_prob?: unknown;
    }>;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw providerHttpError(response.status, response.statusText, payload.error?.message);
  }

  const segmentWarnings: string[] = [];
  const segmentAvgLogprobs = payload.segments
    ?.map((segment) => segment.avg_logprob)
    .filter((value): value is number => typeof value === "number") ?? [];
  const noSpeechSegments =
    payload.segments?.filter((segment) => typeof segment.no_speech_prob === "number" && segment.no_speech_prob > 0.6)
      .length ?? 0;
  const compressedSegments =
    payload.segments?.filter(
      (segment) => typeof segment.compression_ratio === "number" && segment.compression_ratio > 2.4
    ).length ?? 0;
  if (noSpeechSegments) {
    segmentWarnings.push(`${noSpeechSegments} фрагмент(ов) похожи на тишину; проверьте, не попал ли в запись пустой участок.`);
  }
  if (compressedSegments) {
    segmentWarnings.push(
      `${compressedSegments} фрагмент(ов) похожи на сжатый или повторяющийся звук; проверьте текст перед сохранением.`
    );
  }

  return {
    text: typeof payload.text === "string" ? payload.text.trim() : "",
    confidence: confidenceFromWhisperLogprob(segmentAvgLogprobs),
    warnings: segmentWarnings
  };
}

function stringFromRecord(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function numberFromUnknown(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function averageConfidence(values: number[]): number | null {
  const filtered = values.filter((value) => Number.isFinite(value) && value >= 0 && value <= 1);
  if (!filtered.length) return null;
  return Math.max(0, Math.min(1, filtered.reduce((sum, value) => sum + value, 0) / filtered.length));
}

function textFromVoskPayload(payload: Record<string, unknown>): string {
  const directText = stringFromRecord(payload, ["text", "transcript", "partial"]);
  if (directText) return directText;

  const result = payload.result;
  if (result && typeof result === "object" && !Array.isArray(result)) {
    const resultText = stringFromRecord(result as Record<string, unknown>, ["text", "transcript"]);
    if (resultText) return resultText;
  }
  if (Array.isArray(result)) {
    const words = result
      .map((item) => (item && typeof item === "object" ? stringFromRecord(item as Record<string, unknown>, ["word", "text"]) : ""))
      .filter(Boolean);
    if (words.length) return words.join(" ");
  }

  const alternatives = payload.alternatives;
  if (Array.isArray(alternatives)) {
    const alternative = alternatives.find((item) => item && typeof item === "object") as Record<string, unknown> | undefined;
    if (alternative) return stringFromRecord(alternative, ["text", "transcript"]);
  }

  return "";
}

function confidenceFromVoskPayload(payload: Record<string, unknown>): number | null {
  const directConfidence = numberFromUnknown(payload.confidence);
  if (directConfidence !== null) return Math.max(0, Math.min(1, directConfidence));

  const result = payload.result;
  if (Array.isArray(result)) {
    return averageConfidence(
      result
        .map((item) => (item && typeof item === "object" ? numberFromUnknown((item as Record<string, unknown>).conf) : null))
        .filter((value): value is number => value !== null)
    );
  }

  const alternatives = payload.alternatives;
  if (Array.isArray(alternatives)) {
    return averageConfidence(
      alternatives
        .map((item) =>
          item && typeof item === "object" ? numberFromUnknown((item as Record<string, unknown>).confidence) : null
        )
        .filter((value): value is number => value !== null)
    );
  }

  return null;
}

function errorMessageFromPayload(payload: Record<string, unknown>): string | undefined {
  const directError = payload.error;
  if (typeof directError === "string") return directError;
  if (directError && typeof directError === "object") {
    const message = (directError as Record<string, unknown>).message;
    if (typeof message === "string") return message;
  }
  const message = payload.message;
  return typeof message === "string" ? message : undefined;
}

async function transcribeLocalWhisperBridge(input: {
  audio: Buffer;
  mimeType: string;
  language: string;
}): Promise<ProviderTranscript> {
  const endpoint = localSpeechTranscribeUrl("local_whisper");
  if (!endpoint) {
    throw new Error(
      "Локальный модуль Whisper.cpp не настроен: укажите адрес локального модуля в серверных настройках клиники."
    );
  }

  const result = await transcribeOpenAiCompatible({
    endpoint,
    apiKey: localSpeechApiKey("local_whisper"),
    model: process.env.DENTAL_LOCAL_WHISPER_MODEL ?? process.env.WHISPER_CPP_MODEL ?? "whisper.cpp",
    audio: input.audio,
    mimeType: input.mimeType,
    language: input.language,
    responseFormat: "verbose_json",
    timeoutMs: localSpeechTimeoutMs()
  });
  result.warnings.push(
    "Использован локальный модуль Whisper.cpp; текст нужно проверить, потому что точность зависит от размера и настроек локальной модели."
  );
  return result;
}

async function transcribeLocalVoskBridge(input: {
  audio: Buffer;
  mimeType: string;
  language: string;
  specialty?: DentalSpecialty | null;
  source?: SpeechChunkUploadInput["source"];
}): Promise<ProviderTranscript> {
  const endpoint = localSpeechTranscribeUrl("vosk_local");
  if (!endpoint) {
    throw new Error("Локальный модуль Vosk не настроен: укажите адрес локального модуля в серверных настройках клиники.");
  }

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(input.audio)], { type: input.mimeType }), fileNameForMime(input.mimeType));
  form.append("language", normalizeLanguage(input.language));
  if (input.source) form.append("source", input.source);
  if (input.specialty) form.append("specialty", input.specialty);

  const headers: Record<string, string> = {};
  const apiKey = localSpeechApiKey("vosk_local");
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const response = await fetchWithProviderTimeout(
    endpoint,
    {
      method: "POST",
      headers,
      body: form
    },
    localSpeechTimeoutMs()
  );
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw providerHttpError(response.status, response.statusText, errorMessageFromPayload(payload));
  }

  const text = textFromVoskPayload(payload);
  return {
    text,
    confidence: confidenceFromVoskPayload(payload),
    warnings: text
      ? ["Использован локальный модуль Vosk; пунктуацию и стоматологические термины нужно проверить перед подписанием."]
      : ["Локальный модуль Vosk не вернул текст; оставьте печатный локальный черновик как восстановление."]
  };
}

async function transcribeDeepgram(input: {
  apiKey: string;
  audio: Buffer;
  mimeType: string;
  language: string;
  specialty?: DentalSpecialty | null;
  source?: SpeechChunkUploadInput["source"];
}): Promise<ProviderTranscript> {
  const language = normalizeLanguage(input.language);
  const url = new URL("https://api.deepgram.com/v1/listen");
  url.searchParams.set("model", process.env.DEEPGRAM_STT_MODEL ?? "nova-3");
  url.searchParams.set("language", language);
  url.searchParams.set("smart_format", "true");
  url.searchParams.set("punctuate", "true");

  const response = await fetchWithProviderTimeout(url, {
    method: "POST",
    headers: {
      Authorization: `Token ${input.apiKey}`,
      "Content-Type": input.mimeType
    },
    body: input.audio
  });
  const payload = (await response.json().catch(() => ({}))) as {
    err_msg?: string;
    results?: { channels?: Array<{ alternatives?: Array<{ transcript?: string; confidence?: number }> }> };
  };
  if (!response.ok) {
    throw providerHttpError(response.status, response.statusText, payload.err_msg);
  }
  const alternative = payload.results?.channels?.[0]?.alternatives?.[0];
  return {
    text: alternative?.transcript?.trim() ?? "",
    confidence: typeof alternative?.confidence === "number" ? alternative.confidence : null,
    warnings: []
  };
}

async function transcribeAssemblyAi(input: {
  apiKey: string;
  audio: Buffer;
  mimeType: string;
  language: string;
  specialty?: DentalSpecialty | null;
  source?: SpeechChunkUploadInput["source"];
}): Promise<ProviderTranscript> {
  const uploadResponse = await fetchWithProviderTimeout("https://api.assemblyai.com/v2/upload", {
    method: "POST",
    headers: {
      Authorization: input.apiKey,
      "Content-Type": input.mimeType
    },
    body: input.audio
  });
  const uploadPayload = (await uploadResponse.json().catch(() => ({}))) as { upload_url?: string; error?: string };
  if (!uploadResponse.ok || !uploadPayload.upload_url) {
    throw providerHttpError(uploadResponse.status, uploadResponse.statusText, uploadPayload.error);
  }

  const transcriptResponse = await fetchWithProviderTimeout("https://api.assemblyai.com/v2/transcript", {
    method: "POST",
    headers: {
      Authorization: input.apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      audio_url: uploadPayload.upload_url,
      language_code: normalizeLanguage(input.language),
      punctuate: true,
      format_text: true
    })
  });
  const transcriptPayload = (await transcriptResponse.json().catch(() => ({}))) as { id?: string; error?: string };
  if (!transcriptResponse.ok || !transcriptPayload.id) {
    throw providerHttpError(transcriptResponse.status, transcriptResponse.statusText, transcriptPayload.error);
  }

  const pollAttempts = numberFromEnv("ASSEMBLYAI_POLL_ATTEMPTS", 15);
  for (let attempt = 0; attempt < pollAttempts; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const pollResponse = await fetchWithProviderTimeout(`https://api.assemblyai.com/v2/transcript/${transcriptPayload.id}`, {
      headers: { Authorization: input.apiKey }
    });
    const pollPayload = (await pollResponse.json().catch(() => ({}))) as {
      status?: string;
      text?: string;
      confidence?: number;
      error?: string;
    };
    if (!pollResponse.ok) {
      throw providerHttpError(pollResponse.status, pollResponse.statusText, pollPayload.error);
    }
    if (pollPayload.status === "completed") {
      return {
        text: pollPayload.text?.trim() ?? "",
        confidence: typeof pollPayload.confidence === "number" ? pollPayload.confidence : null,
        warnings: []
      };
    }
    if (pollPayload.status === "error") {
      throw new Error("AssemblyAI не вернул готовый текст; локальный черновик сохранен, повторите отправку позже.");
    }
  }

  throw new Error("AssemblyAI не успел обработать фрагмент. Укоротите запись или отправьте позже; локальный черновик сохранен.");
}

async function transcribeCloudflareWhisper(input: {
  apiKey: string;
  audio: Buffer;
  mimeType: string;
}): Promise<ProviderTranscript> {
  const accountId = cloudflareAccountId();
  if (!accountId) {
    throw new Error(
      "Cloudflare Workers AI Whisper не настроен полностью: заполните недостающий пункт в серверных настройках распознавания."
    );
  }

  const model = (process.env.CLOUDFLARE_WHISPER_MODEL ?? "@cf/openai/whisper").trim();
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${model}`;
  const response = await fetchWithProviderTimeout(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": input.mimeType || "application/octet-stream"
    },
    body: input.audio
  });
  const payload = (await response.json().catch(() => ({}))) as {
    success?: boolean;
    result?: { text?: unknown; transcription_info?: { duration?: unknown }; word_count?: unknown };
    text?: unknown;
    errors?: Array<{ message?: string }>;
  };
  if (!response.ok || payload.success === false) {
    throw providerHttpError(response.status, response.statusText, payload.errors?.[0]?.message);
  }

  const result = payload.result ?? payload;
  return {
    text: typeof result.text === "string" ? result.text.trim() : "",
    confidence: null,
    warnings: []
  };
}

async function transcribeWithProvider(input: {
  providerId: SpeechGatewayProvider;
  audio: Buffer;
  mimeType: string;
  language: string;
  specialty?: DentalSpecialty | null;
  source?: SpeechChunkUploadInput["source"];
  abortSignal?: AbortSignal;
}): Promise<ProviderTranscript> {
  if (input.providerId === "local_whisper") {
    return transcribeLocalWhisperBridge({
      audio: input.audio,
      mimeType: input.mimeType,
      language: input.language
    });
  }
  if (input.providerId === "vosk_local") {
    return transcribeLocalVoskBridge({
      audio: input.audio,
      mimeType: input.mimeType,
      language: input.language,
      specialty: input.specialty ?? null,
      ...(input.source ? { source: input.source } : {})
    });
  }

  if (!providerKeyCount(input.providerId)) {
    throw new Error(
      `Для ${providerLabels[input.providerId]} не настроен серверный доступ. До подключения врач может использовать локальный текст или браузерную диктовку.`
    );
  }
  const missingConfigEnvVars = providerConfigMissingEnvVars(input.providerId);
  if (missingConfigEnvVars.length) {
    throw new Error(`${providerLabels[input.providerId]}: не хватает серверных настроек (${missingConfigEnvVars.length})`);
  }

  const triedFingerprints = new Set<string>();
  const maxAttempts = keyRetryLimit(input.providerId);
  let lastError: unknown = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const keyCandidate = selectProviderKey(input.providerId, triedFingerprints);
    if (!keyCandidate) break;
    triedFingerprints.add(keyCandidate.fingerprint);

    try {
      let result: ProviderTranscript;
      if (input.providerId === "groq_whisper") {
        const prompt = buildDentalSttPrompt({
          providerId: "groq_whisper",
          specialty: input.specialty ?? null,
          source: input.source ?? "visit"
        });
        result = await transcribeOpenAiCompatible({
          endpoint: "https://api.groq.com/openai/v1/audio/transcriptions",
          apiKey: keyCandidate.value,
          model: process.env.GROQ_STT_MODEL ?? "whisper-large-v3-turbo",
          audio: input.audio,
          mimeType: input.mimeType,
          language: input.language,
          responseFormat: "verbose_json",
          prompt
        });
      } else if (input.providerId === "openai_transcribe") {
        const prompt = buildDentalSttPrompt({
          providerId: "openai_transcribe",
          specialty: input.specialty ?? null,
          source: input.source ?? "visit"
        });
        result = await transcribeOpenAiCompatible({
          endpoint: "https://api.openai.com/v1/audio/transcriptions",
          apiKey: keyCandidate.value,
          model: process.env.OPENAI_STT_MODEL ?? "gpt-4o-mini-transcribe",
          audio: input.audio,
          mimeType: input.mimeType,
          language: input.language,
          prompt
        });
      } else if (input.providerId === "deepgram_streaming") {
        result = await transcribeDeepgram({
          apiKey: keyCandidate.value,
          audio: input.audio,
          mimeType: input.mimeType,
          language: input.language
        });
      } else if (input.providerId === "assemblyai_async") {
        result = await transcribeAssemblyAi({
          apiKey: keyCandidate.value,
          audio: input.audio,
          mimeType: input.mimeType,
          language: input.language
        });
      } else if (input.providerId === "cloudflare_whisper") {
        result = await transcribeCloudflareWhisper({
          apiKey: keyCandidate.value,
          audio: input.audio,
          mimeType: input.mimeType
        });
      } else {
        throw new Error(
          `${providerLabels[input.providerId]} есть в каталоге, но прямое серверное распознавание пока не включено. Выберите подключенный источник или браузерную диктовку.`
        );
      }

      recordProviderKeySuccess(input.providerId, keyCandidate);
      if (attempt > 0) {
        result.warnings.push(`${providerLabels[input.providerId]} восстановился после резервной попытки N ${attempt + 1}.`);
      }
      return result;
    } catch (error) {
      lastError = error;
      recordProviderKeyFailure(input.providerId, keyCandidate, error);
      if (!shouldTryNextProviderKey(error)) break;
    }
  }

  const summary = getProviderKeyPoolSummary(input.providerId);
  const detail = publicProviderFailureReason(lastError);
  if (lastError instanceof SpeechProviderRequestError) {
    throw lastError;
  }
  throw new Error(
    `${providerLabels[input.providerId]} не распознал фрагмент после ${triedFingerprints.size}/${maxAttempts} попыток; доступных маршрутов ${summary.availableKeyCount}/${summary.configuredKeyCount}. ${detail}. Локальный черновик и очередь повтора сохранены.`
  );
}

export async function transcribeSpeechChunk(input: SpeechChunkUploadInput): Promise<SpeechTranscriptionResponse> {
  const gateway = getSpeechGatewayStatus();
  const audio = decodeBase64Audio(input.audioBase64, gateway.maxChunkBytes);
  const localTranscript = input.localTranscript?.trim() ?? "";
  const warnings: string[] = [];
  let transcript = "";
  let confidence: number | null = null;
  let responseStatus: SpeechTranscriptionStatus = "failed";
  let usedProviderId: SpeechGatewayProvider = gateway.providerId;
  let usedProviderLabel = gateway.providerLabel;

  if (!audio.byteLength && localTranscript) {
    transcript = localTranscript;
    responseStatus = "fallback_text";
    warnings.push("Сохранен браузерный или локальный текст без отправки аудио во внешний контур.");
  } else if (!gateway.serverTranscriptionEnabled) {
    transcript = localTranscript;
    responseStatus = "needs_provider_key";
    warnings.push(...gateway.warnings);
    if (!transcript) warnings.push("Аудио принято, но серверное распознавание не запущено без доступного источника.");
  } else if (!gateway.serverTranscriptionCurrentlyAvailable) {
    transcript = localTranscript;
    responseStatus = localTranscript ? "fallback_text" : "needs_provider_key";
    warnings.push(...gateway.warnings);
    warnings.push(
      "Аудио не отправлено: сейчас нет доступного источника распознавания или локального модуля; сохраните клиентскую очередь аудио и повторите позже."
    );
  } else {
    const providerAttempts = gateway.fallbackProviderIds.length ? gateway.fallbackProviderIds : [gateway.providerId];
    for (const providerId of providerAttempts) {
      if (!isWiredServerProvider(providerId) && !isLocalSpeechProvider(providerId)) continue;
      try {
        const providerResult = await transcribeWithProvider({
          providerId,
          audio,
          mimeType: input.mimeType,
          language: input.language,
          specialty: input.specialty ?? null,
          source: input.source
        });
        usedProviderId = providerId;
        usedProviderLabel = providerLabels[providerId];
        confidence = providerResult.confidence;
        warnings.push(...providerResult.warnings);
        if (providerResult.text) {
          transcript = providerResult.text;
          responseStatus = "transcribed";
          break;
        }
        warnings.push(`${providerLabels[providerId]} не вернул текст.`);
        if (localTranscript) {
          transcript = localTranscript;
          responseStatus = "fallback_text";
          break;
        }
      } catch (error) {
        warnings.push(publicSpeechProviderFailure(providerLabels[providerId], error));
      }
    }
    if (responseStatus === "failed") {
      transcript = localTranscript;
      responseStatus = localTranscript ? "fallback_text" : "failed";
      if (localTranscript) {
        warnings.push("Локальный текст сохранен, врач может продолжать без блокировки.");
      } else {
        warnings.push("Ни один источник распознавания из резервной цепочки не вернул текст.");
      }
    }
  }

  const quality = buildSpeechTranscriptionQuality({
    transcript,
    confidence,
    status: responseStatus,
    warnings,
    byteLength: audio.byteLength,
    durationMs: input.durationMs ?? null,
    providerLabel: usedProviderLabel
  });

  const chunk = recordSpeechTranscriptionChunk({
    recordingId: input.recordingId,
    chunkIndex: input.chunkIndex,
    source: input.source,
    patientId: input.patientId ?? null,
    visitId: input.visitId ?? null,
    providerId: usedProviderId,
    providerLabel: usedProviderLabel,
    mimeType: input.mimeType,
    byteLength: audio.byteLength,
    durationMs: input.durationMs ?? null,
    language: input.language,
    transcript,
    confidence,
    status: responseStatus,
    quality,
    warnings,
    clientRecordedAt: input.clientRecordedAt ?? null
  });

  return { chunk, gateway };
}
