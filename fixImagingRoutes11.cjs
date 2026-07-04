const fs = require('fs');
let path = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts';
let code = fs.readFileSync(path, 'utf8');

// Fix `const orgId = ...` redeclaration mess inside `app.post("/api/imaging/dicom/series-preview", ...)`
// Lines 6385-6404
code = code.replace(/const orgId = await getDefaultOrganizationId\(\);\n\s*if \(\!orgId\) throw new Error\("No org"\);\n\s*const orgId = await getDefaultOrganizationId\(\);\n\s*if \(\!orgId\) throw new Error\("No org"\);\n\s*const orgId = await getDefaultOrganizationId\(\);\n\s*if \(\!orgId\) throw new Error\("No org"\);\n\s*const preview = await parseImagingManifest\(orgId, \{ sourceName: input\.sourceName, sourceKind: "folder_watch", rawText \}\n\s*\}\);/g, 'const orgId = await getDefaultOrganizationId();\n      if (!orgId) throw new Error("No org");\n      const preview = await parseImagingManifest(orgId, { sourceName: input.sourceName, sourceKind: "folder_watch", rawText });');

// Actually wait, let's just do a string replacement of that exact block.
let searchBlock = `      const orgId = await getDefaultOrganizationId();
      if (!orgId) throw new Error("No org");
      const orgId = await getDefaultOrganizationId();
      if (!orgId) throw new Error("No org");
      const orgId = await getDefaultOrganizationId();
      if (!orgId) throw new Error("No org");
      const preview = await parseImagingManifest(orgId, { sourceName: input.sourceName, sourceKind: "folder_watch", rawText }
      });`;

let replaceBlock = `      const orgId = await getDefaultOrganizationId();
      if (!orgId) throw new Error("No org");
      const preview = await parseImagingManifest(orgId, { sourceName: input.sourceName, sourceKind: "folder_watch", rawText });`;

code = code.replace(searchBlock, replaceBlock);

// Remove the extra closing parenthesis `});` at line 6404 if it exists, wait, let's look at what was there.
// `app.post("/api/imaging/dicom/series-preview", async (request, reply) => {`
// Inside it has `return imagingFolderScanResponseSchema.parse({ ... }); });` -> the `});` ends the route handler.
// But wait, there was an extra `});` at line 6404 before `app.get("/api/imaging/studies", async (request, reply) => {`.
// Let's replace `    });\n  });\n\n  app.get("/api/imaging/studies", ` with `    });\n\n  app.get("/api/imaging/studies", `
code = code.replace(/    \}\);\n  \}\);\n\n  app\.get\("\/api\/imaging\/studies", /g, '    });\n\n  app.get("/api/imaging/studies", ');

// Fix commitImagingImport
let commitImagingImportSearch = `export async function commitImagingImport(input: { orgId: string; sourceName: string; sourceKind: ImagingSourceKind; rawText: string }) {
  
  const orgId = await getDefaultOrganizationId();
      if (!orgId) throw new Error("No org");
      const preview = await parseImagingManifest(orgId, input);`;

let commitImagingImportReplace = `export async function commitImagingImport(input: { orgId: string; sourceName: string; sourceKind: ImagingSourceKind; rawText: string }) {
  const preview = await parseImagingManifest(input.orgId, input);`;

code = code.replace(commitImagingImportSearch, commitImagingImportReplace);

// Fix commitDicomImagingImport
let commitDicomImagingImportSearch = `export async function commitDicomImagingImport(input: { orgId: string; sourceName: string; sourceKind: ImagingSourceKind; rawText: string }) {
  const orgId = await getDefaultOrganizationId();
      if (!orgId) throw new Error("No org");
      const preview = await parseImagingManifest(orgId, input);`;

let commitDicomImagingImportReplace = `export async function commitDicomImagingImport(input: { orgId: string; sourceName: string; sourceKind: ImagingSourceKind; rawText: string }) {
  const preview = await parseDicomImagingManifest(input.orgId, input);`;

code = code.replace(commitDicomImagingImportSearch, commitDicomImagingImportReplace);

// Wait, I see `const orgId = await getDefaultOrganizationId();` at 6550. Let's fix that globally inside the commit methods:
code = code.replace(/export async function commitImagingImport\(input: \{ orgId: string; sourceName: string; sourceKind: ImagingSourceKind; rawText: string \}\) \{[^]*?const preview = await parseImagingManifest\(orgId, input\);/g, 'export async function commitImagingImport(input: { orgId: string; sourceName: string; sourceKind: ImagingSourceKind; rawText: string }) {\n  const preview = await parseImagingManifest(input.orgId, input);');

code = code.replace(/export async function commitDicomImagingImport\(input: \{ orgId: string; sourceName: string; sourceKind: ImagingSourceKind; rawText: string \}\) \{[^]*?const preview = await parseDicomImagingManifest\(orgId, input\);/g, 'export async function commitDicomImagingImport(input: { orgId: string; sourceName: string; sourceKind: ImagingSourceKind; rawText: string }) {\n  const preview = await parseDicomImagingManifest(input.orgId, input);');

fs.writeFileSync(path, code);
console.log("imaging.ts refactored 11 successfully.");
