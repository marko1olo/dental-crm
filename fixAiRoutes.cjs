const fs = require('fs');

let aiPath = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/ai.ts';
let ai = fs.readFileSync(aiPath, 'utf8');

// 1. Update imports
ai = ai.replace(/import \{\n  createAiRecognitionJob,\n  imagingStudies,\n  listAiRecognitionJobs,\n  patients,\n\} from "\.\.\/sampleData\.js";/, '');
ai = ai.replace(/import \{ imagingAnnotations \} from "\.\.\/db\/schema\.js";/, 'import { imagingAnnotations } from "../db/schema.js";\nimport { listAiRecognitionJobsFromDb, createAiRecognitionJobInDb } from "../db/aiQuery.js";\nimport { getPatientByIdFromDb } from "../db/patientsQuery.js";\nimport { getImagingStudyById } from "../db/imagingQuery.js";\nimport { getDefaultOrganizationId } from "../db/documentQuery.js";');

// 2. listAiRecognitionJobs -> await listAiRecognitionJobsFromDb(orgId)
ai = ai.replace(/app\.get\("\/api\/ai\/recognition-jobs", async \(request, reply\) => \{/, 'app.get("/api/ai/recognition-jobs", async (request, reply) => {\n    const orgId = await getDefaultOrganizationId();\n    if (!orgId) return reply.code(500).send({ error: "No organization" });');
ai = ai.replace(/return z\.array\(aiRecognitionJobSchema\)\.parse\(listAiRecognitionJobs\(\)\);/, 'return z.array(aiRecognitionJobSchema).parse(await listAiRecognitionJobsFromDb(orgId));');

// 3. createAiRecognitionJob -> await createAiRecognitionJobInDb
ai = ai.replace(/app\.post\("\/api\/ai\/recognition-jobs", async \(request, reply\) => \{/, 'app.post("/api/ai/recognition-jobs", async (request, reply) => {\n    const orgId = await getDefaultOrganizationId();\n    if (!orgId) return reply.code(500).send({ error: "No organization" });');

ai = ai.replace(/const patient = input\.patientId\s*\n\s*\? patients\.find\(\(candidate\) => candidate\.id === input\.patientId\)\s*\n\s*: null;/, 'const patient = input.patientId ? await getPatientByIdFromDb(orgId, input.patientId) : null;');
ai = ai.replace(/const imagingStudy = input\.imagingStudyId\s*\n\s*\? imagingStudies\.find\(\s*\n\s*\(candidate\) => candidate\.id === input\.imagingStudyId,\s*\n\s*\)\s*\n\s*: null;/, 'const imagingStudy = input.imagingStudyId ? await getImagingStudyById(orgId, input.imagingStudyId) : null;');

ai = ai.replace(/const job = createAiRecognitionJob\(\{/, 'const job = await createAiRecognitionJobInDb(orgId, {');

// 4. visit-note-draft -> patient lookup
ai = ai.replace(/app\.post\("\/api\/ai\/visit-note-draft", async \(request, reply\) => \{/, 'app.post("/api/ai/visit-note-draft", async (request, reply) => {\n    const orgId = await getDefaultOrganizationId();\n    if (!orgId) return reply.code(500).send({ error: "No organization" });');
ai = ai.replace(/const patient = patients\.find\(\s*\n\s*\(candidate\) => candidate\.id === input\.patientId,\s*\n\s*\);/, 'const patient = await getPatientByIdFromDb(orgId, input.patientId);');

fs.writeFileSync(aiPath, ai);
console.log("ai.ts refactored successfully.");
