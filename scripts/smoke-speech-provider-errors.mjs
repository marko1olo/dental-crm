import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const routePath = path.resolve("apps/api/dist/routes/speech.js");
const gatewayPath = path.resolve("apps/api/dist/speech/gateway.js");
const polishPath = path.resolve("apps/api/dist/speech/polish.js");
if (!existsSync(routePath) || !existsSync(gatewayPath) || !existsSync(polishPath)) {
  throw new Error("Build the API first: npm run build -w @dental/api");
}

const routeSource = readFileSync("apps/api/src/routes/speech.ts", "utf8");
const gatewaySource = readFileSync("apps/api/src/speech/gateway.ts", "utf8");
const polishSource = readFileSync("apps/api/src/speech/polish.ts", "utf8");
const speechPlan = readFileSync("docs/05-speech-transcription-plan.md", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function requireIn(source, marker, message) {
  assert(source.includes(marker), message);
}

function forbidIn(source, marker, message) {
  assert(!source.includes(marker), message);
}

function forbidPattern(text, pattern, message) {
  assert(!pattern.test(text), message);
}

forbidIn(routeSource, "parsedInput.error.issues.map", "Speech polish route must not expose raw zod issue messages.");
requireIn(
  routeSource,
  "Некорректный текст для очистки диктовки",
  "Speech polish route must return a clinic-readable validation message."
);
requireIn(gatewaySource, "function speechProviderFailureReason", "Speech gateway must own public provider failure mapping.");
requireIn(polishSource, "function speechPolishFailureReason", "Speech polish must own public neural failure mapping.");
requireIn(
  gatewaySource,
  "CRM получила почти пустой аудиофрагмент. Проверьте выбранный микрофон, говорите ближе и повторите запись.",
  "Speech gateway must give a concrete next action for tiny or empty audio."
);
requireIn(
  gatewaySource,
  "Похоже, в фрагменте была тишина или голос был слишком далеко. Проверьте микрофон и повторите фразу.",
  "Speech gateway must explain Whisper no-speech results in doctor-readable wording."
);
forbidIn(gatewaySource, "недоступен (${code})", "Speech warnings must not interpolate raw provider failure codes.");
forbidIn(gatewaySource, "`http_${error.statusCode}`", "Speech warnings must not expose http_N tokens.");
forbidIn(gatewaySource, "источник вернул код ${error.statusCode}", "Speech warnings must not expose raw HTTP status text.");
forbidIn(gatewaySource, "вернула HTTP ${response.status}", "Local speech probe must not expose raw HTTP status text.");
forbidIn(
  polishSource,
  'sanitizeProviderErrorMessage(error instanceof Error ? error.message : "unknown error")',
  "Neural polish warning must not expose sanitized provider detail directly."
);
forbidIn(
  speechPlan,
  "provider label plus `timeout`, `rate_limited`, `http_N`, or `provider_error`",
  "Speech plan must not document raw provider warning tokens as public copy."
);
requireIn(
  speechPlan,
  "Provider/STT failure text returned to chunk warnings is now clinic-readable",
  "Speech plan must document the public provider-failure copy boundary."
);

process.env.DENTAL_STATE_PERSISTENCE = "off";
process.env.DENTE_CLINICAL_ADMIN_SECRET = "synthetic-speech-provider-error-secret";
process.env.DENTAL_SPEECH_PROVIDER = "groq";
process.env.DENTAL_SPEECH_PROVIDER_MODE = "manual";
process.env.DENTAL_SPEECH_KEY_HEALTH_FILE = "off";
process.env.DENTAL_SPEECH_KEY_RETRY_LIMIT = "1";
process.env.DENTAL_SPEECH_PROVIDER_TIMEOUT_MS = "5000";
process.env.DENTAL_SPEECH_RATE_LIMIT_COOLDOWN_MS = "60000";
delete process.env.GROQ_API_KEY;
process.env.GROQ_API_KEYS =
  "gsk_synthetic_provider_error_key_do_not_leak_111111111111,gsk_synthetic_provider_empty_key_do_not_leak_222222222222";
process.env.DENTAL_SPEECH_NEURAL_POLISH = "true";
process.env.DENTAL_SPEECH_POLISH_PROVIDER = "custom";
process.env.DENTAL_SPEECH_POLISH_BASE_URL = "https://synthetic-polish.local/v1";
process.env.DENTAL_SPEECH_POLISH_API_KEY = "sk-synthetic-polish-key-do-not-leak-222222222222";
process.env.DENTAL_SPEECH_POLISH_MODEL = "synthetic-polish-model";

const originalFetch = globalThis.fetch;
let fetchMode = "stt";
let sttFetchCalls = 0;
let polishFetchCalls = 0;
globalThis.fetch = async () => {
  if (fetchMode === "stt") {
    sttFetchCalls += 1;
    return new Response(
      JSON.stringify({
        error: {
          message:
            "rate_limited http_429 provider_error Authorization: Bearer gsk_synthetic_provider_error_key_do_not_leak_111111111111"
        }
      }),
      { status: 429, statusText: "Too Many Requests", headers: { "Content-Type": "application/json" } }
    );
  }
  if (fetchMode === "polish") {
    polishFetchCalls += 1;
    return new Response(
      JSON.stringify({
        error: {
          message: "provider_error http_500 upstream failed with sk-synthetic-polish-key-do-not-leak-222222222222"
        }
      }),
      { status: 500, statusText: "Server Error", headers: { "Content-Type": "application/json" } }
    );
  }
  if (fetchMode === "emptyStt") {
    sttFetchCalls += 1;
    return new Response(
      JSON.stringify({
        text: "",
        segments: [{ text: "", avg_logprob: -1.7, no_speech_prob: 0.92, compression_ratio: 1.1 }]
      }),
      { status: 200, statusText: "OK", headers: { "Content-Type": "application/json" } }
    );
  }
  throw new Error(`Unexpected speech smoke fetch mode: ${fetchMode}`);
};

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerSpeechRoutes } = await import(pathToFileURL(routePath).href);
const { transcribeSpeechChunk } = await import(pathToFileURL(gatewayPath).href);
const { polishSpeechTranscript } = await import(pathToFileURL(polishPath).href);

