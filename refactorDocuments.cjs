const fs = require('fs');

let c = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents.ts', 'utf8');

// 1. Add DB imports
c = c.replace(
  /import \{\n  getDefaultOrganizationId,/,
  `import { getPaymentsByPatientIdInDb } from "../db/billingQuery.js";\nimport { getAppointmentByIdInDb } from "../db/appointmentsQuery.js";\nimport { getVisitByIdInDb } from "../db/visitsQuery.js";\nimport { getDocumentRenderContextFromDb } from "../db/documentQuery.js";\nimport {\n  getDefaultOrganizationId,`
);

// 2. Remove sampleData imports
c = c.replace(
  /import \{\n  appointments,\n  \n  clinicProfile,\n  \n  findVisitById,\n  \n  patients,\n  payments,\n  readIssuedDocumentSnapshot,\n  serviceCatalog,\n  \n  treatmentPlanItems,\n  \n\} from "\.\.\/sampleData\.js";/,
  ''
);

// 3. Fix medicalRecordExtractVisitDate to be async
c = c.replace(
  /export function medicalRecordExtractVisitDate\(visitId: string\): number \| null \{/g,
  `export async function medicalRecordExtractVisitDate(organizationId: string, visitId: string): Promise<number | null> {`
);
c = c.replace(
  /const visit = findVisitById\(visitId\);/g,
  `const visit = await getVisitByIdInDb(organizationId, visitId);`
);
c = c.replace(
  /const appointment = visit\.appointmentId \? appointments\.find\(\(candidate\) => candidate\.id === visit\.appointmentId\) : null;/g,
  `const appointment = visit.appointmentId ? await getAppointmentByIdInDb(organizationId, visit.appointmentId) : null;`
);

// 4. Fix signedMedicalSourceVisitsAreValid to be async
c = c.replace(
  /export function signedMedicalSourceVisitsAreValid\(/g,
  `export async function signedMedicalSourceVisitsAreValid(`
);
c = c.replace(
  /const visit = findVisitById\(visitId\);/g,
  `const visit = await getVisitByIdInDb(document.organizationId, visitId);` // This will replace inside the loop too, wait we need to handle every/some properly.
);

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents.ts', c);
console.log('Partial refactor of documents.ts done.');
