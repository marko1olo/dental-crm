import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";
process.env.DENTE_CLINICAL_ADMIN_SECRET = "synthetic-speech-scope-secret";

const routePath = path.resolve("apps/api/dist/routes/speech.js");
const sampleDataPath = path.resolve("apps/api/dist/sampleData.js");
const sharedPath = path.resolve("packages/shared/dist/index.js");

if (!existsSync(routePath) || !existsSync(sampleDataPath) || !existsSync(sharedPath)) {
  throw new Error("Build API first: npm run build");
}

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerSpeechRoutes } = await import(pathToFileURL(routePath).href);
const { activeVisit, patients, speechTranscriptionChunks } = await import(pathToFileURL(sampleDataPath).href);
const { speechTranscriptPolishRequestSchema, visitNoteDraftRequestSchema } = await import(pathToFileURL(sharedPath).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
assert(missingVisitResponse.statusCode === 400, `visit dictation must require visitId, got ${missingVisitResponse.statusCode}`);

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
assert(unknownPatientResponse.statusCode === 404, `speech chunk must reject unknown patient, got ${unknownPatientResponse.statusCode}`);

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
assert(unknownVisitResponse.statusCode === 404, `speech chunk must reject unknown visit, got ${unknownVisitResponse.statusCode}`);

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
assert(
  wrongPatientVisitResponse.statusCode === 409,
  `speech chunk must reject visit from another patient, got ${wrongPatientVisitResponse.statusCode}`
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

const chunksWithoutScopeResponse = await app.inject({
  method: "GET",
  url: `/api/speech/chunks?recordingId=${encodeURIComponent(recordingId)}`,
  headers
});
assert(chunksWithoutScopeResponse.statusCode === 400, `speech chunks read must require clinical scope, got ${chunksWithoutScopeResponse.statusCode}`);

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
assert(
  recoveryWrongScopeResponse.statusCode === 409,
  `speech recovery must reject mismatched visit/patient, got ${recoveryWrongScopeResponse.statusCode}`
);

const assembleWrongScopeResponse = await app.inject({
  method: "GET",
  url: `/api/speech/recordings/${encodeURIComponent(recordingId)}/assemble?visitId=${encodeURIComponent(activeVisit.id)}&patientId=${encodeURIComponent(otherPatient.id)}`,
  headers
});
assert(
  assembleWrongScopeResponse.statusCode === 409,
  `speech assemble must reject mismatched visit/patient, got ${assembleWrongScopeResponse.statusCode}`
);

console.log(
  JSON.stringify({
    ok: true,
    checked: "speech clinical scope ownership",
    speechChunkCount: speechTranscriptionChunks.length
  })
);
