const fs = require('fs');
let path = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts';
let code = fs.readFileSync(path, 'utf8');

// Fix `input.orgId` back to `orgId` inside functions where `input` doesn't exist
// Wait, parseManifestLine accepts `orgId: string`. Let's just fix it globally.
// In `parseManifestLine`:
code = code.replace(/await matchPatient\(input\.orgId,/g, 'await matchPatient(orgId,');

// Wait, I should only do it for `parseManifestLine` and `parseDicomManifestLine`.
// Let's replace `matchPatient(input.orgId,` with `matchPatient(orgId,` everywhere except where we know `input` exists.
// Actually, I can just use `orgId` because `orgId` is in scope for `parseImagingManifest`, `parseManifestLine`, etc.
// Wait, `parseImagingManifest` accepts `input: { orgId: string, ... }`. So inside it, it's `input.orgId`.
// But wait, my script `fixImagingRoutes8.cjs` did: `code = code.replace(/await matchPatient\(input\.orgId,/g, 'await matchPatient(orgId,');`
// Ah, so now it is `matchPatient(orgId,)` and we get `Cannot find name 'orgId'`!
// Wait! `parseImagingManifest` has `input: { orgId: string, ... }`, so `orgId` doesn't exist there, it's `input.orgId`.
// But inside `parseManifestLine`, it accepts `(orgId: string, ...)` so `orgId` exists there, and `input` doesn't!

code = code.replace(/export async function parseImagingManifest\(input: \{ orgId: string; sourceName: string; sourceKind: ImagingSourceKind; rawText: string \}\) \{/g, 'export async function parseImagingManifest(orgId: string, input: { sourceName: string; sourceKind: ImagingSourceKind; rawText: string }) {');

code = code.replace(/export async function parseDicomImagingManifest\(input: \{ orgId: string; sourceName: string; sourceKind: ImagingSourceKind; rawText: string \}\) \{/g, 'export async function parseDicomImagingManifest(orgId: string, input: { sourceName: string; sourceKind: ImagingSourceKind; rawText: string }) {');

// Fix the call sites to pass `orgId` instead of `{ ...input, orgId }`
code = code.replace(/parseImagingManifest\(\{ \.\.\.input, orgId \}\)/g, 'parseImagingManifest(orgId, input)');
code = code.replace(/parseDicomImagingManifest\(\{ \.\.\.input, orgId \}\)/g, 'parseDicomImagingManifest(orgId, input)');
code = code.replace(/parseImagingManifest\(\{ orgId, sourceName: input\.sourceName, sourceKind: "folder_watch", rawText/g, 'parseImagingManifest(orgId, { sourceName: input.sourceName, sourceKind: "folder_watch", rawText }');

// Restore `await matchPatient(orgId,` inside parseImagingManifest/parseDicomImagingManifest since `orgId` is now the first parameter!
// Inside those functions, `orgId` is the first parameter.
// This perfectly fixes everything.

// Fix `createImagingStudyInDb(input.orgId,` to `createImagingStudyInDb(orgId,`
code = code.replace(/createImagingStudyInDb\(input\.orgId,/g, 'createImagingStudyInDb(orgId,');

// Now, test files and smartImports.ts: I need to add `const orgId = await getDefaultOrganizationId();` and pass it.
fs.writeFileSync(path, code);

// Fix smartImports.ts
let smartPath = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/smartImports.ts';
if (fs.existsSync(smartPath)) {
  let smartCode = fs.readFileSync(smartPath, 'utf8');
  smartCode = smartCode.replace(/const preview = await parseImagingManifest\(\{\n\s*sourceName: sourceName \?\? `folder_watch\_\$\{folderPath\}`,\n\s*sourceKind: "folder_watch",\n\s*rawText/g, 'const orgId = await getDefaultOrganizationId();\n      const preview = await parseImagingManifest(orgId, {\n        sourceName: sourceName ?? `folder_watch_${folderPath}`,\n        sourceKind: "folder_watch",\n        rawText');
  fs.writeFileSync(smartPath, smartCode);
}

// Tests
let testPath = 'C:/Clinic_MVP/dental-crm/apps/api/src/tests/imaging/parseImagingManifest.test.ts';
if (fs.existsSync(testPath)) {
  let testCode = fs.readFileSync(testPath, 'utf8');
  testCode = testCode.replace(/await parseImagingManifest\(\{/g, 'await parseImagingManifest("test-org-id", {');
  fs.writeFileSync(testPath, testCode);
}

let testPath2 = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/tests/imaging.test.ts';
if (fs.existsSync(testPath2)) {
  let testCode2 = fs.readFileSync(testPath2, 'utf8');
  testCode2 = testCode2.replace(/await commitImagingImport\(\{/g, 'await commitImagingImport("test-org-id", {');
  fs.writeFileSync(testPath2, testCode2);
}

console.log("imaging.ts refactored 10 successfully.");
