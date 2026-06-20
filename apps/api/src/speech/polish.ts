import {
  buildRuleBasedVisitDraftFromTranscript,
  normalizeDentalSpeechTranscript,
  type DentalSpecialty,
  type SpeechGatewayProvider,
  type SpeechTranscriptPolishRequest,
  type SpeechTranscriptPolishResponse
} from "@dental/shared";
import {
  fetchWithProviderTimeout,
  getProviderKeyPoolSummary,
  keyRetryLimit,
  providerHttpError,
  recordProviderKeyFailure,
  recordProviderKeySuccess,
  sanitizeProviderErrorMessage,
  selectProviderKey,
  SpeechProviderRequestError,
  shouldTryNextProviderKey
} from "./keyPool.js";

type SpeechPolishProvider = "none" | "openai" | "groq" | "custom";

type SpeechPolishConfig = {
  deterministicEnabled: true;
  neuralEnabled: boolean;
  provider: SpeechPolishProvider;
  providerLabel: string;
  baseUrl: string | null;
  explicitApiKey: string | null;
  keyProviderId: SpeechGatewayProvider | null;
  modelName: string | null;
  maxTranscriptChars: number;
  warnings: string[];
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
  error?: {
    message?: string;
  };
};

type NeuralPolishPayload = {
  normalizedTranscript?: unknown;
  warnings?: unknown;
};

const polishProviderLabels: Record<SpeechPolishProvider, string> = {
  none: "Только локальный парсер правил",
  openai: "серверная очистка диктовки",
  groq: "быстрая серверная очистка диктовки",
  custom: "очистка диктовки через сервер клиники"
};

function booleanFromEnv(value: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes((value ?? "").trim().toLowerCase());
}

function numberFromEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function selectedPolishProvider(): SpeechPolishProvider {
  const rawProvider = (process.env.DENTAL_SPEECH_POLISH_PROVIDER ?? "").trim().toLowerCase();
  if (rawProvider === "openai" || rawProvider === "groq" || rawProvider === "custom") return rawProvider;
  if (process.env.DENTAL_SPEECH_POLISH_BASE_URL?.trim()) return "custom";
  return "none";
}

function baseUrlForProvider(provider: SpeechPolishProvider): string | null {
  const explicitBaseUrl = process.env.DENTAL_SPEECH_POLISH_BASE_URL?.trim().replace(/\/+$/, "");
  if (explicitBaseUrl) return explicitBaseUrl;
  if (provider === "openai") return "https://api.openai.com/v1";
  if (provider === "groq") return "https://api.groq.com/openai/v1";
  return null;
}

function apiKeyForProvider(provider: SpeechPolishProvider): string | null {
  const explicitKey = process.env.DENTAL_SPEECH_POLISH_API_KEY?.trim();
  return explicitKey || null;
}

function keyProviderForPolishProvider(provider: SpeechPolishProvider): SpeechGatewayProvider | null {
  if (provider === "openai") return "openai_transcribe";
  if (provider === "groq") return "groq_whisper";
  return null;
}

function modelForProvider(provider: SpeechPolishProvider): string | null {
  const explicitModel = process.env.DENTAL_SPEECH_POLISH_MODEL?.trim();
  if (explicitModel) return explicitModel;
  if (provider === "openai") return "gpt-4o-mini";
  if (provider === "groq") return "openai/gpt-oss-20b";
  return null;
}

function speechPolishFailureReason(error: unknown): string {
  if (error instanceof SpeechProviderRequestError) {
    if (error.timedOut) return "серверная очистка не ответила вовремя";
    if (error.rateLimited || error.statusCode === 429) return "серверная очистка временно ограничила запросы";
    if (error.statusCode === 401 || error.statusCode === 403) return "серверный доступ к очистке отклонен";
    if (error.statusCode && error.statusCode >= 500) return "у сервиса очистки временный сбой";
    if (error.statusCode) return "сервис очистки отклонил запрос";
  }
  const message = sanitizeProviderErrorMessage(error instanceof Error ? error.message : String(error ?? "")).toLowerCase();
  if (/fetch failed|network|econnreset|econnrefused|etimedout|timeout|socket|terminated|temporar|dns|enotfound/.test(message)) {
    return "нет устойчивого соединения с сервисом очистки";
  }
  return "серверная очистка не вернула готовый текст";
}

