import {
  baseUrlForProvider,
  createAIPlanNeuralConfig,
  keyProviderForPolishProvider,
  type AIPlanNeuralConfig,
  type SpeechPolishProvider
} from "../ai/treatmentPlanPersonalize.js";
import {
  fetchWithProviderTimeout,
  keyRetryLimit,
  numberFromEnv,
  providerHttpError,
  recordProviderKeyFailure,
  recordProviderKeySuccess,
  sanitizeProviderErrorMessage,
  selectProviderKey,
  shouldTryNextProviderKey
} from "../speech/keyPool.js";

/**
 * Обращение к языковой модели за структурированным ответом в формате JSON.
 *
 * Переиспользует готовое хозяйство проекта: выбор провайдера и модели
 * (ai/treatmentPlanPersonalize.ts) и пул ключей с учётом отказов
 * (speech/keyPool.ts). Своего управления ключами здесь нет намеренно — второй
 * механизм ротации означал бы, что сгоревший ключ помечен в одном месте и
 * продолжает использоваться в другом.
 *
 * Отличие от вызовов модели в остальном коде — обязательный контракт: вызывающий
 * передаёт проверку ответа, и результат, не прошедший её, считается отказом
 * модели, а не данными. Для переноса чужой базы это принципиально: ответ,
 * которому нельзя доверять, должен вести к карантину, а не к записи в карточку.
 */

export interface LlmJsonRequest<T> {
  /** Системная инструкция. */
  system: string;
  /** Запрос с данными. */
  user: string;
  /**
   * Проверка ответа. Возвращает разобранное значение либо причину отказа.
   * Вызывается для каждой попытки: непрошедший ответ ведёт к следующей модели.
   */
  validate: (raw: unknown) => { ok: true; value: T } | { ok: false; reason: string };
  /** Температура. Для разбора структуры нужна предсказуемость, не фантазия. */
  temperature?: number;
  maxOutputTokens?: number;
}

export interface LlmJsonResult<T> {
  value: T | null;
  /** Сколько запросов к модели фактически выполнено. */
  calls: number;
  /** Сколько ответов отвергнуто проверкой — прямая мера галлюцинаций. */
  rejected: number;
  /** Модель, давшая принятый ответ. */
  model: string | null;
  /** Причины отказов на русском для отчёта оператору. */
  failures: string[];
}

/**
 * Каскад моделей. Порядок от дешёвых и быстрых к более способным: разбор имён
 * колонок — задача несложная, и тратить на неё крупную модель незачем.
 */
const MIGRATION_MODEL_CASCADE: Array<{ provider: SpeechPolishProvider; model: string }> = [
  { provider: "gemini", model: "gemini-2.5-flash" },
  { provider: "groq", model: "llama-3.3-70b-versatile" },
  { provider: "gemini", model: "gemini-3-flash" },
  { provider: "groq", model: "openai/gpt-oss-120b" }
];

interface OpenAiCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

interface OpenAiErrorResponse {
  error?: { message?: string };
}

/** Извлекает объект JSON из ответа модели, терпя обрамление текстом. */
function extractJsonObject(content: string): unknown {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Модель могла обернуть ответ в ```json ... ``` или пояснения.
    const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(trimmed)?.[1];
    if (fenced) {
      try {
        return JSON.parse(fenced.trim());
      } catch {
        // Падаем в следующую попытку ниже.
      }
    }
    const braced = /\{[\s\S]*\}/.exec(trimmed)?.[0];
    if (braced) return JSON.parse(braced);
    throw new Error("Ответ модели не содержит JSON.");
  }
}