const rawTokenPattern =
  /rate_limited|http_429|http_500|provider_error|Too Many Requests|Server Error|Authorization|Bearer|gsk_|sk-synthetic|upstream failed|ValidationError.*String must/i;

const app = Fastify({ logger: false });
try {
  await registerSpeechRoutes(app);
  const validationResponse = await app.inject({
    method: "POST",
    url: "/api/speech/polish-transcript",
    headers: { "x-dente-admin-secret": process.env.DENTE_CLINICAL_ADMIN_SECRET },
    payload: { transcript: "   " }
  });
  assert(validationResponse.statusCode === 400, `Expected polish validation 400, got ${validationResponse.statusCode}`);
  const validationBody = validationResponse.body;
  assert(
    validationBody.includes("Некорректный текст для очистки диктовки"),
    "Speech polish validation must use clinic-readable wording."
  );
  forbidPattern(validationBody, rawTokenPattern, "Speech polish validation leaked raw validator/provider detail.");

  fetchMode = "stt";
  const result = await transcribeSpeechChunk({
    recordingId: `speech-provider-error-${Date.now()}`,
    chunkIndex: 0,
    mimeType: "audio/webm",
    audioBase64: Buffer.from("synthetic audio bytes").toString("base64"),
    localTranscript: "Жалобы на боль при накусывании, осмотр 36.",
    durationMs: 12_000,
    language: "ru",
    source: "visit",
    specialty: "therapist"
  });
  assert(sttFetchCalls > 0, "STT smoke must exercise provider fetch.");
  assert(result.chunk.status === "fallback_text", `Expected fallback_text after provider failure, got ${result.chunk.status}`);
  const sttWarnings = result.chunk.warnings.join(" ");
  assert(
    sttWarnings.includes("источник временно ограничил запросы"),
    `STT warning must explain the rate-limit condition: ${sttWarnings}`
  );
  assert(
    sttWarnings.includes("локальный черновик") || sttWarnings.includes("Локальный текст"),
    `STT warning must preserve the recovery action: ${sttWarnings}`
  );
  forbidPattern(sttWarnings, rawTokenPattern, "STT provider warning leaked raw provider detail.");

  fetchMode = "emptyStt";
  const emptyResult = await transcribeSpeechChunk({
    recordingId: `speech-provider-empty-${Date.now()}`,
    chunkIndex: 0,
    mimeType: "audio/webm",
    audioBase64: Buffer.from("synthetic quiet audio bytes").toString("base64"),
    durationMs: 12_000,
    language: "ru",
    source: "visit",
    specialty: "therapist"
  });
  assert(emptyResult.chunk.status === "failed", `Expected failed after empty STT, got ${emptyResult.chunk.status}`);
  assert(
    emptyResult.chunk.quality.nextAction.toLowerCase().includes("микрофон") &&
      (emptyResult.chunk.quality.nextAction.includes("повторите фразу") ||
        emptyResult.chunk.quality.nextAction.includes("повторите запись")),
    `Empty STT next action must point the doctor to mic/phrase retry: ${emptyResult.chunk.quality.nextAction}`
  );

  fetchMode = "polish";
  const polish = await polishSpeechTranscript({
    transcript: "Жалобы на боль при накусывании. Осмотр 36.",
    specialty: "therapist",
    source: "voice"
  });
  assert(polishFetchCalls > 0, "Polish smoke must exercise provider fetch.");
  assert(polish.polishMode === "deterministic", "Neural polish failure must keep deterministic output.");
  const polishWarnings = polish.neuralWarnings.join(" ");
  assert(
    polishWarnings.includes("у сервиса очистки временный сбой"),
    `Polish warning must explain service failure in clinic wording: ${polishWarnings}`
  );
  assert(
    polishWarnings.includes("сохранен локальный текст"),
    `Polish warning must state the local-text fallback: ${polishWarnings}`
  );
  forbidPattern(polishWarnings, rawTokenPattern, "Neural polish warning leaked raw provider detail.");

  console.log(
    JSON.stringify({
      ok: true,
      guard: "speech-provider-public-errors",
      sttStatus: result.chunk.status,
      polishMode: polish.polishMode
    })
  );
} finally {
  await app.close();
  globalThis.fetch = originalFetch;
}
