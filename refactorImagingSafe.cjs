const fs = require('fs');

function refactorImaging() {
  const path = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts';
  let code = fs.readFileSync(path, 'utf8');

  // 1. Update imports
  code = code.replace(/import \{\n  findVisitById,\n  getOrCreateImagingViewerSession,\n  listDicomWorkbenchBundles,\n  patients,\n  saveDicomWorkbenchBundle,\n  saveImagingViewerSession\n\} from "\.\.\/sampleData\.js";/, '');
  code = code.replace(/import \{\n  getImagingStudiesForPatient,\n  getAllImagingStudies,\n  getImagingStudyById,\n  createImagingStudyInDb,\n  updateImagingStudyAiSummaryInDb,\n  getDefaultOrganizationId\n\} from "\.\.\/db\/imagingQuery\.js";/, 'import {\n  getImagingStudiesForPatient,\n  getAllImagingStudies,\n  getImagingStudyById,\n  createImagingStudyInDb,\n  updateImagingStudyAiSummaryInDb,\n  getDefaultOrganizationId,\n  getOrCreateImagingViewerSession,\n  listDicomWorkbenchBundles,\n  saveDicomWorkbenchBundle,\n  saveImagingViewerSession\n} from "../db/imagingQuery.js";\nimport { getVisitByIdInDb } from "../db/visitsQuery.js";\nimport { getPatientByIdFromDb, getPatientsFromDb } from "../db/patientsQuery.js";');

  // 2. fix /api/imaging/dicom-workbench endpoints
  code = code.replace(/app\.post\("\/api\/imaging\/dicom-workbench", async \(request, reply\) => \{/, 'app.post("/api/imaging/dicom-workbench", async (request, reply) => {\n      const orgId = await getDefaultOrganizationId();\n      if (!orgId) return reply.code(500).send({ error: "No org" });');
  code = code.replace(/const bundle = saveDicomWorkbenchBundle\(input\);/, 'const bundle = await saveDicomWorkbenchBundle(orgId, input);');
  
  code = code.replace(/app\.get\("\/api\/imaging\/dicom-workbench", async \(request, reply\) => \{/, 'app.get("/api/imaging/dicom-workbench", async (request, reply) => {\n      const orgId = await getDefaultOrganizationId();\n      if (!orgId) return reply.code(500).send({ error: "No org" });');
  code = code.replace(/const bundles = listDicomWorkbenchBundles\(Number\.isFinite\(requestedLimit\) \? requestedLimit : 8\);/, 'const bundles = await listDicomWorkbenchBundles(orgId, Number.isFinite(requestedLimit) ? requestedLimit : 8);');

  // 3. fix /api/imaging/studies/:id/viewer-session endpoints
  code = code.replace(/const session = getOrCreateImagingViewerSession\(study\);/, 'const session = await getOrCreateImagingViewerSession(orgId, study);');
  code = code.replace(/const session = saveImagingViewerSession\(id, input\);/, 'const session = await saveImagingViewerSession(orgId, id, input);');

  // 4. matchPatient async
  code = code.replace(/function matchPatient\(patientName: string \| null, phone: string \| null\) \{/, 'async function matchPatient(orgId: string, patientName: string | null, phone: string | null) {\n  const patients = await getPatientsFromDb(orgId);');
  
  // Safe replacements for `matchPatient`
  code = code.split('matchPatient(patientName, phone)').join('await matchPatient(orgId, patientName, phone)');
  code = code.split('matchPatient(draft.patientName ?? null, draft.phone ?? null)').join('await matchPatient(orgId, draft.patientName ?? null, draft.phone ?? null)');
  code = code.split('matchPatient(draft.patientName ?? lineFallback.patientName, draft.phone ?? lineFallback.phone)').join('await matchPatient(orgId, draft.patientName ?? lineFallback.patientName, draft.phone ?? lineFallback.phone)');

  // 5. parseManifestLine and parseDicomManifestLine to async with orgId
  code = code.replace(/function parseManifestLine\(line: string, rowNumber: number, sourceKind: ImagingSourceKind, sourceName: string\): ImagingImportPreviewRow \{/g, 'async function parseManifestLine(orgId: string, line: string, rowNumber: number, sourceKind: ImagingSourceKind, sourceName: string): Promise<ImagingImportPreviewRow> {');
  code = code.replace(/function parseDicomManifestLine\(line: string, rowNumber: number, sourceKind: ImagingSourceKind, sourceName: string\): \n?DicomSeriesPreviewRow \{/g, 'async function parseDicomManifestLine(orgId: string, line: string, rowNumber: number, sourceKind: ImagingSourceKind, sourceName: string): Promise<DicomSeriesPreviewRow> {');

  code = code.split('parseManifestLine(line, index + 1, input.sourceKind, input.sourceName)').join('await parseManifestLine(orgId, line, index + 1, input.sourceKind, input.sourceName)');
  code = code.split('parseManifestLine(line, rowNumber, sourceKind, sourceName)').join('await parseManifestLine(orgId, line, rowNumber, sourceKind, sourceName)');

  code = code.split('parseDicomManifestLine(line, index + 1, input.sourceKind, input.sourceName)').join('await parseDicomManifestLine(orgId, line, index + 1, input.sourceKind, input.sourceName)');
  code = code.split('parseDicomManifestLine(line, index + 2, input.sourceKind, input.sourceName)').join('await parseDicomManifestLine(orgId, line, index + 2, input.sourceKind, input.sourceName)');

  // 6. parseImagingManifest mapping
  code = code.replace(/export function parseImagingManifest\(input: \{ sourceName: string; sourceKind: ImagingSourceKind; rawText: string \}\) \{/, 'export async function parseImagingManifest(orgId: string, input: { sourceName: string; sourceKind: ImagingSourceKind; rawText: string }) {');
  // Handle async maps
  code = code.replace(/const rows: ImagingImportPreviewRow\[\] = \(hasHeader \? lines\.slice\(1\) : lines\)\.map\(\(line, index\) => \{/g, 'const rows: ImagingImportPreviewRow[] = await Promise.all((hasHeader ? lines.slice(1) : lines).map(async (line, index) => {');
  // Find the closing brace for ImagingImportPreviewRow map, it's just before `return imagingImportPreviewResponseSchema`
  code = code.replace(/        warnings\n      \};\n    \}\);\n\n    return imagingImportPreviewResponseSchema/g, '        warnings\n      };\n    }));\n\n    return imagingImportPreviewResponseSchema');

  // 7. parseDicomImagingManifest mapping
  code = code.replace(/export function parseDicomImagingManifest\(input: \{ sourceName: string; sourceKind: ImagingSourceKind; rawText: string \}\) \{/, 'export async function parseDicomImagingManifest(orgId: string, input: { sourceName: string; sourceKind: ImagingSourceKind; rawText: string }) {');
  code = code.replace(/const rows: DicomSeriesPreviewRow\[\] = \(hasHeader \? lines\.slice\(1\) : lines\)\.map\(\(line, index\) => \{/g, 'const rows: DicomSeriesPreviewRow[] = await Promise.all((hasHeader ? lines.slice(1) : lines).map(async (line, index) => {');
  code = code.replace(/        warnings\n      \};\n    \}\);\n    const series = buildDicomSeriesGroups/g, '        warnings\n      };\n    }));\n    const series = buildDicomSeriesGroups');

  // 8. pass orgId to parse calls inside routes
  code = code.replace(/const preview = parseImagingManifest\(input\);/g, 'const orgId = await getDefaultOrganizationId();\n      if (!orgId) return reply.code(500).send({ error: "No org" });\n      const preview = await parseImagingManifest(orgId, input);');
  code = code.replace(/const preview = parseDicomImagingManifest\(input\);/g, 'const orgId = await getDefaultOrganizationId();\n      if (!orgId) return reply.code(500).send({ error: "No org" });\n      const preview = await parseDicomImagingManifest(orgId, input);');
  
  // Note: the `folder_watch` call is inside a map, we need to pass `orgId` properly.
  // Actually, we replaced it exactly:
  code = code.replace(/const preview = parseImagingManifest\(\{\n\s*sourceName: input\.sourceName,\n\s*sourceKind: "folder_watch",\n\s*rawText\n\s*\}\);/g, 'const orgId = await getDefaultOrganizationId();\n      if (!orgId) throw new Error("No org");\n      const preview = await parseImagingManifest(orgId, { sourceName: input.sourceName, sourceKind: "folder_watch", rawText });');

  // 9. commit routes (no `const orgId = ...` needed since we pass it)
  code = code.replace(/export async function commitImagingImport\(input: \{ sourceName: string; sourceKind: ImagingSourceKind; rawText: string \}\) \{/g, 'export async function commitImagingImport(orgId: string, input: { sourceName: string; sourceKind: ImagingSourceKind; rawText: string }) {');
  code = code.replace(/export async function commitDicomImagingImport\(input: \{ sourceName: string; sourceKind: ImagingSourceKind; rawText: string \}\) \{/g, 'export async function commitDicomImagingImport(orgId: string, input: { sourceName: string; sourceKind: ImagingSourceKind; rawText: string }) {');
  
  // replace `parseImagingManifest(input)` inside commit methods
  code = code.split('const preview = await parseImagingManifest(input);').join('const preview = await parseImagingManifest(orgId, input);');
  code = code.split('const preview = parseImagingManifest(input);').join('const preview = await parseImagingManifest(orgId, input);');
  code = code.split('const preview = parseDicomImagingManifest(input);').join('const preview = await parseDicomImagingManifest(orgId, input);');

  // replace `const patient = patients.find`
  code = code.split('const patient = patients.find((candidate) => candidate.id === input.patientId);').join('const patient = await getPatientByIdFromDb(orgId, input.patientId);');
  code = code.split('const patient = patients.find((candidate) => candidate.id === draft.patientId);').join('const patient = draft.patientId ? await getPatientByIdFromDb(orgId, draft.patientId) : null;');

  // replace `findVisitById`
  code = code.split('const visit = input.visitId ? findVisitById(input.visitId) : null;').join('const visit = input.visitId ? await getVisitByIdInDb(orgId, input.visitId) : null;');
  code = code.split('const visit = findVisitById(input.visitId);').join('const visit = await getVisitByIdInDb(orgId, input.visitId);');

  // createImagingStudy -> await createImagingStudyInDb(orgId, ...)
  // original:
  // const study = createImagingStudy({
  //   ...
  // });
  // We can just replace `createImagingStudy({` with `await createImagingStudyInDb(orgId, {`
  // And the `map` needs to be replaced with `for` loop so await works.
  
  let loop1Search = `const createdStudyIds = readyRows.map((row) => {
      const study = createImagingStudy({`;
  let loop1Replace = `const createdStudyIds: string[] = [];
    for (const row of readyRows) {
      const study = await createImagingStudyInDb(orgId, {`;
  code = code.replace(loop1Search, loop1Replace);
  
  // And we need to change the return of the map:
  let loop1EndSearch = `});
      return study.id;
    });`;
  let loop1EndReplace = `});
      createdStudyIds.push(study.id);
    }`;
  code = code.replace(loop1EndSearch, loop1EndReplace);

  // Dicom loop
  let loop2Search = `const createdStudyIds = readySeries.map((series) => {
      const study = createImagingStudy({`;
  let loop2Replace = `const createdStudyIds: string[] = [];
    for (const series of readySeries) {
      const study = await createImagingStudyInDb(orgId, {`;
  code = code.replace(loop2Search, loop2Replace);
  
  let loop2EndSearch = `});
      return study.id;
    });`;
  let loop2EndReplace = `});
      createdStudyIds.push(study.id);
    }`;
  code = code.replace(loop2EndSearch, loop2EndReplace);

  // route calls to commit
  code = code.split('const result = await commitImagingImport(input);').join('const orgId = await getDefaultOrganizationId();\n      if (!orgId) return reply.code(500).send({ error: "No org" });\n      const result = await commitImagingImport(orgId, input);');
  code = code.split('const result = await commitDicomImagingImport(input);').join('const orgId = await getDefaultOrganizationId();\n      if (!orgId) return reply.code(500).send({ error: "No org" });\n      const result = await commitDicomImagingImport(orgId, input);');


  fs.writeFileSync(path, code);

  let smartPath = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/smartImports.ts';
  if (fs.existsSync(smartPath)) {
    let smartCode = fs.readFileSync(smartPath, 'utf8');
    smartCode = smartCode.replace(/const preview = parseImagingManifest\(\{\n\s*sourceName: sourceName \?\? \`folder_watch_\$\{folderPath\}\`,\n\s*sourceKind: "folder_watch",\n\s*rawText\n\s*\}\);/g, 'const orgId = await getDefaultOrganizationId();\n      if (!orgId) throw new Error("No org");\n      const preview = await parseImagingManifest(orgId, {\n        sourceName: sourceName ?? `folder_watch_${folderPath}`,\n        sourceKind: "folder_watch",\n        rawText\n      });');
    fs.writeFileSync(smartPath, smartCode);
  }
  
  let testPath = 'C:/Clinic_MVP/dental-crm/apps/api/src/tests/imaging/parseImagingManifest.test.ts';
  if (fs.existsSync(testPath)) {
    let testCode = fs.readFileSync(testPath, 'utf8');
    testCode = testCode.split('parseImagingManifest({').join('await parseImagingManifest("test-org-id", {');
    fs.writeFileSync(testPath, testCode);
  }
  
  let testPath2 = 'C:/Clinic_MVP/dental-crm/apps/api/src/tests/routes/imaging.test.ts';
  if (fs.existsSync(testPath2)) {
    let testCode2 = fs.readFileSync(testPath2, 'utf8');
    testCode2 = testCode2.split('commitImagingImport({').join('commitImagingImport("test-org-id", {');
    fs.writeFileSync(testPath2, testCode2);
  }

  console.log("imaging.ts refactored cleanly!");
}

refactorImaging();