async function callOnce<T>(
  config: AIPlanNeuralConfig,
  apiKey: string,
  request: LlmJsonRequest<T>
): Promise<{ ok: true; value: T } | { ok: false; reason: string }> {
  if (!config.baseUrl || !config.modelName) {
    return { ok: false, reason: "Языковая модель не настроена: не задан адрес или имя модели." };
  }

  const response = await fetchWithProviderTimeout(
    `${config.baseUrl}/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: config.modelName,
        temperature: request.temperature ?? 0,
        max_tokens: request.maxOutputTokens ?? 4000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: request.user }
        ]
      })
    },
    numberFromEnv("DENTAL_MIGRATION_LLM_TIMEOUT_MS", 45_000)
  );

  const data = (await response.json().catch(() => ({}))) as OpenAiCompletionResponse & OpenAiErrorResponse;
  if (!response.ok) {
    throw providerHttpError(response.status, response.statusText, data.error?.message);
  }

  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim() === "") {
    return { ok: false, reason: "Модель вернула пустой ответ." };
  }

  let parsed: unknown;
  try {
    parsed = extractJsonObject(content);
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "Ответ модели не разобран как JSON." };
  }

  return request.validate(parsed);
}

/**
 * Выполняет запрос с перебором ключей и моделей.
 *
 * Отказ проверки (validate вернул ok: false) считается неудачей попытки и ведёт
 * к следующей модели: возможно, другая ответит по контракту. Если по контракту
 * не ответил никто, возвращается null — и вызывающий обязан обойтись без модели,
 * а не подставить её последний неверный ответ.
 */
export async function requestLlmJson<T>(request: LlmJsonRequest<T>): Promise<LlmJsonResult<T>> {
  const result: LlmJsonResult<T> = { value: null, calls: 0, rejected: 0, model: null, failures: [] };

  const primary = createAIPlanNeuralConfig();
  if (!primary.neuralEnabled) {
    result.failures.push(
      "Языковая модель отключена или не настроена (нет ключа либо адреса). Сопоставление выполнено только правилами."
    );
    return result;
  }

  const attempts: AIPlanNeuralConfig[] = [primary];
  for (const fallback of MIGRATION_MODEL_CASCADE) {
    if (fallback.provider === primary.provider && fallback.model === primary.modelName) continue;
    const fallbackBaseUrl = baseUrlForProvider(fallback.provider);
    const fallbackKeyProviderId = keyProviderForPolishProvider(fallback.provider);
    if (!fallbackBaseUrl || !fallbackKeyProviderId) continue;
    attempts.push({
      neuralEnabled: true,
      provider: fallback.provider,
      baseUrl: fallbackBaseUrl,
      explicitApiKey: null,
      keyProviderId: fallbackKeyProviderId,
      modelName: fallback.model
    });
  }

  for (const config of attempts) {
    const label = `${config.provider}/${config.modelName}`;

    // Явно заданный ключ из окружения — пул ключей не задействуется.
    if (config.explicitApiKey) {
      result.calls += 1;
      try {
        const attempt = await callOnce(config, config.explicitApiKey, request);
        if (attempt.ok) {
          result.value = attempt.value;
          result.model = label;
          return result;
        }
        result.rejected += 1;
        result.failures.push(`${label}: ${attempt.reason}`);
      } catch (error) {
        result.failures.push(
          `${label}: ${sanitizeProviderErrorMessage(error instanceof Error ? error.message : String(error))}`
        );
      }
      continue;
    }

    const keyProviderId = config.keyProviderId;
    if (!keyProviderId) continue;

    const tried = new Set<string>();
    const maxAttempts = keyRetryLimit(keyProviderId);
    for (let attemptIndex = 0; attemptIndex < maxAttempts; attemptIndex += 1) {
      const key = selectProviderKey(keyProviderId, tried);
      if (!key) break;
      tried.add(key.fingerprint);
      result.calls += 1;

      try {
        const attempt = await callOnce(config, key.value, request);
        if (attempt.ok) {
          recordProviderKeySuccess(keyProviderId, key);
          result.value = attempt.value;
          result.model = label;
          return result;
        }
        /**
         * Ключ отработал, модель ответила — значит ключ живой. Помечаем успех,
         * иначе исправный ключ уедет в карантин пула из-за того, что модель
         * ответила не по контракту.
         */
        recordProviderKeySuccess(keyProviderId, key);
        result.rejected += 1;
        result.failures.push(`${label}: ${attempt.reason}`);
        break;
      } catch (error) {
        recordProviderKeyFailure(keyProviderId, key, error);
        result.failures.push(
          `${label}: ${sanitizeProviderErrorMessage(error instanceof Error ? error.message : String(error))}`
        );
        if (!shouldTryNextProviderKey(error)) break;
      }
    }
  }

  return result;
}

/** Настроена ли модель. Нужно, чтобы отчёт честно называл причину. */
export function isLlmAvailable(): boolean {
  return createAIPlanNeuralConfig().neuralEnabled;
}
