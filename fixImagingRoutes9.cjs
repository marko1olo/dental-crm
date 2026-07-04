const fs = require('fs');
let path = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts';
let code = fs.readFileSync(path, 'utf8');

// Fix `orgId` inside `parseImagingManifest` and `parseDicomImagingManifest`
code = code.replace(/await parseManifestLine\(orgId,/g, 'await parseManifestLine(input.orgId,');
code = code.replace(/await matchPatient\(orgId,/g, 'await matchPatient(input.orgId,');
code = code.replace(/await parseDicomManifestLine\(orgId,/g, 'await parseDicomManifestLine(input.orgId,');

// 6176
code = code.replace(/return parseImagingManifest\(input\);/g, 'const orgId = await getDefaultOrganizationId();\n      if (!orgId) return reply.code(500).send({ error: "No org" });\n      return parseImagingManifest({ ...input, orgId });');

// 6383 and 6389
code = code.replace(/const preview = await parseImagingManifest\(\{ orgId, orgId, orgId,\s*sourceName: input\.sourceName,\s*sourceKind: "folder_watch",\s*rawText/g, 'const preview = await parseImagingManifest({ orgId, sourceName: input.sourceName, sourceKind: "folder_watch", rawText');

// 6469
code = code.replace(/const visit = findVisitById\(input\.visitId\);/g, 'const visit = await getVisitByIdInDb(orgId, input.visitId);');

// 6554
code = code.replace(/const preview = await parseImagingManifest\(\{ orgId, \.\.\.input, orgId \}\);/g, 'const preview = await parseImagingManifest({ ...input, orgId });');

// Fix redeclared orgIds by removing `const orgId = await getDefaultOrganizationId();` if it's already declared
// In commitImagingImport and commitDicomImagingImport, we have:
//   const orgId = await getDefaultOrganizationId();
//   if (!orgId) throw new Error("No default organization found");
// Let's just remove them from inside the function and pass orgId. Wait, commit routes don't accept orgId.
// Ah! I replaced `commitImagingImport(input)` to `commitImagingImport(orgId, input)` but the signature didn't change because of a bad regex.
// Let's change the signatures to `export async function commitImagingImport(input: { orgId: string; ... })`
code = code.replace(/export async function commitImagingImport\(input: \{ sourceName: string; sourceKind: ImagingSourceKind; rawText: string \}\) \{/g, 'export async function commitImagingImport(input: { orgId: string; sourceName: string; sourceKind: ImagingSourceKind; rawText: string }) {');
code = code.replace(/export async function commitDicomImagingImport\(input: \{ sourceName: string; sourceKind: ImagingSourceKind; rawText: string \}\) \{/g, 'export async function commitDicomImagingImport(input: { orgId: string; sourceName: string; sourceKind: ImagingSourceKind; rawText: string }) {');

// remove the inner `const orgId = ...`
code = code.replace(/const orgId = await getDefaultOrganizationId\(\);\s*if \(\!orgId\) throw new Error\("No default organization found"\);/g, '');
code = code.replace(/const orgId = await getDefaultOrganizationId\(\);\s*if \(\!orgId\) return reply\.code\(500\)\.send\(\{ error: "No org" \}\);\s*const orgId = await getDefaultOrganizationId\(\);\s*if \(\!orgId\) return reply\.code\(500\)\.send\(\{ error: "No org" \}\);/g, 'const orgId = await getDefaultOrganizationId();\n      if (!orgId) return reply.code(500).send({ error: "No org" });');

// Fix calls to createImagingStudyInDb inside commit: uses `input.orgId`
code = code.replace(/const study = await createImagingStudyInDb\(orgId,/g, 'const study = await createImagingStudyInDb(input.orgId,');

fs.writeFileSync(path, code);
console.log("imaging.ts refactored 9 successfully.");
