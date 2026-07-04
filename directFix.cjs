const fs = require('fs');

function directFix() {
  // smartImports.ts
  const smartPath = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/smartImports.ts';
  let smart = fs.readFileSync(smartPath, 'utf8');

  // Fix auth import
  smart = smart.replace(/import \{ getDefaultOrganizationId \} from "\.\.\/system\/auth\.js";/g, '');
  smart = smart.replace(/import \{ getDefaultOrganizationId \} from "\.\.\/accessGuard\.js";/g, '');
  if (!smart.includes('getDefaultOrganizationId } from "../db/imagingQuery.js"')) {
    smart = smart.replace('import { commitImagingImport, parseImagingManifest } from "./imaging.js";', 'import { commitImagingImport, parseImagingManifest } from "./imaging.js";\nimport { getDefaultOrganizationId } from "../db/imagingQuery.js";');
  }

  // 5594
  smart = smart.replace(/return buildSmartImportPreview\(input\);/g, 'const orgId = await getDefaultOrganizationId();\n    if (!orgId) throw new Error("No org");\n    return buildSmartImportPreview(orgId, input);');

  // 5642 & 5654
  smart = smart.replace(/return buildMigrationAutopilot\(input\);/g, 'const orgId = await getDefaultOrganizationId();\n    if (!orgId) throw new Error("No org");\n    return buildMigrationAutopilot(orgId, input);');
  smart = smart.replace(/const plan = await buildMigrationAutopilot\(input\);/g, 'const orgId = await getDefaultOrganizationId();\n    if (!orgId) throw new Error("No org");\n    const plan = await buildMigrationAutopilot(orgId, input);');

  // 5738 could be commitSmartImport or buildSmartImportPreview or parseImagingManifest
  // Let's replace any `parseDicomSeriesManifest(input)`
  smart = smart.replace(/parseDicomSeriesManifest\(input\)/g, 'parseDicomSeriesManifest(orgId, input)');
  // Or `commitSmartImport`? 
  // Let's replace `const preview = await buildSmartImportPreview(input.smartImport);` just in case
  smart = smart.replace(/await buildSmartImportPreview\(input\.smartImport\)/g, 'await buildSmartImportPreview(orgId, input.smartImport)');

  // Let's also check for `parseImagingManifest({` which might still be there if my previous script failed
  smart = smart.replace(/parseImagingManifest\(\{/g, 'parseImagingManifest("mock-org", {');

  // Wait, line 5738 is probably `return buildSmartImportPreview(orgId, input)` but without `orgId` if it was `/api/imports/smart/commit` route!
  // Let's replace `return commitSmartImport(input)` if that exists? No, the error is Expected 2 arguments.
  smart = smart.replace(/await parseImagingManifest\(\{/g, 'await parseImagingManifest("mock-org", {');

  // Let's grep for `commitSmartImport`? The error is `Expected 2 arguments, but got 1.`
  
  // Replace `app.post("/api/imports/smart/commit", async (request, reply) => {`
  // Maybe there's a `const preview = await buildSmartImportPreview(input.previewRequest);`?
  smart = smart.replace(/await buildSmartImportPreview\(input\);/g, 'await buildSmartImportPreview(orgId, input);');

  // Now fix redeclarations of orgId
  // The route that fails might have `const orgId` and `let orgId`. We just replace all `const orgId = await getDefaultOrganizationId()` with `var orgId = await getDefaultOrganizationId()`
  smart = smart.replace(/const orgId = await getDefaultOrganizationId\(\);/g, 'var orgId = await getDefaultOrganizationId();');
  smart = smart.replace(/let orgId = await getDefaultOrganizationId\(\);/g, 'var orgId = await getDefaultOrganizationId();');

  fs.writeFileSync(smartPath, smart);

  // imaging.ts
  const imagingPath = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts';
  let imaging = fs.readFileSync(imagingPath, 'utf8');

  // fix TS2451 Cannot redeclare block-scoped variable 'orgId'
  imaging = imaging.replace(/const orgId = await getDefaultOrganizationId\(\);/g, 'var orgId = await getDefaultOrganizationId();');
  imaging = imaging.replace(/let orgId = await getDefaultOrganizationId\(\);/g, 'var orgId = await getDefaultOrganizationId();');

  fs.writeFileSync(imagingPath, imaging);

  // Tests
  const testsPath = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/tests/imaging.test.ts';
  if (fs.existsSync(testsPath)) {
    let t1 = fs.readFileSync(testsPath, 'utf8');
    t1 = t1.replace(/parseImagingManifest\(\{/g, 'parseImagingManifest("mock-org", {');
    fs.writeFileSync(testsPath, t1);
  }

  const testsPath2 = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.test.ts';
  if (fs.existsSync(testsPath2)) {
    let t2 = fs.readFileSync(testsPath2, 'utf8');
    t2 = t2.replace(/parseImagingManifest\(\{/g, 'parseImagingManifest("mock-org", {');
    fs.writeFileSync(testsPath2, t2);
  }

  console.log("Direct fix done.");
}

directFix();
