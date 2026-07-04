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
  code = code.replace(/const patient = matchPatient\(patientName, phone\);/g, 'const patient = await matchPatient(orgId, patientName, phone);');
  code = code.replace(/const patient = matchPatient\(draft\.patientName \?\? null, draft\.phone \?\? null\);/g, 'const patient = await matchPatient(orgId, draft.patientName ?? null, draft.phone ?? null);');
  code = code.replace(/const patient = matchPatient\(draft\.patientName \?\? lineFallback\.patientName, draft\.phone \?\? lineFallback\.phone\);/g, 'const patient = await matchPatient(orgId, draft.patientName ?? lineFallback.patientName, draft.phone ?? lineFallback.phone);');

  // 5. parseManifestLine and parseDicomManifestLine to async with orgId
  code = code.replace(/function parseManifestLine\(line: string, rowNumber: number, sourceKind: ImagingSourceKind, sourceName: string\): ImagingImportPreviewRow \{/g, 'async function parseManifestLine(orgId: string, line: string, rowNumber: number, sourceKind: ImagingSourceKind, sourceName: string): Promise<ImagingImportPreviewRow> {');
  code = code.replace(/function parseDicomManifestLine\(line: string, rowNumber: number, sourceKind: ImagingSourceKind, sourceName: string\): \n?DicomSeriesPreviewRow \{/g, 'async function parseDicomManifestLine(orgId: string, line: string, rowNumber: number, sourceKind: ImagingSourceKind, sourceName: string): Promise<DicomSeriesPreviewRow> {');

  code = code.replace(/return parseManifestLine\(line, index \+ 1, input\.sourceKind, input\.sourceName\);/g, 'return await parseManifestLine(orgId, line, index + 1, input.sourceKind, input.sourceName);');
  code = code.replace(/const base = parseManifestLine\(line, rowNumber, sourceKind, sourceName\);/g, 'const base = await parseManifestLine(orgId, line, rowNumber, sourceKind, sourceName);');

  code = code.replace(/return parseDicomManifestLine\(line, index \+ 1, input\.sourceKind, input\.sourceName\);/g, 'return await parseDicomManifestLine(orgId, line, index + 1, input.sourceKind, input.sourceName);');
  code = code.replace(/const lineFallback = parseDicomManifestLine\(line, index \+ 2, input\.sourceKind, input\.sourceName\);/g, 'const lineFallback = await parseDicomManifestLine(orgId, line, index + 2, input.sourceKind, input.sourceName);');

  // 6. parseImagingManifest mapping
  code = code.replace(/export async function parseImagingManifest\(input: \{ sourceName: string; sourceKind: ImagingSourceKind; rawText: string \}\) \{/, 'export async function parseImagingManifest(orgId: string, input: { sourceName: string; sourceKind: ImagingSourceKind; rawText: string }) {');
  let start1 = code.indexOf('export async function parseImagingManifest(orgId: string, input');
  let end1 = code.indexOf('export async function parseDicomImagingManifest');
  let chunk1 = code.substring(start1, end1);
  chunk1 = chunk1.replace(/const rows: ImagingImportPreviewRow\[\] = \(hasHeader \? lines\.slice\(1\) : lines\)\.map\(\(line, index\) => \{/g, 'const rows: ImagingImportPreviewRow[] = await Promise.all((hasHeader ? lines.slice(1) : lines).map(async (line, index) => {'));
  chunk1 = chunk1.replace(/status: blocked \? "blocked" : patient \? "ready" : "warning",\n\s*warnings\n\s*\}\;\n\s*\}\);/g, 'status: blocked ? "blocked" : patient ? "ready" : "warning",\n        warnings\n      };\n    }));');
  code = code.substring(0, start1) + chunk1 + code.substring(end1);

  // 7. parseDicomImagingManifest mapping
  code = code.replace(/export async function parseDicomImagingManifest\(input: \{ sourceName: string; sourceKind: ImagingSourceKind; rawText: string \}\) \{/, 'export async function parseDicomImagingManifest(orgId: string, input: { sourceName: string; sourceKind: ImagingSourceKind; rawText: string }) {');
  let start2 = code.indexOf('export async function parseDicomImagingManifest(orgId: string, input');
  let end2 = code.indexOf('app.get("/api/imaging/import/preview"');
  let chunk2 = code.substring(start2, end2);
  chunk2 = chunk2.replace(/const rows: DicomSeriesPreviewRow\[\] = \(hasHeader \? lines\.slice\(1\) : lines\)\.map\(\(line, index\) => \{/g, 'const rows: DicomSeriesPreviewRow[] = await Promise.all((hasHeader ? lines.slice(1) : lines).map(async (line, index) => {'));
  chunk2 = chunk2.replace(/status: blocked \? "blocked" : patient \? "ready" : "warning",\n\s*warnings\n\s*\}\;\n\s*\}\);/g, 'status: blocked ? "blocked" : patient ? "ready" : "warning",\n        warnings\n      };\n    }));');
  code = code.substring(0, start2) + chunk2 + code.substring(end2);

  // 8. pass orgId to parse calls inside routes
  code = code.replace(/const preview = await parseImagingManifest\(input\);/g, 'const orgId = await getDefaultOrganizationId();\n      if (!orgId) return reply.code(500).send({ error: "No org" });\n      const preview = await parseImagingManifest(orgId, input);');
  code = code.replace(/const preview = await parseDicomImagingManifest\(input\);/g, 'const orgId = await getDefaultOrganizationId();\n      if (!orgId) return reply.code(500).send({ error: "No org" });\n      const preview = await parseDicomImagingManifest(orgId, input);');
  code = code.replace(/const preview = parseImagingManifest\(\{/g, 'const orgId = await getDefaultOrganizationId();\n      if (!orgId) throw new Error("No org");\n      const preview = await parseImagingManifest(orgId, {');

  // 9. commit routes
  code = code.replace(/export async function commitImagingImport\(input: \{ sourceName: string; sourceKind: ImagingSourceKind; rawText: string \}\) \{/, 'export async function commitImagingImport(orgId: string, input: { sourceName: string; sourceKind: ImagingSourceKind; rawText: string }) {');
  code = code.replace(/export async function commitDicomImagingImport\(input: \{ sourceName: string; sourceKind: ImagingSourceKind; rawText: string \}\) \{/, 'export async function commitDicomImagingImport(orgId: string, input: { sourceName: string; sourceKind: ImagingSourceKind; rawText: string }) {');

  // remove internal `const orgId = await getDefaultOrganizationId();` from commit routes
  code = code.replace(/export async function commitImagingImport[^]*?parseImagingManifest\(orgId/g, (match) => match.replace(/const orgId = await getDefaultOrganizationId\(\);\n\s*if \(\!orgId\) throw new Error\("No default organization found"\);\n\s*/g, ''));
  code = code.replace(/export async function commitDicomImagingImport[^]*?parseDicomImagingManifest\(orgId/g, (match) => match.replace(/const orgId = await getDefaultOrganizationId\(\);\n\s*if \(\!orgId\) throw new Error\("No default organization found"\);\n\s*/g, ''));
  
  // replace `const patient = patients.find`
  code = code.replace(/const patient = patients\.find\(\(candidate\) => candidate\.id === input\.patientId\);/g, 'const patient = await getPatientByIdFromDb(orgId, input.patientId);');
  code = code.replace(/const patient = patients\.find\(\(candidate\) => candidate\.id === draft\.patientId\);/g, 'const patient = draft.patientId ? await getPatientByIdFromDb(orgId, draft.patientId) : null;');

  // replace `findVisitById`
  code = code.replace(/const visit = input\.visitId \? findVisitById\(input\.visitId\) : null;/g, 'const visit = input.visitId ? await getVisitByIdInDb(orgId, input.visitId) : null;');
  code = code.replace(/const visit = findVisitById\(input\.visitId\);/g, 'const visit = await getVisitByIdInDb(orgId, input.visitId);');

  // replace `createImagingStudyInDb(study)` map to loop
  // Original is:
  /*
    const createdStudyIds = readyRows.map((row) => {
      const study = createImagingStudyInDb({ ... });
      return study.id;
    });
  */
  // Wait, I had changed it manually but `git restore` reverted it!
  // It was:
  // const createdStudyIds = readyRows.map((row) => {
  //   const study = createImagingStudy({
  //     patientId: row.patientId!,
  //     kind: row.kind!,
  //     title: row.title ?? kindLabels[row.kind!],
  //     toothCode: row.toothCode,
  //     region: row.region,
  //     sourceKind: row.sourceKind,
  //     sourceName: row.sourceName,
  //     storagePath: row.filePath,
  //     capturedAt: row.capturedAt ?? undefined,
  //     aiSummary: `Импортировано из ${row.sourceName}. Требует проверки снимка и привязки к ЭМК.`
  //   });
  //   return study.id;
  // });
  // Let's replace it:
  code = code.replace(/const createdStudyIds = readyRows\.map\(\(row\) => \{([^]*?)return study\.id;\n\s*\}\);/g, 'const createdStudyIds: string[] = [];\n  for (const row of readyRows) {$1createdStudyIds.push(study.id);\n  }');
  // And change `createImagingStudy({` to `await createImagingStudyInDb(orgId, {`
  code = code.replace(/const study = createImagingStudy\(\{/g, 'const study = await createImagingStudyInDb(orgId, {');

  // same for Dicom commit: `const createdStudyIds = readySeries.map((series) => {`
  code = code.replace(/const createdStudyIds = readySeries\.map\(\(series\) => \{([^]*?)return study\.id;\n\s*\}\);/g, 'const createdStudyIds: string[] = [];\n  for (const series of readySeries) {$1createdStudyIds.push(study.id);\n  }');

  // `commitImagingImport(input)` in `/api/imaging/import/commit`
  code = code.replace(/const result = await commitImagingImport\(input\);/g, 'const orgId = await getDefaultOrganizationId();\n      if (!orgId) return reply.code(500).send({ error: "No org" });\n      const result = await commitImagingImport(orgId, input);');
  code = code.replace(/const result = await commitDicomImagingImport\(input\);/g, 'const orgId = await getDefaultOrganizationId();\n      if (!orgId) return reply.code(500).send({ error: "No org" });\n      const result = await commitDicomImagingImport(orgId, input);');

  fs.writeFileSync(path, code);
  console.log("imaging.ts refactored cleanly!");
}

refactorImaging();
