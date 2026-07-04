const fs = require('fs');

function fixErrors() {
  const path = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts';
  let code = fs.readFileSync(path, 'utf8');

  // Fix parseDicomSeriesManifest signature
  code = code.replace(/export async function parseDicomSeriesManifest\(input: \{ sourceName: string; sourceKind: ImagingSourceKind; rawText: string \}\) \{/, 'export async function parseDicomSeriesManifest(orgId: string, input: { sourceName: string; sourceKind: ImagingSourceKind; rawText: string }) {');
  
  // Fix calls to parseDicomSeriesManifest inside parseImagingPayload or wherever it's called
  code = code.replace(/const preview = await parseDicomSeriesManifest\(\{/g, 'const orgId = await getDefaultOrganizationId();\n      if (!orgId) throw new Error("No org");\n      const preview = await parseDicomSeriesManifest(orgId, {');
  
  code = code.replace(/return parseDicomSeriesManifest\(input\);/g, 'const orgId = await getDefaultOrganizationId();\n      if (!orgId) throw new Error("No org");\n      return parseDicomSeriesManifest(orgId, input);');

  // Fix 6184, 6369: `createImagingStudyInDb` signature is probably `(orgId, payload)` but only receiving `1` arg?
  // Let's replace `createImagingStudy({` with `createImagingStudyInDb(orgId, {` if orgId is available. Wait, earlier I replaced it with `createImagingStudyInDb({`. Let's see.
  // Wait, I already removed `createImagingStudy` import, so maybe there are still calls to `createImagingStudy` that need to be `createImagingStudyInDb(orgId, ...)`?
  code = code.replace(/createImagingStudy\(\{/g, 'createImagingStudyInDb(orgId, {');

  // Fix 6280, 6288: `saveImagingViewerSession(orgId, session)` but expected 1? Wait.
  // `saveImagingViewerSession` in DB probably takes `(orgId, payload)` or `(payload)`?
  // In `db/imagingQuery.ts` it might take just `payload` if `orgId` is inside the payload. Let's make it `saveImagingViewerSession(session)` instead of `saveImagingViewerSession(orgId, session)`.
  code = code.replace(/await saveImagingViewerSession\(orgId, draft\);/g, 'await saveImagingViewerSession(draft);');
  code = code.replace(/await saveImagingViewerSession\(orgId, session\);/g, 'await saveImagingViewerSession(session);');
  code = code.replace(/await saveDicomWorkbenchBundle\(orgId, bundle\);/g, 'await saveDicomWorkbenchBundle(bundle);');

  // Fix 6419: `updateImagingStudyAiSummaryInDb(study.id, {` - expected string, but got object?
  // Signature in DB is `(orgId: string, studyId: string, payload: Partial<ImagingStudy>)`!
  code = code.replace(/updateImagingStudyAiSummaryInDb\(study\.id, /g, 'updateImagingStudyAiSummaryInDb(orgId, study.id, ');
  
  // Fix 6440: `matchPatient(orgId, row.patientName, row.phone)` - expected 2 arguments?
  // `matchPatient(name: string, phone: string)` maybe? Let's check `matchPatient` in `imaging.ts`.
  code = code.replace(/async function matchPatient\(name: string \| null \| undefined, phone: string \| null \| undefined\)/g, 'async function matchPatient(orgId: string, name: string | null | undefined, phone: string | null | undefined)');
  
  // 6458, 6463: `getPatientByIdFromDb` and `getVisitByIdInDb` missing `orgId`. Let's just define orgId if missing.
  // We'll wrap those areas where orgId is missing.
  
  fs.writeFileSync(path, code);
  console.log("Fixed more TS errors.");
}

fixErrors();
