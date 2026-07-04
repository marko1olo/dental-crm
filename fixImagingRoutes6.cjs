const fs = require('fs');
let path = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts';
let code = fs.readFileSync(path, 'utf8');

// parseDicomManifestLine to async
code = code.replace(/function parseDicomManifestLine\(line: string, rowNumber: number, sourceKind: ImagingSourceKind, sourceName: string\): DicomSeriesPreviewRow \{/, 'async function parseDicomManifestLine(orgId: string, line: string, rowNumber: number, sourceKind: ImagingSourceKind, sourceName: string): Promise<DicomSeriesPreviewRow> {');

// parseManifestLine call inside parseDicomManifestLine
code = code.replace(/const base = parseManifestLine\(line, rowNumber, sourceKind, sourceName\);/, 'const base = await parseManifestLine(orgId, line, rowNumber, sourceKind, sourceName);');

// `export async function parseDicomImagingManifest(input:` to accept orgId
code = code.replace(/export async function parseDicomImagingManifest\(input: \{ sourceName: string; sourceKind: ImagingSourceKind; rawText: string \}\) \{/, 'export async function parseDicomImagingManifest(orgId: string, input: { sourceName: string; sourceKind: ImagingSourceKind; rawText: string }) {');

// The `.map` to `Promise.all(...map(async ...`
let searchFor = 'const rows: DicomSeriesPreviewRow[] = (hasHeader ? lines.slice(1) : lines).map((line, index) => {';
let replaceWith = 'const rows: DicomSeriesPreviewRow[] = await Promise.all((hasHeader ? lines.slice(1) : lines).map(async (line, index) => {';
code = code.replace(searchFor, replaceWith);

// `parseDicomManifestLine` calls inside `parseDicomImagingManifest`
code = code.replace(/if \(\!hasHeader\) return parseDicomManifestLine\(line, index \+ 1, input\.sourceKind, input\.sourceName\);/, 'if (!hasHeader) return await parseDicomManifestLine(orgId, line, index + 1, input.sourceKind, input.sourceName);');
code = code.replace(/const lineFallback = parseDicomManifestLine\(line, index \+ 2, input\.sourceKind, input\.sourceName\);/, 'const lineFallback = await parseDicomManifestLine(orgId, line, index + 2, input.sourceKind, input.sourceName);');

// Update the end of the map block `});` to `}));`
let startIdx = code.indexOf('export async function parseDicomImagingManifest(orgId: string');
let endIdx = code.indexOf('app.get("/api/imaging/import/preview"');
if (startIdx > -1 && endIdx > -1) {
  let chunk = code.substring(startIdx, endIdx);
  // Find the closing `});` that corresponds to `const rows: DicomSeriesPreviewRow[]`
  // A simple regex might match the wrong one, so let's match the exact return object:
  chunk = chunk.replace(/status: blocked \? "blocked" : patient \? "ready" : "warning",\n\s*warnings\n\s*\}\;\n\s*\}\);/, 'status: blocked ? "blocked" : patient ? "ready" : "warning",\n        warnings\n      };\n    }));');
  code = code.substring(0, startIdx) + chunk + code.substring(endIdx);
}

fs.writeFileSync(path, code);
console.log("imaging.ts refactored 6 successfully.");
