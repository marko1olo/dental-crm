import { buildRuleBasedVisitDraftFromTranscript } from "@dental/shared";
import type { DentalSpecialty, VisitNoteDraft, SpeechGatewayProvider } from "@dental/shared";
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
  shouldTryNextProviderKey,
  numberFromEnv
} from "../speech/keyPool.js";

type SpeechPolishProvider = "none" | "openai" | "groq" | "gemini" | "custom";

type VisitDraftNeuralConfig = {
  neuralEnabled: boolean;
  provider: SpeechPolishProvider;
  baseUrl: string | null;
  explicitApiKey: string | null;
  keyProviderId: SpeechGatewayProvider | null;
  modelName: string | null;
  maxTranscriptChars: number;
};
type ToothState = "idle" | "watch" | "planned" | "done" | "missing" | "treatment";

interface OpenAiErrorResponse {
  error?: {
    message?: string;
  };
}

interface OpenAiCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

interface ParsedDraft {
  complaint?: unknown;
  anamnesis?: unknown;
  objectiveStatus?: unknown;
  diagnosis?: unknown;
  treatmentPlan?: unknown;
  toothStates?: unknown;
}


function booleanFromEnv(value: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes((value ?? "").trim().toLowerCase());
}

function selectedPolishProvider(): SpeechPolishProvider {
  const rawProvider = (process.env.DENTAL_SPEECH_POLISH_PROVIDER ?? "").trim().toLowerCase();
  if (rawProvider === "openai" || rawProvider === "groq" || rawProvider === "gemini" || rawProvider === "custom") return rawProvider;
  if (process.env.DENTAL_SPEECH_POLISH_BASE_URL?.trim()) return "custom";
  return "none";
}

function baseUrlForProvider(provider: SpeechPolishProvider): string | null {
  const explicitBaseUrl = process.env.DENTAL_SPEECH_POLISH_BASE_URL?.trim().replace(/\/+$/, "");
  if (explicitBaseUrl) return explicitBaseUrl;
  if (provider === "openai") return "https://api.openai.com/v1";
  if (provider === "groq") return "https://api.groq.com/openai/v1";
  if (provider === "gemini") return "https://generativelanguage.googleapis.com/v1beta/openai";
  return null;
}

function apiKeyForProvider(provider: SpeechPolishProvider): string | null {
  const explicitKey = process.env.DENTAL_SPEECH_POLISH_API_KEY?.trim();
  return explicitKey || null;
}

function keyProviderForPolishProvider(provider: SpeechPolishProvider): SpeechGatewayProvider | null {
  if (provider === "openai") return "openai_transcribe";
  if (provider === "groq") return "groq_whisper";
  if (provider === "gemini") return "google_speech";
  return null;
}

function modelForProvider(provider: SpeechPolishProvider): string | null {
  if (provider === "gemini") {
    return process.env.DENTAL_SPEECH_POLISH_GEMINI_MODEL?.trim() || process.env.DENTAL_SPEECH_POLISH_MODEL?.trim() || "gemini-2.5-flash";
  }
  if (provider === "groq") {
    return process.env.DENTAL_SPEECH_POLISH_GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";
  }
  if (provider === "openai") {
    return process.env.DENTAL_SPEECH_POLISH_OPENAI_MODEL?.trim() || "gpt-4o-mini";
  }
  const explicitModel = process.env.DENTAL_SPEECH_POLISH_MODEL?.trim();
  if (explicitModel) return explicitModel;
  return null;
}

function createVisitDraftNeuralConfig(): VisitDraftNeuralConfig {
  // Check either DENTAL_AI_NEURAL_DRAFT or DENTAL_SPEECH_NEURAL_POLISH (default to speech polish setting if ai draft not explicitly set)
  const requested = booleanFromEnv(process.env.DENTAL_AI_NEURAL_DRAFT ?? process.env.DENTAL_SPEECH_NEURAL_POLISH);
  const provider = selectedPolishProvider();
  const baseUrl = baseUrlForProvider(provider);
  const explicitApiKey = apiKeyForProvider(provider);
  const keyProviderId = keyProviderForPolishProvider(provider);
  const modelName = modelForProvider(provider);
  const maxTranscriptChars = numberFromEnv("DENTAL_SPEECH_POLISH_MAX_CHARS", 8_000);
  const keyPool = keyProviderId ? getProviderKeyPoolSummary(keyProviderId) : null;
  const hasKey = Boolean(explicitApiKey || (keyPool && keyPool.availableKeyCount > 0));

  return {
    neuralEnabled: requested && provider !== "none" && Boolean(baseUrl && modelName && hasKey),
    provider,
    baseUrl,
    explicitApiKey,
    keyProviderId,
    modelName,
    maxTranscriptChars
  };
}

