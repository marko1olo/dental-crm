import type { TreatmentPlanPayload } from "@dental/shared";

import {
  fetchWithProviderTimeout,
  getProviderKeyPoolSummary,
  keyRetryLimit,
  providerHttpError,
  recordProviderKeyFailure,
  recordProviderKeySuccess,
  sanitizeProviderErrorMessage,
  selectProviderKey,
  shouldTryNextProviderKey,
  numberFromEnv
} from "../speech/keyPool.js";

type SpeechPolishProvider = "none" | "openai" | "groq" | "gemini" | "custom";

type AIPlanNeuralConfig = {
  neuralEnabled: boolean;
  provider: SpeechPolishProvider;
  baseUrl: string | null;
  explicitApiKey: string | null;
  keyProviderId: "openai_transcribe" | "groq_whisper" | "google_speech" | null;
  modelName: string | null;
};

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

interface PersonalizedPlanResult {
  patientFriendlyExplanation: string;
  patientHygieneAdvice: string;
}

// ============================================================
// DEFAULT_HYGIENE_GUIDELINES — клиника DENTE
// ============================================================
const DEFAULT_HYGIENE_GUIDELINES = `
- Здоровые зубы — это 90% вашей работы дома и 10% работы врача.
- УТРО: Сначала ЗАВТРАК (до еды можно прополоскать рот водой). Чистим зубы щёткой (3-4 мин) выметающими движениями "от десны к краю зуба" (от красного к белому). Пасты — с горошину (избыток пены мешает чистке механически). В конце чистим язык скребком. Контроль: проводим языком — зубы должны быть гладкими, как стекло.
- ДНЁМ: После еды жевательная резинка без сахара (с ксилитом) на 10-15 минут для нормализации кислотности. Ополаскиватель с фтором — сразу после чистки; без фтора (для свежести) — после перекусов.
- ВЕЧЕР (важнейший этап): Сначала зубная нить (флосс) и межзубные ершики — щётка не чистит контактные зоны, а именно там начинается 90% кариеса! Затем ирригатор (вымывает остатки, массирует дёсны; обязателен при коронках, мостах и имплантах — без него шов коронка-зуб собирает налёт). Финальная чистка щёткой (3-4 мин): пасту сплюнуть, рот водой НЕ полоскать — оставить фтор на зубах на всю ночь. По желанию: нанести реминерализующий гель (ROCS Minerals / Tooth Mousse) на 30 мин перед сном.
- СРЕДСТВА: Щётка Sonic (звуковая) или мануальная, жёсткость строго Medium или Soft (жёсткие щётки стирают эмаль!), менять каждые 3-4 мес. Пасты от кариеса — с фтором 1450 ppm (Lacalut, President, Colgate, Splat); при чувствительности — с кальцием/гидроксиапатитом (Sensodyne, ROCS); при кровоточивости — с травами курсами (Parodontax, Lacalut). Абразивные/угольные отбеливающие пасты — только изредка, не каждый день.
- ГЛАВНЫЕ ОШИБКИ: Горизонтальные движения "пилой" — стирают шейки зубов (клиновидный дефект). Щётка "лохматится" через 2 недели — давите слишком сильно. Пропуск "мёртвых зон": внутренняя поверхность нижних резцов и дальняя сторона последних зубов — там всегда камень или кариес!
- ЗАПРЕЩЕНО: Чистить зубы сразу после кислого (соки, вино, яблоки) — ждать 30 мин. Деревянные зубочистки — травмируют сосочек, только нить/ирригатор/ершик. Грызть орехи, семечки, лёд зубами — микротрещины → сколы.
- ПИТАНИЕ: Вредна не количество сладкого, а частота. Чистые перерывы между едой 3-4 часа. После кислых напитков — прополоскать рот водой, чистить щёткой только через 30 мин. Грубая клетчатка (морковь, яблоки, сельдерей) — природная щётка.
- МАТЕМАТИКА ЗДОРОВЬЯ: Гигиена ~10 000 руб/год (щётка + паста + ершики + профгигиена). Лечение одного запущенного зуба: кариес 6 000 + каналы 10 000 + коронка 25 000 = ~41 000 руб. Имплант — от 60 000 руб. Профилактика в 4-10 раз дешевле!
- ТРЕВОЖНЫЕ СИГНАЛЫ — СРОЧНО К ВРАЧУ: Кровоточивость при чистке (воспаление, не бросать чистить — вычищать тщательнее; при кровоточивости гели Холисал, Метрогил Дента). Застревание еды всегда в одном месте — кариес или карман. Боль на холодное/горячее/сладкое — 100% кариес или трещина. Утренняя боль в висках, щёлкание сустава — бруксизм, нужна ночная каппа + самомассаж жевательных мышц. Привкус "гнили" после чистки — процесс в десневом кармане или под коронкой. Любая язвочка во рту, не заживающая более 14 дней — немедленно к врачу. Хлоргексидин 0,1% при обострении пародонтита — строго не более 7 дней подряд!
`;

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

