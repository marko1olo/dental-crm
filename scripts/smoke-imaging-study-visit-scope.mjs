import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";

const routePath = path.resolve("apps/api/dist/routes/imaging.js");
const sampleDataPath = path.resolve("apps/api/dist/sampleData.js");
const sharedPath = path.resolve("packages/shared/dist/index.js");

if (!existsSync(routePath) || !existsSync(sampleDataPath) || !existsSync(sharedPath)) {
  throw new Error("Build API first: npm run build");
}

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerImagingRoutes } = await import(pathToFileURL(routePath).href);
const { activeVisit, imagingStudies, patients } = await import(pathToFileURL(sampleDataPath).href);
const { createImagingStudySchema, imagingImportPreviewRequestSchema } = await import(pathToFileURL(sharedPath).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const app = Fastify({ logger: false });
await registerImagingRoutes(app);

const activePatient = patients.find((patient) => patient.id === activeVisit.patientId);
const otherPatient = patients.find((patient) => patient.id !== activeVisit.patientId);
assert(activePatient, "fixture active visit patient missing");
assert(otherPatient, "fixture second patient missing");

const basePayload = {
  kind: "photo",
  title: "Smoke visit-scoped imaging",
  sourceKind: "manual_upload",
  sourceName: "smoke"
};

assert(
  !createImagingStudySchema.safeParse({ ...basePayload, patientId: activePatient.id, title: "   " }).success,
  "imaging create contract must reject blank study titles"
);
assert(
  !createImagingStudySchema.safeParse({ ...basePayload, patientId: activePatient.id, title: "x".repeat(181) }).success,
  "imaging create contract must reject oversized study titles"
);
const trimmedStudyInput = createImagingStudySchema.parse({
  ...basePayload,
  patientId: activePatient.id,
  title: "  Trimmed imaging  ",
  toothCode: "  36 ",
  region: " lower molar ",
  sourceName: " smoke source "
});
assert(trimmedStudyInput.title === "Trimmed imaging", "imaging create contract must trim study titles");
assert(trimmedStudyInput.toothCode === "36", "imaging create contract must trim tooth codes");
assert(trimmedStudyInput.region === "lower molar", "imaging create contract must trim regions");
assert(trimmedStudyInput.sourceName === "smoke source", "imaging create contract must trim source names");
assert(
  !imagingImportPreviewRequestSchema.safeParse({ rawText: "   " }).success,
  "imaging import preview contract must reject blank manifests"
);
assert(
  !imagingImportPreviewRequestSchema.safeParse({ rawText: "x".repeat(120001) }).success,
  "imaging import preview contract must reject oversized manifests"
);

const wrongPatientVisitResponse = await app.inject({
  method: "POST",
  url: "/api/imaging/studies",
  payload: {
    ...basePayload,
    patientId: otherPatient.id,
    visitId: activeVisit.id
  }
});
assert(
  wrongPatientVisitResponse.statusCode === 409,
  `imaging create must reject a visit from another patient, got ${wrongPatientVisitResponse.statusCode}`
);

const missingVisitResponse = await app.inject({
  method: "POST",
  url: "/api/imaging/studies",
  payload: {
    ...basePayload,
    patientId: activePatient.id,
    visitId: "11111111-1111-4111-8111-111111111111"
  }
});
assert(missingVisitResponse.statusCode === 404, `imaging create must reject an unknown visit, got ${missingVisitResponse.statusCode}`);

const validVisitResponse = await app.inject({
  method: "POST",
  url: "/api/imaging/studies",
  payload: {
    ...basePayload,
    patientId: activePatient.id,
    visitId: activeVisit.id
  }
});
assert(validVisitResponse.statusCode === 201, `valid visit-scoped imaging create failed: ${validVisitResponse.statusCode}`);
const validStudy = validVisitResponse.json();
assert(validStudy.patientId === activePatient.id, "valid imaging study patient mismatch");
assert(validStudy.visitId === activeVisit.id, "valid imaging study visit mismatch");

const patientOnlyResponse = await app.inject({
  method: "POST",
  url: "/api/imaging/studies",
  payload: {
    ...basePayload,
    patientId: activePatient.id
  }
});
assert(patientOnlyResponse.statusCode === 201, `patient-only imaging create should stay allowed: ${patientOnlyResponse.statusCode}`);
assert(patientOnlyResponse.json().visitId === null, "patient-only imaging study must not inherit an arbitrary active visit");

console.log(
  JSON.stringify({
    ok: true,
    checked: "imaging study visit ownership",
    imagingStudyCount: imagingStudies.length
  })
);
