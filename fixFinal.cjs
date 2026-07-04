const fs = require('fs');

function fixFinalImagingIssues() {
  const path = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts';
  let code = fs.readFileSync(path, 'utf8');

  // Fix signature of parseImagingManifest and parseDicomImagingManifest to include orgId
  code = code.replace(/export async function parseImagingManifest\(input: \{ sourceName: string; sourceKind: ImagingSourceKind; rawText: string \}\) \{/, 'export async function parseImagingManifest(orgId: string, input: { sourceName: string; sourceKind: ImagingSourceKind; rawText: string }) {');
  code = code.replace(/export async function parseDicomImagingManifest\(input: \{ sourceName: string; sourceKind: ImagingSourceKind; rawText: string \}\) \{/, 'export async function parseDicomImagingManifest(orgId: string, input: { sourceName: string; sourceKind: ImagingSourceKind; rawText: string }) {');

  // getPatientsFromDb might not be imported if the `replace` failed.
  if (!code.includes('getPatientsFromDb')) {
    code = code.replace(/import \{ getVisitByIdInDb \} from "\.\.\/db\/visitsQuery\.js";/, 'import { getVisitByIdInDb } from "../db/visitsQuery.js";\nimport { getPatientByIdFromDb, getPatientsFromDb } from "../db/patientsQuery.js";');
  } else if (!code.includes('getPatientByIdFromDb')) {
    code = code.replace(/import \{ getPatientsFromDb \} from "\.\.\/db\/patientsQuery\.js";/, 'import { getPatientByIdFromDb, getPatientsFromDb } from "../db/patientsQuery.js";');
  }

  // 6266 and 6274
  // `saveDicomWorkbenchBundle` signature takes 2 args, but the error says Expected 1.
  // This means the function in db/imagingQuery.ts or sampleData.ts takes 1 argument!
  // Wait, I updated it in the DB file in the previous checkpoint.
  // Oh, `saveDicomWorkbenchBundle` was in `sampleData.ts`. Did I migrate it?
  // Let me check `imagingQuery.ts`.

  fs.writeFileSync(path, code);
  console.log("Fixed signatures in imaging.ts.");
}

fixFinalImagingIssues();