function apiKeyForProvider(_provider: SpeechPolishProvider): string | null {
  return process.env.DENTAL_SPEECH_POLISH_API_KEY?.trim() || null;
}

function keyProviderForPolishProvider(provider: SpeechPolishProvider): "openai_transcribe" | "groq_whisper" | "google_speech" | null {
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

function createAIPlanNeuralConfig(): AIPlanNeuralConfig {
  const requested = booleanFromEnv(process.env.DENTAL_AI_NEURAL_DRAFT ?? process.env.DENTAL_SPEECH_NEURAL_POLISH ?? "true");
  const provider = selectedPolishProvider();
  const baseUrl = baseUrlForProvider(provider);
  const explicitApiKey = apiKeyForProvider(provider);
  const keyProviderId = keyProviderForPolishProvider(provider);
  const modelName = modelForProvider(provider);
  const keyPool = keyProviderId ? getProviderKeyPoolSummary(keyProviderId) : null;
  const hasKey = Boolean(explicitApiKey || (keyPool && keyPool.availableKeyCount > 0));

  return {
    neuralEnabled: requested && provider !== "none" && Boolean(baseUrl && modelName && hasKey),
    provider,
    baseUrl,
    explicitApiKey,
    keyProviderId,
    modelName
  };
}

// ============================================================
// SYSTEM PROMPT — нейросетевая персонализация плана DENTE
// ============================================================
function buildSystemPrompt(): string {
  return `Вы — ведущий стоматолог-эксперт клиники DENTE.
Ваша задача — проанализировать клинический план лечения пациента и составить:
1. Понятный, заботливый, убедительный и коммерчески эффективный перевод на человеческий язык для презентации пациенту.
2. Индивидуальные гигиенические советы с учётом конкретного плана лечения.

Верните ответ СТРОГО в формате JSON с двумя строковыми ключами:

"patientFriendlyExplanation" — Доступный перевод плана для пациента:
  1. Яркое вводное объяснение диагноза через понятные метафоры. Например:
     - Кариес дентина = "скрытая полость под прочной эмалью, как подгнившая балка в стене";
     - Пульпит = "воспаление нерва — как пожар внутри зуба, нужно срочно тушить";
     - Пародонтит = "ослабление костного фундамента зуба — зуб расшатывается, как свая в рыхлой почве";
     - Кариес на контакте = "скрытое гниение между зубами — снаружи не видно, внутри уже разрушение".
  2. "Математика здоровья" — экономический аргумент: объясните, почему лечить сейчас выгоднее, чем потом:
     - кариес сейчас ~6 000 руб. VS каналы + коронка ~35 000 руб. VS имплант ~60 000+ руб.
     - Конкретные цифры из этапов плана делают аргумент убедительным.
  3. Каждый этап — человеческим языком: "депульпирование" → "бережное очищение и герметизация внутренних каналов зуба под микроскопом"; "остеопластика" → "укрепление костной ткани — создаём надёжный фундамент для импланта"; "гингивэктомия" → "коррекция десны — убираем воспалённую ткань, открываем красивый контур".
  4. Акцент на безопасность и комфорт: современная анестезия, использование микроскопа, цифровые снимки — всё для точности и безболезненности.
  5. Структура: используйте маркированные списки, абзацы, эмодзи для лёгкого чтения.

"patientHygieneAdvice" — Персонализированные гигиенические советы:
  1. Если планируется имплантация, коронки или мосты: подчеркните, что ирригатор ОБЯЗАТЕЛЕН — без него шов коронка-зуб собирает налёт → воспаление → вторичный кариес под коронкой. Назовите конкретную технику чистки зоны стыка.
  2. Если пародонтит или воспаление дёсен: курс противовоспалительных гелей (Холисал, Метрогил Дента), хлоргексидин 0,1% строго не более 7 дней, тщательная чистка межзубных промежутков, ирригатор обязателен.
  3. Если лечение каналов или глубокий кариес: временная гиперчувствительность после лечения — использовать гели ROCS Minerals / Tooth Mousse и пасты с гидроксиапатитом (Sensodyne Repair & Protect). Не есть твёрдое 2-3 часа после лечения.
  4. Если бруксизм или повышенная стираемость: ночная защитная каппа обязательна, самомассаж жевательных мышц лица, избегать жевательных резинок дольше 10 мин.
  5. Если имплант или большой промежуток без зуба: использовать специальные суперфлоссы или ершики для чистки под мостом/под имплантом.

Базовые правила гигиены DENTE для интеграции в ответ:
${DEFAULT_HYGIENE_GUIDELINES}`;
}

async function callOpenAiCompatiblePlanPersonalize(input: {
  config: AIPlanNeuralConfig;
  payload: TreatmentPlanPayload;
  apiKey: string;
}): Promise<PersonalizedPlanResult> {
  if (!input.config.baseUrl || !input.config.modelName) {
    throw new Error("ИИ-сервер персонализации планов не настроен.");
  }

  const requestBody = {
    model: input.config.modelName,
    temperature: 0.25,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: buildSystemPrompt()
      },
      {
        role: "user",
        content: `Клинический план лечения:
- Повод обращения: ${input.payload.clinicalReason}
- Диагноз: ${input.payload.diagnosisSummary}
- Область лечения (зубы): ${input.payload.teethOrArea}
- Этапы лечения:
${input.payload.plannedStages.map(s => `  * ${s.stageName}: ${s.plannedServices} (${s.plannedTiming}), ориентировочная стоимость: ${s.estimatedAmountRub ? s.estimatedAmountRub + " руб." : "не указана"} [Заметки: ${s.clinicalNotes ?? "нет"}]`).join("\n")}
- Альтернативы: ${input.payload.alternatives.join("; ")}
- Риски: ${input.payload.risksAndLimitations.join("; ")}
- Прогноз: ${input.payload.prognosisAndLimits}
- Ориентировочная общая стоимость: ${input.payload.estimatedTotalRub ? input.payload.estimatedTotalRub + " руб." : "не указана"}`
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
    numberFromEnv("DENTAL_SPEECH_POLISH_TIMEOUT_MS", 45_000)
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw providerHttpError(response.status, response.statusText, (data as OpenAiErrorResponse).error?.message);
  }

  const content = (data as OpenAiCompletionResponse).choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("ИИ-модель вернула неожиданный ответ.");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(content.trim());
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match?.[0]) {
      throw new Error("ИИ-модель вернула ответ не в формате JSON.");
    }
    parsed = JSON.parse(match[0]);
  }

  return {
    patientFriendlyExplanation: String(parsed.patientFriendlyExplanation ?? "").trim(),
    patientHygieneAdvice: String(parsed.patientHygieneAdvice ?? "").trim()
  };
}