function createSpeechPolishConfig(): SpeechPolishConfig {
  const requested = booleanFromEnv(process.env.DENTAL_SPEECH_NEURAL_POLISH);
  const provider = selectedPolishProvider();
  const baseUrl = baseUrlForProvider(provider);
  const explicitApiKey = apiKeyForProvider(provider);
  const keyProviderId = keyProviderForPolishProvider(provider);
  const modelName = modelForProvider(provider);
  const maxTranscriptChars = numberFromEnv("DENTAL_SPEECH_POLISH_MAX_CHARS", 8_000);
  const keyPool = keyProviderId ? getProviderKeyPoolSummary(keyProviderId) : null;
  const hasKey = Boolean(explicitApiKey || (keyPool && keyPool.availableKeyCount > 0));
  const warnings: string[] = [];

  if (!requested) {
    warnings.push("Дополнительная очистка диктовки отключена; работает локальный стоматологический разбор.");
  } else if (provider === "none" || !baseUrl || !modelName) {
    warnings.push("Дополнительная очистка диктовки запрошена, но серверный маршрут не настроен полностью.");
  } else if (!hasKey) {
    warnings.push(
      keyPool && keyPool.configuredKeyCount > 0
        ? "Дополнительная очистка диктовки запрошена, но все серверные доступы временно на паузе."
        : "Дополнительная очистка диктовки запрошена, но серверный доступ не настроен."
    );
  } else if (explicitApiKey) {
    warnings.push("Дополнительная очистка диктовки использует отдельный серверный доступ; браузеру он не показывается.");
  } else if (keyPool && keyPool.rotationEnabled) {
    warnings.push(
      `Резерв серверной очистки диктовки активен: доступно ${keyPool.availableKeyCount}/${keyPool.configuredKeyCount} маршрутов.`
    );
  }

  return {
    deterministicEnabled: true,
    neuralEnabled: requested && provider !== "none" && Boolean(baseUrl && modelName && hasKey),
    provider,
    providerLabel: polishProviderLabels[provider],
    baseUrl,
    explicitApiKey,
    keyProviderId,
    modelName,
    maxTranscriptChars,
    warnings
  };
}

export function getSpeechPolishPolicy() {
  const config = createSpeechPolishConfig();
  return {
    deterministicEnabled: config.deterministicEnabled,
    neuralEnabled: config.neuralEnabled,
    providerLabel: config.providerLabel,
    modelName: config.modelName,
    maxTranscriptChars: config.maxTranscriptChars,
    warnings: config.warnings
  };
}

function contentToString(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "text" in item) {
        const value = (item as { text?: unknown }).text;
        return typeof value === "string" ? value : "";
      }
      return "";
    })
    .join("");
}

function parseJsonObject(text: string): NeuralPolishPayload {
  const trimmed = text.trim();
  const direct = JSON.parse(trimmed) as NeuralPolishPayload;
  return direct;
}

function safeParseJsonObject(text: string): NeuralPolishPayload {
  try {
    return parseJsonObject(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match?.[0]) throw new Error("Дополнительная очистка диктовки вернула нечитаемый структурированный ответ.");
    return parseJsonObject(match[0]);
  }
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => sanitizeProviderErrorMessage(value).trim()).filter(Boolean)));
}

function normalizeWarnings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 8);
}

function extractToothCodes(text: string): string[] {
  return uniqueStrings(text.match(/\b(?:1[1-8]|2[1-8]|3[1-8]|4[1-8]|5[1-5]|6[1-5]|7[1-5]|8[1-5])\b/g) ?? []);
}

function extractDiagnosisCodes(text: string): string[] {
  return uniqueStrings(text.toUpperCase().match(/\bK(?:0[0-9]|1[0-4])(?:\.[0-9A-Z]+)?\b/g) ?? []);
}

