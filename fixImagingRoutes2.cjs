const fs = require('fs');

let path = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts';
let code = fs.readFileSync(path, 'utf8');

// Add getPatientsFromDb import
code = code.replace(/import \{ getVisitByIdInDb \} from "\.\.\/db\/visitsQuery\.js";/, 'import { getVisitByIdInDb } from "../db/visitsQuery.js";\nimport { getPatientsFromDb } from "../db/patientsQuery.js";');

// Fix matchPatient to be async
code = code.replace(/function matchPatient\(patientName: string \| null, phone: string \| null\) \{/, 'async function matchPatient(orgId: string, patientName: string | null, phone: string | null) {\n  const patients = await getPatientsFromDb(orgId);');

// Fix calls to matchPatient
code = code.replace(/const patient = matchPatient\(patientName, phone\);/g, 'const patient = await matchPatient(orgId, patientName, phone);');
code = code.replace(/const patient = matchPatient\(draft\.patientName \?\? null, draft\.phone \?\? null\);/g, 'const patient = await matchPatient(orgId, draft.patientName ?? null, draft.phone ?? null);');
code = code.replace(/const patient = matchPatient\(draft\.patientName \?\? lineFallback\.patientName, draft\.phone \?\? lineFallback\.phone\);/g, 'const patient = await matchPatient(orgId, draft.patientName ?? lineFallback.patientName, draft.phone ?? lineFallback.phone);');

// Replace findVisitById with getVisitByIdInDb
code = code.replace(/const visit = input\.visitId \? findVisitById\(input\.visitId\) : null;/g, 'const visit = input.visitId ? await getVisitByIdInDb(orgId, input.visitId) : null;');

// Fix orgId in /api/imaging/dicom-workbench endpoints
code = code.replace(/app\.post\("\/api\/imaging\/dicom-workbench", async \(request, reply\) => \{/, 'app.post("/api/imaging/dicom-workbench", async (request, reply) => {\n      const orgId = await getDefaultOrganizationId();\n      if (!orgId) return reply.code(500).send({ error: "No org" });');
code = code.replace(/app\.get\("\/api\/imaging\/dicom-workbench", async \(request, reply\) => \{/, 'app.get("/api/imaging/dicom-workbench", async (request, reply) => {\n      const orgId = await getDefaultOrganizationId();\n      if (!orgId) return reply.code(500).send({ error: "No org" });');

fs.writeFileSync(path, code);
console.log("imaging.ts refactored 2 successfully.");
