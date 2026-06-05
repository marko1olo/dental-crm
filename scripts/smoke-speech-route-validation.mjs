import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";
process.env.NODE_ENV = "production";
process.env.DENTE_CLINICAL_ADMIN_SECRET = "synthetic-clinical-secret";
delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS;
delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS;

const routePath = path.resolve("apps/api/dist/routes/speech.js");

if (!existsSync(routePath)) {
  throw new Error("Build API first: npm run build -w @dental/api");
}

const speechSource = readFileSync("apps/api/src/routes/speech.ts", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

[
  "speechRecordingStrategyRequestSchema.parse(request.body)",
  "speechChunkUploadSchema.parse(request.body)",
  "parsedInput.error.issues.map",
  "send({ message: error.message })",
  "reply.code(error.statusCode).send({ message: error.message })",
  "reply.code(409).send({ message: error.message })"
].forEach((needle) => {
  assert(!speechSource.includes(needle), `speech route still exposes raw request validation: ${needle}`);
});
assert(speechSource.includes("parseSpeechPayload("), "speech route must keep route-owned validation helper");
assert(
  speechSource.includes("speechStrategyValidationMessage") && speechSource.includes("speechChunkValidationMessage"),
  "speech route must keep separate operator messages for strategy and chunk validation"
);
assert(
  speechSource.includes("SpeechChunkRejected") &&
    speechSource.includes("audio_rejected") &&
    speechSource.includes("chunk_conflict"),
  "speech chunk payload and retry failures must keep stable public response codes"
);

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerSpeechRoutes } = await import(pathToFileURL(routePath).href);

const app = Fastify({ logger: false });
app.setErrorHandler((error, _request, reply) => {
  if (error?.name === "ZodError" && Array.isArray(error.issues)) {
    return reply.code(400).send({
      error: "ValidationError",
      issues: error.issues
    });
  }
  return reply.send(error);
});
await registerSpeechRoutes(app);

const clinicalHeaders = {
  "x-dente-admin-secret": process.env.DENTE_CLINICAL_ADMIN_SECRET,
  "content-type": "application/json"
};

const forbiddenValidationTerms =
  /ZodError|too_small|invalid_type|invalid_string|issues|path|request\.body|safeParse|expectedDurationMs|networkState|privacyMode|specialty|source|recordingId|chunkIndex|mimeType|audioBase64|localTranscript|durationMs|language|patientId|visitId|clientRecordedAt|transcript/i;

async function requestJson(options) {
  const response = await app.inject({
    ...options,
    headers: {
      ...clinicalHeaders,
      ...(options.headers ?? {})
    }
  });
  let body;
  try {
    body = response.json();
  } catch {
    body = {};
  }
  return { response, body, text: response.body };
}

function assertRouteValidationResponse(actual, label, expectedError, expectedMessage) {
  assert(actual.response.statusCode === 400, `${label} must return 400, got ${actual.response.statusCode}: ${actual.text}`);
  assert(actual.body.error === expectedError, `${label} error code mismatch: ${actual.text}`);
  assert(actual.body.message === expectedMessage, `${label} must return bounded message, got: ${actual.text}`);
  assert(!Object.hasOwn(actual.body, "issues"), `${label} must not return zod issues`);
  assert(!forbiddenValidationTerms.test(actual.text), `${label} leaked schema/parser detail: ${actual.text}`);
}

const checks = [
  [
    "speech recording strategy invalid payload",
    await requestJson({
      method: "POST",
      url: "/api/speech/recording-strategy",
      payload: {
        expectedDurationMs: -1,
        networkState: "bad",
        privacyMode: "bad",
        specialty: "bad",
        source: "bad"
      }
    }),
    "SpeechStrategyValidationError",
    "Стратегия записи не рассчитана: проверьте длительность, режим сети, приватность, специальность и источник диктовки."
  ],
  [
    "speech chunk invalid payload",
    await requestJson({
      method: "POST",
      url: "/api/speech/transcribe-chunk",
      payload: {
        recordingId: "",
        chunkIndex: -1,
        source: "visit",
        patientId: "bad"
      }
    }),
    "SpeechChunkValidationError",
    "Фрагмент диктовки не принят: передайте запись, номер фрагмента, аудио или локальную расшифровку и клинический контекст."
  ],
  [
    "speech polish invalid payload",
    await requestJson({
      method: "POST",
      url: "/api/speech/polish-transcript",
      payload: { transcript: "   " }
    }),
    "ValidationError",
    "Некорректный текст для очистки диктовки. Передайте непустую расшифровку до 80 000 символов и специальность приема."
  ]
];

for (const [label, actual, expectedError, expectedMessage] of checks) {
  assertRouteValidationResponse(actual, label, expectedError, expectedMessage);
}

await app.close();
delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
delete process.env.NODE_ENV;

console.log(
  JSON.stringify({
    ok: true,
    checkedRoutes: checks.map(([label]) => label),
    rawValidationHidden: true
  })
);