function addedTokens(before: string[], after: string[]): string[] {
  const known = new Set(before);
  return after.filter((item) => !known.has(item));
}

function safetyCheckNeuralPolish(source: string, result: string): { ok: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const sourceLength = source.trim().length;
  const resultLength = result.trim().length;

  if (!result.trim()) {
    return { ok: false, warnings: ["Дополнительная очистка диктовки вернула пустой текст."] };
  }
  if (sourceLength > 80 && resultLength < sourceLength * 0.45) {
    return { ok: false, warnings: ["Дополнительная очистка диктовки удалила слишком много текста; сохранен локальный вариант."] };
  }
  if (resultLength > Math.max(sourceLength * 1.7, sourceLength + 600)) {
    return { ok: false, warnings: ["Дополнительная очистка диктовки слишком расширила текст; сохранен локальный вариант."] };
  }

  const addedTeeth = addedTokens(extractToothCodes(source), extractToothCodes(result));
  if (addedTeeth.length) {
    return { ok: false, warnings: [`Дополнительная очистка диктовки добавила номера зубов ${addedTeeth.join(", ")}; сохранен локальный вариант.`] };
  }

  const addedDiagnoses = addedTokens(extractDiagnosisCodes(source), extractDiagnosisCodes(result));
  if (addedDiagnoses.length) {
    return { ok: false, warnings: [`Дополнительная очистка диктовки добавила коды диагноза ${addedDiagnoses.join(", ")}; сохранен локальный вариант.`] };
  }

  warnings.push("Дополнительная очистка диктовки принята после проверок длины, зубов и диагнозов; проверка врачом все равно обязательна.");
  return { ok: true, warnings };
}

