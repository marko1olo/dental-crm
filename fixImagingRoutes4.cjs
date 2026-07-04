const fs = require('fs');

let path = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts';
let code = fs.readFileSync(path, 'utf8');

// 1. parseImagingManifest to accept orgId
code = code.replace(/export async function parseImagingManifest\(input: \{ sourceName: string; sourceKind: ImagingSourceKind; rawText: string \}\) \{/, 'export async function parseImagingManifest(orgId: string, input: { sourceName: string; sourceKind: ImagingSourceKind; rawText: string }) {');

// 2. `.map((line, index) => {` to `await Promise.all(...map(async (line, index) => {` for parseImagingManifest
code = code.replace(/const rows: ImagingImportPreviewRow\[\] = \(hasHeader \? lines\.slice\(1\) : lines\)\.map\(\(line, index\) => \{/, 'const rows: ImagingImportPreviewRow[] = await Promise.all((hasHeader ? lines.slice(1) : lines).map(async (line, index) => {'));
code = code.replace(/return \{\n        rowNumber: index \+ 2,\n        patientId: patient\?\.id \?\? null,\n        patientName: patient\?\.fullName \?\? draft\.patientName,\n        phone: draft\.phone \?\? null,\n        kind,\n        title: kind \? \`\$\{kindLabels\[kind\]\}\$\{toothCode \? \` \$\{toothCode\}\` : ""\}\` : null,\n        capturedAt: draft\.capturedAt \?\? null,\n        sourceName: draft\.sourceName \?\? sourceName,\n        sourceKind: source,\n        filePath: draft\.filePath,\n        studyInstanceUid: draft\.studyInstanceUid \?\? null,\n        status: blocked \? "blocked" : patient \? "ready" : "warning",\n        warnings\n      \};\n    \}\);/, 'return {\n        rowNumber: index + 2,\n        patientId: patient?.id ?? null,\n        patientName: patient?.fullName ?? draft.patientName,\n        phone: draft.phone ?? null,\n        kind,\n        title: kind ? `${kindLabels[kind]}${toothCode ? ` ${toothCode}` : ""}` : null,\n        capturedAt: draft.capturedAt ?? null,\n        sourceName: draft.sourceName ?? sourceName,\n        sourceKind: source,\n        filePath: draft.filePath,\n        studyInstanceUid: draft.studyInstanceUid ?? null,\n        status: blocked ? "blocked" : patient ? "ready" : "warning",\n        warnings\n      };\n    }));');

// 3. parseManifestLine to accept orgId
code = code.replace(/function parseManifestLine\(line: string, rowNumber: number, sourceKind: ImagingSourceKind, sourceName: string\): ImagingImportPreviewRow \{/g, 'async function parseManifestLine(orgId: string, line: string, rowNumber: number, sourceKind: ImagingSourceKind, sourceName: string): Promise<ImagingImportPreviewRow> {');

// 4. Update calls to parseManifestLine
code = code.replace(/return parseManifestLine\(line, index \+ 1, input\.sourceKind, input\.sourceName\);/g, 'return await parseManifestLine(orgId, line, index + 1, input.sourceKind, input.sourceName);');
code = code.replace(/const base = parseManifestLine\(line, rowNumber, sourceKind, sourceName\);/g, 'const base = await parseManifestLine(orgId, line, rowNumber, sourceKind, sourceName);');

// 5. parseDicomImagingManifest to accept orgId
code = code.replace(/export async function parseDicomImagingManifest\(input: \{ sourceName: string; sourceKind: ImagingSourceKind; rawText: string \}\) \{/, 'export async function parseDicomImagingManifest(orgId: string, input: { sourceName: string; sourceKind: ImagingSourceKind; rawText: string }) {');

// 6. `.map((line, index) => {` to `await Promise.all(...map(async (line, index) => {` for parseDicomImagingManifest
code = code.replace(/const rows: DicomSeriesPreviewRow\[\] = \(hasHeader \? lines\.slice\(1\) : lines\)\.map\(\(line, index\) => \{/, 'const rows: DicomSeriesPreviewRow[] = await Promise.all((hasHeader ? lines.slice(1) : lines).map(async (line, index) => {'));
code = code.replace(/return \{\n        rowNumber: index \+ 2,\n        patientId: patient\?\.id \?\? null,\n        patientName: patient\?\.fullName \?\? draft\.patientName,\n        phone: draft\.phone \?\? null,\n        kind,\n        title: kind \? \`\$\{kindLabels\[kind\]\}\$\{toothCode \? \` \$\{toothCode\}\` : ""\}\` : null,\n        capturedAt: draft\.capturedAt \?\? null,\n        sourceName: draft\.sourceName \?\? sourceName,\n        sourceKind: source,\n        filePath: draft\.filePath,\n        studyInstanceUid: draft\.studyInstanceUid \?\? null,\n        seriesInstanceUid: draft\.seriesInstanceUid \?\? null,\n        sopInstanceUid: draft\.sopInstanceUid \?\? null,\n        modality,\n        instanceNumber: draft\.instanceNumber \?\? null,\n        status: blocked \? "blocked" : patient \? "ready" : "warning",\n        warnings\n      \};\n    \}\);/, 'return {\n        rowNumber: index + 2,\n        patientId: patient?.id ?? null,\n        patientName: patient?.fullName ?? draft.patientName,\n        phone: draft.phone ?? null,\n        kind,\n        title: kind ? `${kindLabels[kind]}${toothCode ? ` ${toothCode}` : ""}` : null,\n        capturedAt: draft.capturedAt ?? null,\n        sourceName: draft.sourceName ?? sourceName,\n        sourceKind: source,\n        filePath: draft.filePath,\n        studyInstanceUid: draft.studyInstanceUid ?? null,\n        seriesInstanceUid: draft.seriesInstanceUid ?? null,\n        sopInstanceUid: draft.sopInstanceUid ?? null,\n        modality,\n        instanceNumber: draft.instanceNumber ?? null,\n        status: blocked ? "blocked" : patient ? "ready" : "warning",\n        warnings\n      };\n    }));');

// 7. parseDicomManifestLine to accept orgId
code = code.replace(/function parseDicomManifestLine\(line: string, rowNumber: number, sourceKind: ImagingSourceKind, sourceName: string\): DicomSeriesPreviewRow \{/g, 'async function parseDicomManifestLine(orgId: string, line: string, rowNumber: number, sourceKind: ImagingSourceKind, sourceName: string): Promise<DicomSeriesPreviewRow> {');

// 8. Update calls to parseDicomManifestLine
code = code.replace(/return parseDicomManifestLine\(line, index \+ 1, input\.sourceKind, input\.sourceName\);/g, 'return await parseDicomManifestLine(orgId, line, index + 1, input.sourceKind, input.sourceName);');

// 9. Update routes to pass orgId to parseImagingManifest and parseDicomImagingManifest
code = code.replace(/const preview = await parseImagingManifest\(input\);/g, 'const orgId = await getDefaultOrganizationId();\n      if (!orgId) return reply.code(500).send({ error: "No org" });\n      const preview = await parseImagingManifest(orgId, input);');
code = code.replace(/const preview = await parseDicomImagingManifest\(input\);/g, 'const orgId = await getDefaultOrganizationId();\n      if (!orgId) return reply.code(500).send({ error: "No org" });\n      const preview = await parseDicomImagingManifest(orgId, input);');

// 10. Fix commit routes
code = code.replace(/export async function commitImagingImport\(input: \{ sourceName: string; sourceKind: ImagingSourceKind; rawText: string \}\) \{/, 'export async function commitImagingImport(orgId: string, input: { sourceName: string; sourceKind: ImagingSourceKind; rawText: string }) {');
code = code.replace(/export async function commitDicomImagingImport\(input: \{ sourceName: string; sourceKind: ImagingSourceKind; rawText: string \}\) \{/, 'export async function commitDicomImagingImport(orgId: string, input: { sourceName: string; sourceKind: ImagingSourceKind; rawText: string }) {');

// In commit endpoints
code = code.replace(/const result = await commitImagingImport\(input\);/, 'const orgId = await getDefaultOrganizationId();\n      if (!orgId) return reply.code(500).send({ error: "No org" });\n      const result = await commitImagingImport(orgId, input);');
code = code.replace(/const result = await commitDicomImagingImport\(input\);/, 'const orgId = await getDefaultOrganizationId();\n      if (!orgId) return reply.code(500).send({ error: "No org" });\n      const result = await commitDicomImagingImport(orgId, input);');

// Inside commitImagingImport and commitDicomImagingImport there is already `const orgId = await getDefaultOrganizationId();`
code = code.replace(/const orgId = await getDefaultOrganizationId\(\);\n\s*if \(\!orgId\) throw new Error\("No default organization found"\);/g, '');

fs.writeFileSync(path, code);
console.log("imaging.ts refactored 4 successfully.");
