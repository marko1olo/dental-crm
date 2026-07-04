const fs = require('fs');

function migrateImagingStudies() {
  const path = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts';
  let code = fs.readFileSync(path, 'utf8');

  // 1. Remove `imagingStudies` from `sampleData.js` imports
  code = code.replace(/    imagingStudies,\n/, '');
  code = code.replace(/    patients,\n/, '');
  code = code.replace(/import \{\n\s*createImagingStudy,\n\s*findVisitById,\n\s*getOrCreateImagingViewerSession,\n\s*listDicomWorkbenchBundles,\n\s*saveDicomWorkbenchBundle,\n\s*saveImagingViewerSession\n\} from "\.\.\/sampleData\.js";/, '');

  // Ensure DB imports exist
  if (!code.includes('getAllImagingStudies')) {
    code = code.replace(/import \{ analyzeImagingStudy \} from "\.\.\/ai\/visionAnalyzer\.js";/, 'import {\n  getImagingStudiesForPatient,\n  getAllImagingStudies,\n  getImagingStudyById,\n  createImagingStudyInDb,\n  updateImagingStudyAiSummaryInDb,\n  getDefaultOrganizationId,\n  getOrCreateImagingViewerSession,\n  listDicomWorkbenchBundles,\n  saveDicomWorkbenchBundle,\n  saveImagingViewerSession\n} from "../db/imagingQuery.js";\nimport { getVisitByIdInDb } from "../db/visitsQuery.js";\nimport { getPatientByIdFromDb, getPatientsFromDb } from "../db/patientsQuery.js";\nimport { analyzeImagingStudy } from "../ai/visionAnalyzer.js";');
  }

  // 2. Types: `(typeof imagingStudies)[number]` -> `ImagingStudy`
  code = code.replace(/function previewSvg\(study: \(typeof imagingStudies\)\[number\]\) \{/g, 'function previewSvg(study: any) {');
  
  // 3. Routes that use `imagingStudies`
  // GET /api/imaging/studies
  // It has: `const studies = patientId ? imagingStudies.filter((study) => study.patientId === patientId) : imagingStudies;`
  // We need to inject `orgId`
  code = code.replace(/app\.get\("\/api\/imaging\/studies", async \(request, reply\) => \{([^]*?)const studies = patientId \? imagingStudies\.filter\(\(study\) => study\.patientId === patientId\) : imagingStudies;/, 'app.get("/api/imaging/studies", async (request, reply) => {$1const orgId = await getDefaultOrganizationId();\n      if (!orgId) return reply.code(500).send({ error: "No org" });\n      const studies = patientId ? await getImagingStudiesForPatient(orgId, patientId) : await getAllImagingStudies(orgId);');

  // Any other `imagingStudies.find`
  // E.g. GET /api/imaging/studies/:id
  code = code.replace(/const study = imagingStudies\.find\(\(candidate\) => candidate\.id === id\);/g, 'const orgId = await getDefaultOrganizationId();\n      if (!orgId) return reply.code(500).send({ error: "No org" });\n      const study = await getImagingStudyById(orgId, id);');
  
  // For `commitImagingImport`, etc., where `orgId` is already defined in scope:
  // If `orgId` is already defined, the above replacement might cause duplicated `orgId` declarations.
  // Wait, `imagingStudies.find` is used inside Fastify handlers where `orgId` is NOT defined yet.
  // Let's check if there are `imagingStudies.find` inside functions that already have `orgId`.
  // Actually, there are only a few fastify routes that do this.
  // Let's do a more robust approach:
  let searchFind = `const study = imagingStudies.find((candidate) => candidate.id === id);`;
  let replaceFind = `const orgId = await getDefaultOrganizationId();
      if (!orgId) throw new Error("No org");
      const study = await getImagingStudyById(orgId, id);`;
  
  code = code.split(searchFind).join(replaceFind);

  // Note: Fastify routes have `reply.code(500).send` but if it's inside a function, `throw` is safer if `reply` isn't available. Let's use `throw new Error("No org");` if it's inside a route that might not handle it, but wait, fastify catches errors and returns 500.

  // 4. `patients` usages
  // We already replaced `patients.find` in `commitImagingImport` and `commitDicomImagingImport`.
  // Are there any other `patients.find`?
  code = code.split(`const patient = patients.find((candidate) => candidate.id === request.params.patientId);`).join(`const orgId = await getDefaultOrganizationId();\n      const patient = await getPatientByIdFromDb(orgId, request.params.patientId);`);
  
  code = code.split(`patients.find((candidate) => candidate.id === id)`).join(`await getPatientByIdFromDb(orgId, id)`);

  fs.writeFileSync(path, code);
  console.log("imagingStudies migrated to DB queries in imaging.ts.");
}

migrateImagingStudies();