async function callOpenAiCompatiblePolish(input: {
  config: SpeechPolishConfig;
  transcript: string;
  specialty: DentalSpecialty;
  apiKey: string;
}): Promise<{ normalizedTranscript: string; warnings: string[] }> {
  if (!input.config.baseUrl || !input.config.modelName) {
    throw new Error("Дополнительная очистка диктовки не настроена.");
  }

  const requestBody = {
    model: input.config.modelName,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          "You are a cautious dental transcription editor for Russian dental dictation. Return strict JSON only.",
          "You may fix punctuation, line breaks, casing, and obvious speech-to-text dental spelling: коффердам, перкуссия, зондирование, кариес, пульпит, периодонтит, RVG, ОПТГ, КЛКТ, ЭОД.",
          "Keep FDI tooth numbers exactly as heard; convert spoken Russian FDI forms only when unambiguous, for example 'три шесть' near a tooth mention may be 36.",
          "Preserve section cues such as жалобы, анамнез, объективно, диагноз, проведено, рекомендации so the card can be filled correctly.",
          "Never add diagnoses, procedures, tooth numbers, medications, measurements, dates, payments, or clinical facts. Preserve uncertainty."
        ].join(" ")
      },
      {
        role: "user",
        content: [
          `Dental specialty: ${input.specialty}.`,
          "Return JSON with keys normalizedTranscript and warnings.",
          "Rewrite only the text below:",
          input.transcript
        ].join("\n\n")
      }
    ]
  };

  const response = await fetchWithProviderTimeout(
    `${input.config.baseUrl}/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    },
    numberFromEnv("DENTAL_SPEECH_POLISH_TIMEOUT_MS", 30_000)
  );
  const payload = (await response.json().catch(() => ({}))) as ChatCompletionResponse;
  if (!response.ok) {
    throw providerHttpError(response.status, response.statusText, payload.error?.message);
  }

  const content = contentToString(payload.choices?.[0]?.message?.content);
  const parsed = safeParseJsonObject(content);
  if (typeof parsed.normalizedTranscript !== "string") {
    throw new Error("Дополнительная очистка диктовки вернула ответ без готового текста.");
  }

  return {
    normalizedTranscript: parsed.normalizedTranscript.trim(),
    warnings: normalizeWarnings(parsed.warnings)
  };
}

async function callOpenAiCompatiblePolishWithKeyRotation(input: {
  config: SpeechPolishConfig;
  transcript: string;
  specialty: DentalSpecialty;
}): Promise<{ normalizedTranscript: string; warnings: string[] }> {
  if (input.config.explicitApiKey) {
    return callOpenAiCompatiblePolish({ ...input, apiKey: input.config.explicitApiKey });
  }

  const keyProviderId = input.config.keyProviderId;
  if (!keyProviderId) {
    throw new Error("Резерв серверной очистки диктовки не настроен.");
  }

  const triedFingerprints = new Set<string>();
  const maxAttempts = keyRetryLimit(keyProviderId);
  let lastError: unknown = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const keyCandidate = selectProviderKey(keyProviderId, triedFingerprints);
    if (!keyCandidate) break;
    triedFingerprints.add(keyCandidate.fingerprint);

    try {
      const result = await callOpenAiCompatiblePolish({
        ...input,
        apiKey: keyCandidate.value
      });
      recordProviderKeySuccess(keyProviderId, keyCandidate);
      if (attempt > 0) {
        result.warnings.push(`Дополнительная очистка диктовки восстановилась после резервной попытки ${attempt + 1}.`);
      }
      return result;
    } catch (error) {
      lastError = error;
      recordProviderKeyFailure(keyProviderId, keyCandidate, error);
      if (!shouldTryNextProviderKey(error)) break;
    }
  }

  const summary = getProviderKeyPoolSummary(keyProviderId);
  const detail = lastError ? speechPolishFailureReason(lastError) : "все серверные доступы временно на паузе";
  if (lastError instanceof SpeechProviderRequestError) {
    throw lastError;
  }
  throw new Error(
    `${input.config.providerLabel}: сбой после ${triedFingerprints.size}/${maxAttempts} попыток; доступно ${summary.availableKeyCount}/${summary.configuredKeyCount} серверных маршрутов. ${detail}`
  );
}

export async function polishSpeechTranscript(
  input: SpeechTranscriptPolishRequest
): Promise<SpeechTranscriptPolishResponse> {
  const deterministic = normalizeDentalSpeechTranscript(input.transcript, input.specialty);
  let normalizedTranscript = deterministic.normalizedText;
  let polishMode: "deterministic" | "deterministic_neural" = "deterministic";
  let modelName: string | null = null;
  const neuralWarnings: string[] = [];

  const config = createSpeechPolishConfig();
  if (config.neuralEnabled) {
    if (normalizedTranscript.length > config.maxTranscriptChars) {
      neuralWarnings.push("Дополнительная очистка диктовки пропущена: расшифровка длиннее настроенного лимита.");
    } else {
      try {
        const neural = await callOpenAiCompatiblePolishWithKeyRotation({
          config,
          transcript: normalizedTranscript,
          specialty: input.specialty
        });
        const safety = safetyCheckNeuralPolish(normalizedTranscript, neural.normalizedTranscript);
        neuralWarnings.push(...neural.warnings, ...safety.warnings);
        if (safety.ok) {
          normalizedTranscript = neural.normalizedTranscript;
          polishMode = "deterministic_neural";
          modelName = config.modelName;
        }
      } catch (error) {
        const message = speechPolishFailureReason(error);
        neuralWarnings.push(`Дополнительная очистка диктовки не выполнена; сохранен локальный текст: ${message}`);
      }
    }
  }

  const finalNormalization = normalizeDentalSpeechTranscript(normalizedTranscript, input.specialty);
  const draft = buildRuleBasedVisitDraftFromTranscript(finalNormalization.normalizedText, input.specialty, {
    sourceLabel: polishMode === "deterministic_neural" ? "Полировка речи: нейросеть + локальные правила" : "Полировка речи: локальные правила"
  });

  return {
    rawTranscript: deterministic.rawText,
    normalizedTranscript: finalNormalization.normalizedText,
    changedPhrases: uniqueStrings([...deterministic.changedPhrases, ...finalNormalization.changedPhrases]),
    warnings: uniqueStrings([...deterministic.warnings, ...finalNormalization.warnings, ...neuralWarnings]),
    polishMode,
    modelName,
    neuralWarnings: uniqueStrings(neuralWarnings),
    draft
  };
}