const DENTAL_AI_CASCADING_MODELS: Array<{ provider: SpeechPolishProvider; model: string }> = [
  { provider: "gemini", model: "gemini-2.5-flash" },
  { provider: "gemini", model: "gemini-3-flash" },
  { provider: "gemini", model: "gemini-3.1-flash-lite" },
  { provider: "groq", model: "llama-3.3-70b-versatile" },
  { provider: "groq", model: "meta-llama/llama-4-scout-17b-16e-instruct" },
  { provider: "groq", model: "openai/gpt-oss-120b" }
];

export async function personalizeTreatmentPlan(payload: TreatmentPlanPayload): Promise<PersonalizedPlanResult> {
  const config = createAIPlanNeuralConfig();
  if (!config.neuralEnabled) {
    return {
      patientFriendlyExplanation: `**Почему важно провести лечение:**\nВаш диагноз (${payload.clinicalReason}) требует лечения (${payload.diagnosisSummary}). Откладывание ведёт к осложнениям и значительно большим затратам. Обратитесь к врачу за разъяснениями.`,
      patientHygieneAdvice: `**Базовые правила домашней гигиены от DENTE:**\n\n${DEFAULT_HYGIENE_GUIDELINES}`
    };
  }

  // Primary provider attempt with key pool
  try {
    if (config.explicitApiKey) {
      return await callOpenAiCompatiblePlanPersonalize({ config, payload, apiKey: config.explicitApiKey });
    }
    const keyProviderId = config.keyProviderId;
    if (keyProviderId) {
      const triedFingerprints = new Set<string>();
      const maxAttempts = keyRetryLimit(keyProviderId);
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const keyCandidate = selectProviderKey(keyProviderId, triedFingerprints);
        if (!keyCandidate) break;
        triedFingerprints.add(keyCandidate.fingerprint);
        try {
          const result = await callOpenAiCompatiblePlanPersonalize({ config, payload, apiKey: keyCandidate.value });
          recordProviderKeySuccess(keyProviderId, keyCandidate);
          return result;
        } catch (error) {
          recordProviderKeyFailure(keyProviderId, keyCandidate, error);
          if (!shouldTryNextProviderKey(error)) break;
        }
      }
    }
  } catch (error) {
    console.warn(`[AI Plan Personalize Primary Failed]: ${error instanceof Error ? error.message : error}`);
  }

  // Cascade fallback across providers
  for (const fallback of DENTAL_AI_CASCADING_MODELS) {
    if (fallback.provider === config.provider && fallback.model === config.modelName) continue;
    try {
      const fallbackBaseUrl = baseUrlForProvider(fallback.provider);
      const fallbackKeyProviderId = keyProviderForPolishProvider(fallback.provider);
      if (!fallbackBaseUrl || !fallbackKeyProviderId) continue;

      const triedFingerprints = new Set<string>();
      const keyCandidate = selectProviderKey(fallbackKeyProviderId, triedFingerprints);
      if (!keyCandidate) continue;

      const fallbackConfig: AIPlanNeuralConfig = {
        neuralEnabled: true,
        provider: fallback.provider,
        baseUrl: fallbackBaseUrl,
        explicitApiKey: null,
        keyProviderId: fallbackKeyProviderId,
        modelName: fallback.model
      };

      const result = await callOpenAiCompatiblePlanPersonalize({ config: fallbackConfig, payload, apiKey: keyCandidate.value });
      recordProviderKeySuccess(fallbackKeyProviderId, keyCandidate);
      return result;
    } catch (fallbackError) {
      console.warn(`[AI Plan Personalize Cascade ${fallback.provider}/${fallback.model} Failed]: ${fallbackError instanceof Error ? fallbackError.message : fallbackError}`);
    }
  }

  // Final fallback — rule-based text
  console.error("[AI Plan Personalize]: All providers failed, returning rule-based fallback.");
  return {
    patientFriendlyExplanation: `**Ваш план лечения:**\n${payload.plannedStages.map((s, i) => `${i + 1}. **${s.stageName}** — ${s.plannedServices} (${s.plannedTiming})`).join("\n")}\n\nОбратитесь к врачу для подробного разъяснения плана.`,
    patientHygieneAdvice: `**Базовые правила домашней гигиены от DENTE:**\n\n${DEFAULT_HYGIENE_GUIDELINES}`
  };
}