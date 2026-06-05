import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";
process.env.DENTE_CLINICAL_ADMIN_SECRET = "synthetic-speech-scope-secret";

const routePath = path.resolve("apps/api/dist/routes/speech.js");
const sampleDataPath = path.resolve("apps/api/dist/sampleData.js");
const sharedPath = path.resolve("packages/shared/dist/index.js");
const dentalPromptSource = readFileSync("apps/api/src/speech/dentalPrompt.ts", "utf8");

if (!existsSync(routePath) || !existsSync(sampleDataPath) || !existsSync(sharedPath)) {
  throw new Error("Build API first: npm run build");
}

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerSpeechRoutes } = await import(pathToFileURL(routePath).href);
const { activeVisit, patients, speechTranscriptionChunks } = await import(pathToFileURL(sampleDataPath).href);
const { buildRuleBasedVisitDraftFromTranscript, speechTranscriptPolishRequestSchema, visitNoteDraftRequestSchema } = await import(
  pathToFileURL(sharedPath).href
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertSpeechScopeError(response, expectedStatusCode, expectedText, label) {
  assert(response.statusCode === expectedStatusCode, `${label} status mismatch: ${response.statusCode}`);
  const body = response.json();
  assert(body.error === "SpeechClinicalScopeError", `${label} error code mismatch: ${response.body}`);
  assert(typeof body.message === "string" && body.message.includes(expectedText), `${label} message mismatch: ${response.body}`);
  assert(
    !/visitId|patientId|SpeechScope|scopeValidation|request\.query|undefined|null/i.test(response.body),
    `${label} leaked route/scope internals: ${response.body}`
  );
}

function assertSpeechChunkRejected(response, expectedStatusCode, expectedReason, expectedText, label) {
  assert(response.statusCode === expectedStatusCode, `${label} status mismatch: ${response.statusCode}`);
  const body = response.json();
  assert(body.error === "SpeechChunkRejected", `${label} error code mismatch: ${response.body}`);
  assert(body.reason === expectedReason, `${label} reason mismatch: ${response.body}`);
  assert(typeof body.message === "string" && body.message.includes(expectedText), `${label} message mismatch: ${response.body}`);
  assert(
    !/SpeechChunkPayloadError|SpeechChunkIdentityConflictError|retry identity|audioBase64|recordingId|chunkIndex|mimeType|base64|bytes|max|request\.body|undefined|null|issues|path/i.test(
      response.body
    ),
    `${label} leaked transport/domain internals: ${response.body}`
  );
}

const schemaPatientId = "11111111-1111-4111-8111-111111111111";
assert(
  !visitNoteDraftRequestSchema.safeParse({ patientId: schemaPatientId, transcript: "   " }).success,
  "visit draft transcript contract must reject whitespace-only text"
);
assert(
  !visitNoteDraftRequestSchema.safeParse({ patientId: schemaPatientId, transcript: "x".repeat(80001) }).success,
  "visit draft transcript contract must reject oversized text"
);
assert(
  visitNoteDraftRequestSchema.parse({ patientId: schemaPatientId, transcript: "  pain 36  " }).transcript === "pain 36",
  "visit draft transcript contract must trim text"
);
assert(
  !speechTranscriptPolishRequestSchema.safeParse({ transcript: "   " }).success,
  "speech polish transcript contract must reject whitespace-only text"
);
assert(
  !speechTranscriptPolishRequestSchema.safeParse({ transcript: "x".repeat(80001) }).success,
  "speech polish transcript contract must reject oversized text"
);
assert(
  speechTranscriptPolishRequestSchema.parse({ transcript: "  pain 36  " }).transcript === "pain 36",
  "speech polish transcript contract must trim text"
);
assert(
  dentalPromptSource.includes("Стоматологический словарь распознавания выключен в серверных настройках.") &&
  dentalPromptSource.includes("К стандартному словарю распознавания добавлены термины клиники из серверных настроек.") &&
  dentalPromptSource.includes("Стоматологический словарь распознавания выключен.") &&
  dentalPromptSource.includes("Термины: ${terms.join"),
  "speech prompt warnings must be readable for clinic staff"
);
assert(
  !dentalPromptSource.includes("DENTAL_STT_DENTAL_PROMPT disables provider prompt context") &&
    !dentalPromptSource.includes("Dental prompt pack is disabled.") &&
    !dentalPromptSource.includes("Terms: ${terms.join") &&
    !/warnings\.push\([^)]*DENTAL_STT_/s.test(dentalPromptSource),
  "speech prompt warnings must not expose env variable names"
);

const localDraft = buildRuleBasedVisitDraftFromTranscript(
  "Жалобы на боль при накусывании. Осмотр 36. План лечение под анестезией.",
  "therapist"
);
const localDraftWarningText = localDraft.warnings.join(" ");
assert(
  localDraftWarningText.includes("Локальный разбор диктовки") &&
    localDraftWarningText.includes("профилю специальности") &&
    localDraftWarningText.includes("не финальное медицинское решение"),
  "rule-based visit draft warnings must be readable for a doctor"
);
assert(
  !/Rule-parser|specialty-профилю|speech-polish|Офлайн-парсер|settings_/i.test(localDraftWarningText),
  "rule-based visit draft warnings must not expose parser/source jargon"
);

const app = Fastify({ logger: false });
await registerSpeechRoutes(app);

const headers = { "x-dente-admin-secret": process.env.DENTE_CLINICAL_ADMIN_SECRET };
const activePatient = patients.find((patient) => patient.id === activeVisit.patientId);
const otherPatient = patients.find((patient) => patient.id !== activeVisit.patientId);
assert(activePatient, "fixture active visit patient missing");
assert(otherPatient, "fixture second patient missing");

const recordingId = `speech-scope-${Date.now()}`;
const basePayload = {
  recordingId,
  chunkIndex: 0,
  mimeType: "audio/webm",
  localTranscript: "Жалобы на боль при накусывании, осмотр 36, требуется проверка врача.",
  durationMs: 1000,
  language: "ru",
  source: "visit",
  specialty: "therapist"
};

const blankPolishResponse = await app.inject({
  method: "POST",
  url: "/api/speech/polish-transcript",
  headers,
  payload: { transcript: "   " }
});
assert(blankPolishResponse.statusCode === 400, `speech polish blank transcript must return 400, got ${blankPolishResponse.statusCode}`);

const oversizedPolishResponse = await app.inject({
  method: "POST",
  url: "/api/speech/polish-transcript",
  headers,
  payload: { transcript: "x".repeat(80001) }
});
assert(
  oversizedPolishResponse.statusCode === 400,
  `speech polish oversized transcript must return 400, got ${oversizedPolishResponse.statusCode}`
);

const validPolishResponse = await app.inject({
  method: "POST",
  url: "/api/speech/polish-transcript",
  headers,
  payload: { transcript: "  pain 36 on bite  ", specialty: "therapist", source: "voice" }
});
assert(validPolishResponse.statusCode === 200, `valid speech polish failed: ${validPolishResponse.statusCode}`);
assert(
  !validPolishResponse.json().rawTranscript.startsWith(" ") && !validPolishResponse.json().rawTranscript.endsWith(" "),
  "speech polish must receive trimmed transcript"
);

const missingVisitResponse = await app.inject({
  method: "POST",
  url: "/api/speech/transcribe-chunk",
  headers,
  payload: {
    ...basePayload,
    patientId: activePatient.id
  }
});
assertSpeechScopeError(missingVisitResponse, 400, "выберите активный прием", "visit dictation missing visit scope");

const unknownPatientResponse = await app.inject({
  method: "POST",
  url: "/api/speech/transcribe-chunk",
  headers,
  payload: {
    ...basePayload,
    patientId: "11111111-1111-4111-8111-111111111111",
    visitId: activeVisit.id
  }
});
assertSpeechScopeError(unknownPatientResponse, 404, "Пациент для диктовки не найден", "speech chunk unknown patient");

const unknownVisitResponse = await app.inject({
  method: "POST",
  url: "/api/speech/transcribe-chunk",
  headers,
  payload: {
    ...basePayload,
    patientId: activePatient.id,
    visitId: "11111111-1111-4111-8111-111111111111"
  }
});
assertSpeechScopeError(unknownVisitResponse, 404, "Прием для диктовки не найден", "speech chunk unknown visit");

const wrongPatientVisitResponse = await app.inject({
  method: "POST",
  url: "/api/speech/transcribe-chunk",
  headers,
  payload: {
    ...basePayload,
    patientId: otherPatient.id,
    visitId: activeVisit.id
  }
});
assertSpeechScopeError(wrongPatientVisitResponse, 409, "другому пациенту", "speech chunk mismatched patient");

const invalidAudioResponse = await app.inject({
  method: "POST",
  url: "/api/speech/transcribe-chunk",
  headers,
  payload: {
    ...basePayload,
    chunkIndex: 1,
    localTranscript: "",
    audioBase64: "not-valid-base64!!!",
    visitId: activeVisit.id
  }
});
assert(
  invalidAudioResponse.statusCode === 400,
  `invalid speech audio must return 400, got ${invalidAudioResponse.statusCode}`
);
assertSpeechChunkRejected(
  invalidAudioResponse,
  400,
  "audio_rejected",
  "Повторите запись",
  "invalid speech audio rejection"
);

const validVisitResponse = await app.inject({
  method: "POST",
  url: "/api/speech/transcribe-chunk",
  headers,
  payload: {
    ...basePayload,
    visitId: activeVisit.id
  }
});
assert(validVisitResponse.statusCode === 201, `valid visit-scoped speech chunk failed: ${validVisitResponse.statusCode}`);
const validChunk = validVisitResponse.json().chunk;
assert(validChunk.patientId === activePatient.id, "speech chunk must inherit patient from visit");
assert(validChunk.visitId === activeVisit.id, "speech chunk visit mismatch");

const identityConflictResponse = await app.inject({
  method: "POST",
  url: "/api/speech/transcribe-chunk",
  headers,
  payload: {
    ...basePayload,
    chunkIndex: 2,
    source: "import",
    patientId: activePatient.id,
    visitId: null
  }
});
assertSpeechChunkRejected(
  identityConflictResponse,
  409,
  "chunk_conflict",
  "Обновите очередь диктовки",
  "speech chunk retry identity conflict"
);

const chunksWithoutScopeResponse = await app.inject({
  method: "GET",
  url: `/api/speech/chunks?recordingId=${encodeURIComponent(recordingId)}`,
  headers
});
assertSpeechScopeError(chunksWithoutScopeResponse, 400, "Укажите пациента или прием", "speech chunks missing scope");

const chunksWithVisitResponse = await app.inject({
  method: "GET",
  url: `/api/speech/chunks?recordingId=${encodeURIComponent(recordingId)}&visitId=${encodeURIComponent(activeVisit.id)}`,
  headers
});
assert(chunksWithVisitResponse.statusCode === 200, `speech chunks scoped read failed: ${chunksWithVisitResponse.statusCode}`);
assert(chunksWithVisitResponse.json().length === 1, "speech chunks scoped read must return the saved chunk");

const recoveryWrongScopeResponse = await app.inject({
  method: "GET",
  url: `/api/speech/recordings/recovery?visitId=${encodeURIComponent(activeVisit.id)}&patientId=${encodeURIComponent(otherPatient.id)}`,
  headers
});
assertSpeechScopeError(recoveryWrongScopeResponse, 409, "другому пациенту", "speech recovery mismatched patient");

const assembleWrongScopeResponse = await app.inject({
  method: "GET",
  url: `/api/speech/recordings/${encodeURIComponent(recordingId)}/assemble?visitId=${encodeURIComponent(activeVisit.id)}&patientId=${encodeURIComponent(otherPatient.id)}`,
  headers
});
assertSpeechScopeError(assembleWrongScopeResponse, 409, "другому пациенту", "speech assemble mismatched patient");

console.log(
  JSON.stringify({
    ok: true,
    checked: "speech clinical scope ownership",
    speechChunkCount: speechTranscriptionChunks.length
  })
);
