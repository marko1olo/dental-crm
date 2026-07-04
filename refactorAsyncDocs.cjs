const fs = require('fs');

let c = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents.ts', 'utf8');

c = c.replace(
  /export function medicalRecordExtractVisitDate\(visitId: string\): number \| null \{[\s\S]*?comparableDocumentChainDate\(visit\.createdAt\)\n    \);\n  \}/,
  `export async function medicalRecordExtractVisitDate(organizationId: string, visitId: string): Promise<number | null> {
    const visit = await getVisitByIdInDb(organizationId, visitId);
    if (!visit) return null;
    const appointment = visit.appointmentId ? await getAppointmentByIdInDb(organizationId, visit.appointmentId) : null;
    return (
      comparableDocumentChainDate(appointment?.startsAt) ??
      comparableDocumentChainDate(visit.updatedAt) ??
      comparableDocumentChainDate(visit.createdAt)
    );
  }`
);

c = c.replace(
  /export function signedMedicalSourceVisitsAreValid\([\s\S]*?return true;\n    \}\);\n  \}/,
  `export async function signedMedicalSourceVisitsAreValid(
    sourceVisitIds: readonly string[],
    document: GeneratedDocument,
    periodStartRaw: string | null | undefined,
    periodEndRaw: string | null | undefined
  ): Promise<boolean> {
    const periodStart = comparableDocumentChainDate(periodStartRaw);
    const periodEnd = comparableDocumentChainDate(periodEndRaw);
    if (!documentChainDateRangeIsChronological(periodStartRaw, periodEndRaw)) return false;
    for (const visitId of sourceVisitIds) {
      const visit = await getVisitByIdInDb(document.organizationId, visitId);
      if (!visit || visit.patientId !== document.patientId || visit.status !== "signed") return false;

      const visitDate = await medicalRecordExtractVisitDate(document.organizationId, visitId);
      if (visitDate === null) return false;
      if (periodStart !== null && visitDate < periodStart) return false;
      if (periodEnd !== null && visitDate > periodEnd) return false;
    }
    return true;
  }`
);

c = c.replace(
  /export function medicalRecordExtractSourcesAreValid\(payload: MedicalRecordExtractPayload, document: GeneratedDocument\): boolean \{\n    return signedMedicalSourceVisitsAreValid\(payload\.sourceVisitIds, document, payload\.periodStart, payload\.periodEnd\);\n  \}/,
  `export async function medicalRecordExtractSourcesAreValid(payload: MedicalRecordExtractPayload, document: GeneratedDocument): Promise<boolean> {
    return await signedMedicalSourceVisitsAreValid(payload.sourceVisitIds, document, payload.periodStart, payload.periodEnd);
  }`
);

c = c.replace(
  /export function outpatientMedicalCard025uSourcesAreValid\(payload: OutpatientMedicalCard025uPayload, document: GeneratedDocument\): boolean \{[\s\S]*?return signedMedicalSourceVisitsAreValid\(payload\.sourceVisitIds, document, payload\.periodStart, payload\.periodEnd\);\n  \}/,
  `export async function outpatientMedicalCard025uSourcesAreValid(payload: OutpatientMedicalCard025uPayload, document: GeneratedDocument): Promise<boolean> {
    if (!payload.sourceVisitIds.length || !payload.specialistVisitRecords.length) return false;
    const sourceIds = new Set(payload.sourceVisitIds);
    if (payload.specialistVisitRecords.some((record) => !sourceIds.has(record.sourceVisitId))) return false;
    return await signedMedicalSourceVisitsAreValid(payload.sourceVisitIds, document, payload.periodStart, payload.periodEnd);
  }`
);

c = c.replace(
  /export function documentRenderContext\(\) \{\n    return \{ clinicProfile, payments, serviceCatalog, treatmentPlanItems \};\n  \}/,
  `` // Just remove it, since we'll use getDocumentRenderContextFromDb directly
);

c = c.replace(
  /export async function buildDocumentAuditFacts\(document: GeneratedDocument, patient: \(typeof patients\)\[number\]\) \{/,
  `export async function buildDocumentAuditFacts(document: GeneratedDocument, patient: Patient) {`
);
c = c.replace(
  /const renderContext = documentRenderContext\(\);/,
  `const renderContext = await getDocumentRenderContextFromDb(document.organizationId, patient.id);`
);

// We need to add the DB imports
c = c.replace(
  /import \{\n  getDefaultOrganizationId,/,
  `import { getAppointmentByIdInDb } from "../db/appointmentsQuery.js";\nimport { getVisitByIdInDb } from "../db/visitsQuery.js";\nimport { getDocumentRenderContextFromDb, readIssuedDocumentSnapshot } from "../db/documentQuery.js";\nimport {\n  getDefaultOrganizationId,`
);

// We need to remove the sampleData imports
c = c.replace(
  /import \{\n  appointments,\n  \n  clinicProfile,\n  \n  findVisitById,\n  \n  patients,\n  payments,\n  readIssuedDocumentSnapshot,\n  serviceCatalog,\n  \n  treatmentPlanItems,\n  \n\} from "\.\.\/sampleData\.js";/,
  ''
);

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents.ts', c);
console.log('Refactored synchronous functions in documents.ts');
