const fs = require('fs');
let path = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts';
let code = fs.readFileSync(path, 'utf8');

// 1. parseManifestLine to async
code = code.replace(/function parseManifestLine\(line: string, rowNumber: number, sourceKind: ImagingSourceKind, sourceName: string\): ImagingImportPreviewRow \{/g, 'async function parseManifestLine(orgId: string, line: string, rowNumber: number, sourceKind: ImagingSourceKind, sourceName: string): Promise<ImagingImportPreviewRow> {');

// 2. parseDicomManifestLine to async
code = code.replace(/function parseDicomManifestLine\(line: string, rowNumber: number, sourceKind: ImagingSourceKind, sourceName: string\): \n?DicomSeriesPreviewRow \{/g, 'async function parseDicomManifestLine(orgId: string, line: string, rowNumber: number, sourceKind: ImagingSourceKind, sourceName: string): Promise<DicomSeriesPreviewRow> {');

// 3. parseDicomImagingManifest orgId error
code = code.replace(/export async function parseDicomImagingManifest\(input: \{ sourceName: string; sourceKind: ImagingSourceKind; rawText: string \}\) \{/g, 'export async function parseDicomImagingManifest(input: { orgId: string; sourceName: string; sourceKind: ImagingSourceKind; rawText: string }) {');
code = code.replace(/const preview = await parseDicomImagingManifest\(orgId, input\);/g, 'const preview = await parseDicomImagingManifest({ ...input, orgId });');
code = code.replace(/const preview = await parseImagingManifest\(orgId, input\);/g, 'const preview = await parseImagingManifest({ ...input, orgId });');

// 4. `parseImagingManifest` and `parseDicomImagingManifest` uses of orgId
code = code.replace(/const patient = await matchPatient\(orgId,/g, 'const patient = await matchPatient(input.orgId,');
code = code.replace(/parseManifestLine\(orgId,/g, 'parseManifestLine(input.orgId,');
code = code.replace(/parseDicomManifestLine\(orgId,/g, 'parseDicomManifestLine(input.orgId,');

// 5. In /api/imaging/dicom-workbench endpoints
code = code.replace(/const bundle = await saveDicomWorkbenchBundle\(orgId, input\);/, 'const orgId = await getDefaultOrganizationId();\n      if (!orgId) return reply.code(500).send({ error: "No org" });\n      const bundle = await saveDicomWorkbenchBundle(orgId, input);');
code = code.replace(/const bundles = await listDicomWorkbenchBundles\(orgId, Number\.isFinite\(requestedLimit\) \? requestedLimit : 8\);/, 'const orgId = await getDefaultOrganizationId();\n      if (!orgId) return reply.code(500).send({ error: "No org" });\n      const bundles = await listDicomWorkbenchBundles(orgId, Number.isFinite(requestedLimit) ? requestedLimit : 8);');

// 6. fix patient finding in commitImagingImport
// It uses `patients` array and `findVisitById`.
code = code.replace(/const patient = patients\.find\(\(candidate\) => candidate\.id === input\.patientId\);/g, 'const patient = await getPatientByIdFromDb(orgId, input.patientId);');
code = code.replace(/const patient = patients\.find\(\(candidate\) => candidate\.id === draft\.patientId\);/g, 'const patient = draft.patientId ? await getPatientByIdFromDb(orgId, draft.patientId) : null;');
code = code.replace(/const visit = input\.visitId \? findVisitById\(input\.visitId\) : null;/g, 'const visit = input.visitId ? await getVisitByIdInDb(orgId, input.visitId) : null;');

// 7. fix parseImagingManifest calls elsewhere
code = code.replace(/const preview = parseImagingManifest\(\{/g, 'const orgId = await getDefaultOrganizationId();\n      if (!orgId) throw new Error("No org");\n      const preview = await parseImagingManifest({ orgId,');
code = code.replace(/const preview = await parseImagingManifest\(\{/g, 'const orgId = await getDefaultOrganizationId();\n      if (!orgId) throw new Error("No org");\n      const preview = await parseImagingManifest({ orgId,');

// Since we replaced it in `parseImagingManifest` itself, we need to pass `orgId` whenever we call it.
code = code.replace(/const preview = await parseImagingManifest\(input\);/g, 'const preview = await parseImagingManifest({ ...input, orgId });');
code = code.replace(/const preview = await parseDicomImagingManifest\(input\);/g, 'const preview = await parseDicomImagingManifest({ ...input, orgId });');

// 8. fix smartImports.ts and tests later, or export a dummy one for tests

fs.writeFileSync(path, code);
console.log("imaging.ts fixed further");
