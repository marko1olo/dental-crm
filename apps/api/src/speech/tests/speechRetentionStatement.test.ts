import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import fastify from "fastify";
import { registerSystemRoutes } from "../../routes/system.js";

/**
 * Что именно продукт УТВЕРЖДАЕТ о судьбе аудио пациента.
 *
 * Дефект, из-за которого существует этот пакет, был не в коде, а во фразе:
 * `/api/system/local-bridges/use-plans` сообщал клинике, что «сервер удаляет
 * исходное аудио после обработки», хотя удаления не было ни одной строкой.
 * Затем фраза сменилась на другую, тоже неверную: «если удаление не прошло, это
 * попадает в предупреждения фрагмента» — обещание видимости, которой нет
 * (`rg -n providerWarnings apps/web/src` -> ноль попаданий, врач видит только
 * уровень качества «Требует проверки»).
 *
 * Проверяется живой маршрут, а не приватная функция: клинике достаётся именно
 * тело ответа. Общий dev-сервер трогать нельзя и он не подхватывает правки без
 * перезапуска, поэтому маршрут поднимается отдельным экземпляром Fastify через
 * `app.inject()`.
 *
 * Ключи здесь — заведомые пустышки: маршрут читает только НАЛИЧИЕ ключа, чтобы
 * собрать цепочку источников, и не отправляет ни одного запроса наружу.
 */

const stubAssemblyAiKey = "stub-assemblyai-key";
const stubGroqKey = "stub-groq-key";

const falseRetentionClaim = "удаляет исходное аудио после обработки";
const retractedVisibilityClaim = "попадает в предупреждения фрагмента";
const asyncDeletionFragment = "аудио и расшифровку сервер удаляет отдельным запросом";
const oneShotFragment = "Аудио уходит источнику внутри одного запроса";

/**
 * Ключи и адреса локальных модулей, которые могли прийти из окружения машины.
 * Без этой зачистки состав цепочки источников зависел бы от настроек клиники, и
 * проверка утверждения проверяла бы не текст, а чужой .env.
 */
const speechEnvNamesToClear = [
  "ASSEMBLYAI_API_KEY",
  "ASSEMBLYAI_API_KEYS",
  "GROQ_API_KEY",
  "GROQ_API_KEYS",
  "OPENAI_API_KEY",
  "OPENAI_API_KEYS",
  "DEEPGRAM_API_KEY",
  "DEEPGRAM_API_KEYS",
  "GOOGLE_API_KEY",
  "GOOGLE_API_KEYS",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_API_TOKENS",
  "DENTAL_LOCAL_WHISPER_URL",
  "DENTAL_LOCAL_WHISPER_TRANSCRIBE_URL",
  "WHISPER_CPP_URL",
  "WHISPER_CPP_TRANSCRIBE_URL",
  "LOCAL_WHISPER_URL",
  "DENTAL_VOSK_URL",
  "DENTAL_VOSK_TRANSCRIBE_URL",
  "VOSK_SERVER_URL",
  "LOCAL_VOSK_URL"
];

async function visitDictationStepDetail(): Promise<string> {
  const app = fastify();
  try {
    await registerSystemRoutes(app);
    const response = await app.inject({ method: "GET", url: "/api/system/local-bridges/use-plans" });
    assert.strictEqual(response.statusCode, 200, `маршрут должен отдать 200, получено ${response.statusCode}`);
    const payload = response.json() as {
      plans: Array<{ scenario: string; steps: Array<{ order: number; detail: string }> }>;
    };
    const dictationPlan = payload.plans.find((plan) => plan.scenario === "visit_dictation");
    assert.ok(dictationPlan, "в ответе должен быть план диктовки приёма");
    const providerStep = dictationPlan.steps.find((step) => step.order === 2);
    assert.ok(providerStep, "в плане диктовки должен быть шаг выбора источника распознавания");
    return providerStep.detail;
  } finally {
    await app.close();
  }
}

describe("Утверждение продукта о судьбе аудио пациента на серверном маршруте", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv };
    for (const name of speechEnvNamesToClear) delete process.env[name];
    // Маршрут защищён секретом администратора; ветка без секрета разрешена только
    // вне production и только явным флагом — тем же, что стоит в .env.example.
    process.env.NODE_ENV = "test";
    process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
    process.env.DENTAL_SPEECH_FALLBACK_LIMIT = "2";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("смешанная цепочка источников получает оба утверждения, а не одно вместо другого", async () => {
    // AssemblyAI загружает аудио на сторону провайдера, Groq получает его внутри
    // одного запроса. Прежний код отдавал ТОЛЬКО фразу про AssemblyAI, и честная
    // оговорка про Groq исчезала, хотя Groq оставался в той же цепочке.
    process.env.DENTAL_SPEECH_PROVIDER = "assemblyai";
    process.env.ASSEMBLYAI_API_KEY = stubAssemblyAiKey;
    process.env.GROQ_API_KEY = stubGroqKey;

    const detail = await visitDictationStepDetail();

    assert.ok(detail.includes(asyncDeletionFragment), `нет утверждения об удалении у асинхронного источника: ${detail}`);
    assert.ok(detail.includes(oneShotFragment), `нет оговорки об одноразовых источниках: ${detail}`);
    assert.ok(!detail.includes(falseRetentionClaim), `в ответе снова живёт ложное утверждение: ${detail}`);
  });

  it("обещание видимости заменено настоящими адресами записи неудачного удаления", async () => {
    process.env.DENTAL_SPEECH_PROVIDER = "assemblyai";
    process.env.ASSEMBLYAI_API_KEY = stubAssemblyAiKey;

    const detail = await visitDictationStepDetail();

    // Обещание, которого продукт не выполняет: врач не видит providerWarnings.
    assert.ok(!detail.includes(retractedVisibilityClaim), `обещание видимости вернулось в ответ: ${detail}`);
    // Настоящие адреса записи.
    assert.match(detail, /журнал сервера/);
    assert.match(detail, /карточку фрагмента/);
    assert.match(detail, /ai_jobs/);
    // И прямое указание, что аудио придётся удалять руками у источника.
    assert.match(detail, /панели источника/);
    assert.ok(!detail.includes(falseRetentionClaim), `в ответе снова живёт ложное утверждение: ${detail}`);
  });

  it("цепочка без асинхронного источника не обещает удаления, которого не делает", async () => {
    process.env.DENTAL_SPEECH_PROVIDER = "groq";
    process.env.GROQ_API_KEY = stubGroqKey;

    const detail = await visitDictationStepDetail();

    assert.ok(detail.includes(oneShotFragment), `нет оговорки об одноразовых источниках: ${detail}`);
    assert.ok(!detail.includes(asyncDeletionFragment), `обещание удаления там, где удалять нечем: ${detail}`);
    assert.ok(!detail.includes(falseRetentionClaim), `в ответе снова живёт ложное утверждение: ${detail}`);
  });
});
