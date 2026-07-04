const fs = require('fs');
let path = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts';
let code = fs.readFileSync(path, 'utf8');

// parseManifestLine
code = code.replace(/function parseManifestLine\(line: string, rowNumber: number, sourceKind: ImagingSourceKind, sourceName: string\): ImagingImportPreviewRow \{/, 'async function parseManifestLine(orgId: string, line: string, rowNumber: number, sourceKind: ImagingSourceKind, sourceName: string): Promise<ImagingImportPreviewRow> {');

// parseDicomManifestLine
code = code.replace(/function parseDicomManifestLine\(line: string, rowNumber: number, sourceKind: ImagingSourceKind, sourceName: string\): \n?DicomSeriesPreviewRow \{/, 'async function parseDicomManifestLine(orgId: string, line: string, rowNumber: number, sourceKind: ImagingSourceKind, sourceName: string): Promise<DicomSeriesPreviewRow> {');

// parseDicomManifestLine base call
code = code.replace(/const base = parseManifestLine\(line, rowNumber, sourceKind, sourceName\);/, 'const base = await parseManifestLine(orgId, line, rowNumber, sourceKind, sourceName);');

// `const rows: ImagingImportPreviewRow[] = ` in parseImagingManifest
code = code.replace(/const rows: ImagingImportPreviewRow\[\] = \(hasHeader \? lines\.slice\(1\) : lines\)\.map\(\(line, index\) => \{/g, 'const rows: ImagingImportPreviewRow[] = await Promise.all((hasHeader ? lines.slice(1) : lines).map(async (line, index) => {'));

// The matching closing `});` for `const rows: ImagingImportPreviewRow[]`
// Actually, it's easier to just fix the whole parseImagingManifest
let start1 = code.indexOf('export async function parseImagingManifest(orgId: string, input');
let end1 = code.indexOf('export async function parseDicomImagingManifest(orgId: string, input');
let chunk1 = code.substring(start1, end1);
chunk1 = chunk1.replace(/return \{\n\s*rowNumber: index \+ 2,([^]*?)\n\s*\};\n\s*\}\);/g, 'return {\n        rowNumber: index + 2,$1\n      };\n    }));');
code = code.substring(0, start1) + chunk1 + code.substring(end1);

// `const rows: DicomSeriesPreviewRow[] = ` in parseDicomImagingManifest
code = code.replace(/const rows: DicomSeriesPreviewRow\[\] = \(hasHeader \? lines\.slice\(1\) : lines\)\.map\(\(line, index\) => \{/g, 'const rows: DicomSeriesPreviewRow[] = await Promise.all((hasHeader ? lines.slice(1) : lines).map(async (line, index) => {'));

// The matching closing `});` for `const rows: DicomSeriesPreviewRow[]`
let start2 = code.indexOf('export async function parseDicomImagingManifest(orgId: string, input');
let end2 = code.indexOf('app.get("/api/imaging/import/preview"');
let chunk2 = code.substring(start2, end2);
chunk2 = chunk2.replace(/return \{\n\s*rowNumber: index \+ 2,([^]*?)\n\s*\};\n\s*\}\);/g, 'return {\n        rowNumber: index + 2,$1\n      };\n    }));');
code = code.substring(0, start2) + chunk2 + code.substring(end2);

// Fix patient!.id to patient!.id in commit routes
// No, the error in commitImagingImport was "patient" is possibly undefined or "patients.find"
// Let's check `commitImagingImport`
code = code.replace(/const patient = patients\.find\(\(candidate\) => candidate\.id === input\.patientId\);/g, 'const patient = await getPatientByIdFromDb(orgId, input.patientId);');
code = code.replace(/const patient = patients\.find\(\(candidate\) => candidate\.id === draft\.patientId\);/g, 'const patient = draft.patientId ? await getPatientByIdFromDb(orgId, draft.patientId) : null;');
code = code.replace(/const visit = input\.visitId \? findVisitById\(input\.visitId\) : null;/g, 'const visit = input.visitId ? await getVisitByIdInDb(orgId, input.visitId) : null;');


fs.writeFileSync(path, code);
console.log("imaging.ts refactored 5 successfully.");
