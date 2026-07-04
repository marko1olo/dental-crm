const fs = require('fs');

function fixFinalErrors() {
  const imagingPath = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts';
  let imaging = fs.readFileSync(imagingPath, 'utf8');

  // Fix 6369: commitImagingImport
  imaging = imaging.replace(/return commitImagingImport\(input\);/g, 'const orgId = await getDefaultOrganizationId();\n      if (!orgId) throw new Error("No org");\n      return commitImagingImport(orgId, input);');

  // Fix 6458: missing orgId in app.post("/api/imaging/studies"
  // It's the only route with `app.post("/api/imaging/studies", async (request, reply) => {`
  imaging = imaging.replace(/app\.post\("\/api\/imaging\/studies", async \(request, reply\) => \{([^]*?)const patient = await getPatientByIdFromDb\(orgId, input\.patientId\);/g, 'app.post("/api/imaging/studies", async (request, reply) => {$1const orgId = await getDefaultOrganizationId();\n      if (!orgId) return reply.code(500).send({ error: "No org" });\n      const patient = await getPatientByIdFromDb(orgId, input.patientId);');
  
  // Wait, wait, in imaging.ts it's currently `const patient = await getPatientByIdFromDb(orgId, input.patientId);` inside `app.post("/api/imaging/studies"`, wait, actually it was `getPatientByIdFromDb(input.patientId);` in the original but then I replaced `getPatientByIdFromDb(draft.patientId)` which didn't match. Wait, the typecheck says: `error TS2304: Cannot find name 'orgId'.` which means `orgId` is used but not defined!
  // So `const patient = await getPatientByIdFromDb(orgId, input.patientId);` is already there, it just needs `orgId` defined at the top of the route.
  const routeStart = 'app.post("/api/imaging/studies", async (request, reply) => {';
  const orgIdDef = '    const orgId = await getDefaultOrganizationId();\n    if (!orgId) return reply.code(500).send({ error: "No org" });';
  if (imaging.includes(routeStart)) {
    // Check if it already has getDefaultOrganizationId
    let parts = imaging.split(routeStart);
    for (let i = 1; i < parts.length; i++) {
      if (!parts[i].slice(0, 150).includes('getDefaultOrganizationId')) {
        parts[i] = '\n' + orgIdDef + parts[i];
      }
    }
    imaging = parts.join(routeStart);
  }

  fs.writeFileSync(imagingPath, imaging);

  // smartImports.ts
  const smartPath = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/smartImports.ts';
  let smart = fs.readFileSync(smartPath, 'utf8');

  // Fix getDefaultOrganizationId import
  smart = smart.replace(/, getDefaultOrganizationId } from "\.\.\/accessGuard\.js";/g, ' } from "../accessGuard.js";\nimport { getDefaultOrganizationId } from "../system/auth.js";');

  // Fix buildMigrationAutopilot expected 2 args
  smart = smart.replace(/async function buildMigrationAutopilot\(input: MigrationAutopilotRequest\)/g, 'async function buildMigrationAutopilot(orgId: string, input: MigrationAutopilotRequest)');
  
  smart = smart.replace(/const smartImportPreview = input\.smartImport \? await buildSmartImportPreview\(input\.smartImport\) : null;/g, 'const smartImportPreview = input.smartImport ? await buildSmartImportPreview("mock-org", input.smartImport) : null;');
  // Wait, I should pass orgId to buildSmartImportPreview
  smart = smart.replace(/const smartImportPreview = input\.smartImport \? await buildSmartImportPreview\("mock-org", input\.smartImport\) : null;/g, 'const smartImportPreview = input.smartImport ? await buildSmartImportPreview(orgId, input.smartImport) : null;');
  
  // Any call to buildMigrationAutopilot({
  smart = smart.replace(/const result = await buildMigrationAutopilot\(/g, 'var orgId = await getDefaultOrganizationId();\n    if (!orgId) throw new Error("No org");\n    const result = await buildMigrationAutopilot(orgId, ');

  // Look for buildSmartImportPreview(orgId, input.smartImport) in buildMigrationAutopilot, ensure it matches.
  if (smart.includes('const smartImportPreview = input.smartImport ? await buildSmartImportPreview(input.smartImport) : null;')) {
    smart = smart.replace('const smartImportPreview = input.smartImport ? await buildSmartImportPreview(input.smartImport) : null;', 'const smartImportPreview = input.smartImport ? await buildSmartImportPreview(orgId, input.smartImport) : null;');
  }

  fs.writeFileSync(smartPath, smart);

  console.log("Fixed final round again.");
}

fixFinalErrors();