async function callOpenAiCompatibleVisitDraft(input: {
  config: VisitDraftNeuralConfig;
  transcript: string;
  specialty: DentalSpecialty;
  apiKey: string;
}): Promise<Partial<VisitNoteDraft> & { _rawToothStates?: Record<string, unknown> | null }> {
  if (!input.config.baseUrl || !input.config.modelName) {
    throw new Error("ИИ-генератор черновика не настроен.");
  }

  const specialtyLabels: Record<DentalSpecialty, string> = {
    therapist: "Терапевт (лечение кариеса, пульпита, периодонтита)",
    orthopedist: "Ортопед (коронки, мостовидные протезы, виниры)",
    surgeon: "Хирург (удаление зубов, разрезы, костная пластика)",
    orthodontist: "Ортодонт (брекеты, элайнеры, прикус)",
    periodontist: "Пародонтолог (лечение десен, кюретаж)",
    hygienist: "Гигиенист (профгигиена, чистка, фторирование)",
    pediatric: "Детский стоматолог",
    implantologist: "Имплантолог (имплантация, синус-лифтинг)",
    radiologist: "Рентгенолог (снимки, КТ)",
    universal: "Общий осмотр"
  };

  const requestBody = {
    model: input.config.modelName,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Вы — профессиональный стоматолог-ассистент клиники DENTE.
Ваша задача — преобразовать разговорную диктовку врача по результатам приема в структурированную запись медицинской карты пациента по форме 043/у.

Верните ответ строго в формате JSON со следующими строковыми ключами:
- "complaint": Жалобы пациента простым, но клинически грамотным языком (например, "Жалобы на боли в области 36 зуба...").
- "anamnesis": Анамнез заболевания (когда заболел, динамика, аллергоанамнез, соматический статус). Если информации нет, напишите стандартный опрос для уточнения.
- "objectiveStatus": Объективный статус полости рта и целевого зуба (состояние слизистой, перкуссия, зондирование, состояние твердых тканей зуба).
- "diagnosis": Установленный диагноз с указанием кода МКБ-10 и пораженного зуба (например, "K02.1 Кариес дентина 36 зуба").
- "treatmentPlan": Протокол проведенного лечения (анестезия, коффердам, обработка, пломба/реставрация, полировка, рекомендации).
- "toothStates": Объект, где ключи — номера упомянутых зубов (например, "46", "31"), а значения — строго одно из следующих состояний: "treatment" (лечение прямо сейчас), "planned" (в плане на будущее), "watch" (наблюдение/кариес в пятне), "done" (ранее вылечен, здоров), "missing" (зуб отсутствует/имплант). Верните {} если зубы не упоминались.

Правила:
1. Пишите на грамотном медицинском русском языке.
2. Не придумывайте процедуры, зубы или диагнозы, которых не было в диктовке врача.
3. Сохраняйте все номера зубов (FDI), дозировки анестетиков и названия материалов.`
      },
      {
        role: "user",
        content: [
          `Специальность врача: ${specialtyLabels[input.specialty] || input.specialty}.`,
          "Преобразуй диктовку приема ниже:",
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

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw providerHttpError(response.status, response.statusText, (payload as OpenAiErrorResponse).error?.message);
  }

  const content = (payload as OpenAiCompletionResponse).choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("ИИ-генератор черновика вернул пустой или некорректный ответ.");
  }

  let parsed: ParsedDraft;
  try {
    parsed = JSON.parse(content.trim());
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match?.[0]) {
      throw new Error("ИИ-генератор черновика вернул ответ не в формате JSON.");
    }
    parsed = JSON.parse(match[0]);
  }

  return {
    complaint: typeof parsed.complaint === "string" ? parsed.complaint.trim() : null,
    anamnesis: typeof parsed.anamnesis === "string" ? parsed.anamnesis.trim() : null,
    objectiveStatus: typeof parsed.objectiveStatus === "string" ? parsed.objectiveStatus.trim() : null,
    diagnosis: typeof parsed.diagnosis === "string" ? parsed.diagnosis.trim() : null,
    treatmentPlan: typeof parsed.treatmentPlan === "string" ? parsed.treatmentPlan.trim() : null,
    _rawToothStates: typeof parsed.toothStates === "object" && parsed.toothStates !== null ? (parsed.toothStates as Record<string, unknown>) : null
  };
}

// Список резервных моделей и провайдеров (каскадный фоллбек)
// Актуальные модели Groq: https://console.groq.com/docs/models
// Актуальные модели Gemini: https://ai.google.dev/gemini-api/docs/models
const DENTAL_AI_CASCADING_MODELS: Array<{ provider: SpeechPolishProvider; model: string }> = [
  // Gemini (бесплатно, быстро)
  { provider: "gemini", model: "gemini-2.5-flash" },         // Primary — 15 RPM, 1500 RPD free
  { provider: "gemini", model: "gemini-3-flash" },            // New Gemini 3 Flash — 5 RPM, 20 RPD free
  { provider: "gemini", model: "gemini-3.1-flash-lite" },     // Lite — 15 RPM, 500 RPD free
  // Groq (бесплатно, очень быстро, production)
  { provider: "groq", model: "llama-3.3-70b-versatile" },     // Production — 280 t/s, 1K RPD
  { provider: "groq", model: "meta-llama/llama-4-scout-17b-16e-instruct" }, // Preview — 750 t/s
  { provider: "groq", model: "qwen/qwen3-32b" },              // Preview — 400 t/s, 1K RPD
  { provider: "groq", model: "openai/gpt-oss-120b" },        // Production — 500 t/s
  { provider: "groq", model: "llama-3.1-8b-instant" },       // Ultra-fast fallback — 560 t/s, 14.4K RPD
];

async function callOpenAiCompatibleVisitDraftWithKeyRotation(input: {
  config: VisitDraftNeuralConfig;
  transcript: string;
  specialty: DentalSpecialty;
}): Promise<Partial<VisitNoteDraft> & { _rawToothStates?: Record<string, unknown> | null }> {
  // Попытка 1: Используем основную настроенную конфигурацию
  try {
    if (input.config.neuralEnabled) {
      if (input.config.explicitApiKey) {
        return await callOpenAiCompatibleVisitDraft({ ...input, apiKey: input.config.explicitApiKey });
      }
      const keyProviderId = input.config.keyProviderId;
      if (keyProviderId) {
        const triedFingerprints = new Set<string>();
        const maxAttempts = keyRetryLimit(keyProviderId);
        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
          const keyCandidate = selectProviderKey(keyProviderId, triedFingerprints);
          if (!keyCandidate) break;
          triedFingerprints.add(keyCandidate.fingerprint);
          try {
            const result = await callOpenAiCompatibleVisitDraft({
              ...input,
              apiKey: keyCandidate.value
            });
            recordProviderKeySuccess(keyProviderId, keyCandidate);
            return result;
          } catch (error) {
            recordProviderKeyFailure(keyProviderId, keyCandidate, error);
            if (!shouldTryNextProviderKey(error)) break;
          }
        }
      }
    }
  } catch (primaryError) {
    console.warn(`[AI Draft Primary Fallback Triggered] Сбой основного провайдера: ${primaryError instanceof Error ? primaryError.message : primaryError}`);
  }

  // Попытка 2: Идем по каскаду моделей
  console.log("[AI Draft Cascade] Запуск цепочки фоллбеков...");
  for (const fallback of DENTAL_AI_CASCADING_MODELS) {
    // Пропускаем, если эта же модель только что упала в Попытке 1
    if (fallback.provider === input.config.provider && fallback.model === input.config.modelName) {
      continue;
    }

    try {
      const fallbackBaseUrl = baseUrlForProvider(fallback.provider);
      const fallbackKeyProviderId = keyProviderForPolishProvider(fallback.provider);
      if (!fallbackBaseUrl || !fallbackKeyProviderId) continue;

      const triedFingerprints = new Set<string>();
      const keyCandidate = selectProviderKey(fallbackKeyProviderId, triedFingerprints);
      if (!keyCandidate) {
        console.warn(`[AI Draft Cascade] Нет доступных ключей для провайдера ${fallback.provider}`);
        continue;
      }

      console.log(`[AI Draft Cascade] Пробуем ${fallback.provider} (${fallback.model})...`);
      const fallbackConfig: VisitDraftNeuralConfig = {
        neuralEnabled: true,
        provider: fallback.provider,
        baseUrl: fallbackBaseUrl,
        explicitApiKey: null,
        keyProviderId: fallbackKeyProviderId,
        modelName: fallback.model,
        maxTranscriptChars: input.config.maxTranscriptChars
      };

      const result = await callOpenAiCompatibleVisitDraft({
        config: fallbackConfig,
        transcript: input.transcript,
        specialty: input.specialty,
        apiKey: keyCandidate.value
      });

      recordProviderKeySuccess(fallbackKeyProviderId, keyCandidate);
      console.log(`[AI Draft Cascade] УСПЕХ на модели ${fallback.model} (${fallback.provider})`);
      return result;
    } catch (fallbackError) {
      console.warn(`[AI Draft Cascade] Модель ${fallback.model} (${fallback.provider}) завершилась ошибкой: ${fallbackError instanceof Error ? fallbackError.message : fallbackError}`);
    }
  }

  throw new Error("Сбой ИИ-генератора черновика: все модели из каскада фоллбеков завершились ошибкой или лимиты исчерпаны.");
}

export async function buildVisitDraftFromTranscript(
  transcript: string,
  specialty: DentalSpecialty = "universal"
): Promise<VisitNoteDraft> {
  // 1. Run baseline rule-based parser first (ensures we always have valid quality metrics and fallback texts)
  const baseline = buildRuleBasedVisitDraftFromTranscript(transcript, specialty, {
    sourceLabel: "Серверный локальный парсер правил"
  });

  const config = createVisitDraftNeuralConfig();
  if (!config.neuralEnabled) {
    return baseline;
  }

  if (transcript.trim().length > config.maxTranscriptChars) {
    baseline.warnings.push("ИИ-генерация черновика пропущена: текст длиннее настроенного лимита.");
    return baseline;
  }

  try {
    const neural = await callOpenAiCompatibleVisitDraftWithKeyRotation({
      config,
      transcript,
      specialty
    });

    // Inject structured AI tooth states into quality object if present
    const finalQuality = baseline.quality ? { ...baseline.quality } : undefined;
    if (neural._rawToothStates && finalQuality) {
      const parsedStates: Record<string, "idle" | "watch" | "planned" | "done" | "missing" | "treatment"> = {};
      const validStates = new Set(["idle", "watch", "planned", "done", "missing", "treatment"]);
      for (const [code, state] of Object.entries(neural._rawToothStates)) {
        if (typeof state === "string" && validStates.has(state)) {
          parsedStates[code] = state as ToothState;
        }
      }
      if (Object.keys(parsedStates).length > 0) {
        finalQuality.detectedToothStates = parsedStates;
        // Also sync detectedToothCodes to be a superset of the explicit AI states
        finalQuality.detectedToothCodes = Array.from(new Set([...(finalQuality.detectedToothCodes || []), ...Object.keys(parsedStates)]));
      }
    }

    // Merge neural outputs with baseline fallbacks if any field is empty or missing
    return {
      complaint: neural.complaint || baseline.complaint,
      anamnesis: neural.anamnesis || baseline.anamnesis,
      objectiveStatus: neural.objectiveStatus || baseline.objectiveStatus,
      diagnosis: neural.diagnosis || baseline.diagnosis,
      treatmentPlan: neural.treatmentPlan || baseline.treatmentPlan,
      quality: finalQuality,
      warnings: [
        `Черновик приема (Форма 043/у) сформирован ИИ (${config.modelName}). Требуется обязательная проверка врачом.`,
        ...(baseline.warnings || []).filter(w => !w.includes("черновик собран по профилю специальности"))
      ]
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? "");
    baseline.warnings.push(`ИИ-генерация черновика не выполнена, применен локальный разбор: ${message}`);
    return baseline;
  }
}
