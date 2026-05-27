import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";

const routePath = path.resolve("apps/api/dist/routes/ai.js");
const sampleDataPath = path.resolve("apps/api/dist/sampleData.js");
const sharedPath = path.resolve("packages/shared/dist/index.js");

if (!existsSync(routePath) || !existsSync(sampleDataPath) || !existsSync(sharedPath)) {
  throw new Error("Build API first: npm run build");
}

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerAiRoutes } = await import(pathToFileURL(routePath).href);
const { activeVisit, aiRecognitionJobs, imagingStudies, patients } = await import(pathToFileURL(sampleDataPath).href);
const { createAiRecognitionJobSchema, visitNoteDraftRequestSchema } = await import(pathToFileURL(sharedPath).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const app = Fastify({ logger: false });
await registerAiRoutes(app);

const activePatient = patients.find((patient) => patient.id === activeVisit.patientId);
const otherPatient = patients.find((patient) => patient.id !== activeVisit.patientId);
const activePatientStudy = imagingStudies.find((study) => study.patientId === activeVisit.patientId);
assert(activePatient, "fixture active patient missing");
assert(otherPatient, "fixture second patient missing");
assert(activePatientStudy, "fixture active patient imaging study missing");

const basePayload = {
  kind: "image_summary",
  target: "imaging_summary",
  sourceLabel: "smoke",
  inputText: "Smoke imaging note draft"
};

assert(
  !createAiRecognitionJobSchema.safeParse({ ...basePayload, sourceLabel: "   " }).success,
  "AI recognition contract must reject blank source labels"
);
assert(
  !createAiRecognitionJobSchema.safeParse({ ...basePayload, inputText: "   " }).success,
  "AI recognition contract must reject blank input text"
);
assert(
  !createAiRecognitionJobSchema.safeParse({ ...basePayload, sourceLabel: "x".repeat(161) }).success,
  "AI recognition contract must reject oversized source labels"
);
assert(
  !createAiRecognitionJobSchema.safeParse({ ...basePayload, inputText: "x".repeat(80001) }).success,
  "AI recognition contract must reject oversized input text"
);
const trimmedInput = createAiRecognitionJobSchema.parse({
  ...basePayload,
  sourceLabel: "  voice draft  ",
  inputText: "  Tooth 36 image note  "
});
assert(trimmedInput.sourceLabel === "voice draft", "AI recognition contract must trim source labels");
assert(trimmedInput.inputText === "Tooth 36 image note", "AI recognition contract must trim input text");
assert(
  !visitNoteDraftRequestSchema.safeParse({ patientId: activePatient.id, transcript: "   " }).success,
  "visit note draft contract must reject blank transcript"
);
assert(
  !visitNoteDraftRequestSchema.safeParse({ patientId: activePatient.id, transcript: "x".repeat(80001) }).success,
  "visit note draft contract must reject oversized transcript"
);
assert(
  visitNoteDraftRequestSchema.parse({ patientId: activePatient.id, transcript: "  Tooth 36 pain  " }).transcript ===
    "Tooth 36 pain",
  "visit note draft contract must trim transcript"
);

const blankInputResponse = await app.inject({
  method: "POST",
  url: "/api/ai/recognition-jobs",
  payload: {
    ...basePayload,
    inputText: "   "
  }
});
assert(blankInputResponse.statusCode === 400, `AI job blank input must return 400, got ${blankInputResponse.statusCode}`);

const blankVisitDraftResponse = await app.inject({
  method: "POST",
  url: "/api/ai/visit-note-draft",
  payload: {
    patientId: activePatient.id,
    transcript: "   "
  }
});
assert(
  blankVisitDraftResponse.statusCode === 400,
  `AI visit note draft blank transcript must return 400, got ${blankVisitDraftResponse.statusCode}`
);

const oversizedVisitDraftResponse = await app.inject({
  method: "POST",
  url: "/api/ai/visit-note-draft",
  payload: {
    patientId: activePatient.id,
    transcript: "x".repeat(80001)
  }
});
assert(
  oversizedVisitDraftResponse.statusCode === 400,
  `AI visit note draft oversized transcript must return 400, got ${oversizedVisitDraftResponse.statusCode}`
);

const validVisitDraftResponse = await app.inject({
  method: "POST",
  url: "/api/ai/visit-note-draft",
  payload: {
    patientId: activePatient.id,
    transcript: "  Tooth 36 pain on bite  ",
    specialty: "therapist",
    source: "voice"
  }
});
assert(validVisitDraftResponse.statusCode === 200, `valid AI visit note draft failed: ${validVisitDraftResponse.statusCode}`);

const invalidPayloadResponse = await app.inject({
  method: "POST",
  url: "/api/ai/recognition-jobs",
  payload: {
    ...basePayload,
    kind: "image_analysis"
  }
});
assert(invalidPayloadResponse.statusCode === 400, `AI job invalid payload must return 400, got ${invalidPayloadResponse.statusCode}`);

const missingPatientResponse = await app.inject({
  method: "POST",
  url: "/api/ai/recognition-jobs",
  payload: {
    ...basePayload,
    patientId: "11111111-1111-4111-8111-111111111111"
  }
});
assert(missingPatientResponse.statusCode === 404, `AI job must reject unknown patient, got ${missingPatientResponse.statusCode}`);

const missingStudyResponse = await app.inject({
  method: "POST",
  url: "/api/ai/recognition-jobs",
  payload: {
    ...basePayload,
    imagingStudyId: "11111111-1111-4111-8111-111111111111"
  }
});
assert(missingStudyResponse.statusCode === 404, `AI job must reject unknown imaging study, got ${missingStudyResponse.statusCode}`);

const wrongPatientStudyResponse = await app.inject({
  method: "POST",
  url: "/api/ai/recognition-jobs",
  payload: {
    ...basePayload,
    patientId: otherPatient.id,
    imagingStudyId: activePatientStudy.id
  }
});
assert(
  wrongPatientStudyResponse.statusCode === 409,
  `AI job must reject imaging study linked to another patient, got ${wrongPatientStudyResponse.statusCode}`
);

const inheritedPatientResponse = await app.inject({
  method: "POST",
  url: "/api/ai/recognition-jobs",
  payload: {
    ...basePayload,
    imagingStudyId: activePatientStudy.id
  }
});
assert(inheritedPatientResponse.statusCode === 201, `AI job should inherit patient from imaging study: ${inheritedPatientResponse.statusCode}`);
const inheritedJob = inheritedPatientResponse.json().job;
assert(inheritedJob.patientId === activePatient.id, "AI job must inherit imaging study patient");
assert(inheritedJob.imagingStudyId === activePatientStudy.id, "AI job must keep imaging study link");

const validPatientResponse = await app.inject({
  method: "POST",
  url: "/api/ai/recognition-jobs",
  payload: {
    ...basePayload,
    sourceLabel: "  smoke source  ",
    inputText: "  Smoke imaging note draft  ",
    patientId: activePatient.id
  }
});
assert(validPatientResponse.statusCode === 201, `valid patient-scoped AI job failed: ${validPatientResponse.statusCode}`);
assert(validPatientResponse.json().job.patientId === activePatient.id, "valid AI job patient mismatch");
assert(validPatientResponse.json().job.sourceLabel === "smoke source", "valid AI job must store trimmed source label");
assert(validPatientResponse.json().job.inputText === "Smoke imaging note draft", "valid AI job must store trimmed input text");

console.log(
  JSON.stringify({
    ok: true,
    checked: "ai recognition patient and imaging ownership",
    aiRecognitionJobCount: aiRecognitionJobs.length
  })
);
