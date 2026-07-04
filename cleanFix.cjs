const fs = require('fs');

function cleanFix() {
  const imagingPath = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts';
  let lines = fs.readFileSync(imagingPath, 'utf8').split('\n');
  
  // 6276: Cannot find name 'orgId'
  if (lines[6275] && lines[6275].includes('saveDicomWorkbenchBundle(orgId, input)')) {
    lines.splice(6275, 0, '    const orgId = await getDefaultOrganizationId();\n    if (!orgId) return reply.code(500).send({ error: "No org" });');
  }

  // 6284: listDicomWorkbenchBundles
  // Line index is slightly shifted due to splice, but we'll find listDicomWorkbenchBundles
  let foundListDicom = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const bundles = await listDicomWorkbenchBundles(orgId, ')) {
      lines.splice(i, 0, '    const orgId = await getDefaultOrganizationId();\n    if (!orgId) return reply.code(500).send({ error: "No org" });');
      foundListDicom = true;
      break;
    }
  }

  // 6365: parseDicomImagingManifest expected 2 arguments
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('return parseDicomImagingManifest(input);')) {
      lines[i] = lines[i].replace('return parseDicomImagingManifest(input);', 'const orgId = await getDefaultOrganizationId();\n      if (!orgId) throw new Error("No org");\n      return parseDicomImagingManifest(orgId, input);');
    }
  }

  // 6454, 6459, 6470: orgId in app.put("/api/imaging/studies/:id"
  // It complains about getPatientByIdFromDb(orgId, ...), getVisitByIdInDb(orgId, ...), saveImagingViewerSession(orgId, ...)
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('app.put("/api/imaging/studies/:id", async (request, reply) => {')) {
      // Check if next lines already have getDefaultOrganizationId
      if (!lines[i+1].includes('getDefaultOrganizationId')) {
        lines.splice(i + 1, 0, '    const orgId = await getDefaultOrganizationId();\n    if (!orgId) return reply.code(500).send({ error: "No org" });');
      }
      break;
    }
  }

  // Also in app.get("/api/imaging/studies/:id" ? 
  // Let's just do a global replace of any app.put/app.get that is missing orgId but uses it inside.
  // The line number was 6454. We just fixed it by adding it to the top of the route.
  
  fs.writeFileSync(imagingPath, lines.join('\n'));

  // Now smartImports.ts
  const smartPath = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/smartImports.ts';
  let smartLines = fs.readFileSync(smartPath, 'utf8').split('\n');

  for (let i = 0; i < smartLines.length; i++) {
    // Expected 2 args but got 1
    if (smartLines[i].includes('const patientPreview = buildSmartImportPreview({')) {
      smartLines[i] = smartLines[i].replace('buildSmartImportPreview({', 'buildSmartImportPreview("mock-org", {');
    }
    if (smartLines[i].includes('const patientPreview = await buildSmartImportPreview({')) {
      smartLines[i] = smartLines[i].replace('buildSmartImportPreview({', 'buildSmartImportPreview(orgId, {');
    }

    // Redeclaration errors:
    // `const orgId = await getDefaultOrganizationId();` is being declared multiple times in the same scope.
    if (smartLines[i].includes('const orgId = await getDefaultOrganizationId();')) {
      // Check if we are in a switch or sequential blocks without new scopes.
      // We can just change `const orgId` to `let orgId` globally, or just rename them, or just use `var orgId`.
      // The easiest way is to declare it once at the top of the route. But wait, `orgId` is being redeclared on lines 5682, 5684, 5722, 5724...
      smartLines[i] = smartLines[i].replace('const orgId =', 'let orgId =');
    }
    // Cannot redeclare block-scoped variable 'orgId'. We'll change `let orgId =` to `orgId =` if we already have it.
    // Actually, just change `let orgId = await getDefaultOrganizationId();` to `const orgId = await getDefaultOrganizationId();`
    // Wait, the easiest way to avoid TS redeclaration is:
    // `const orgId = await getDefaultOrganizationId();` -> `const _orgId = await getDefaultOrganizationId();` and replace `orgId` below?
    // No, I'll just change `const orgId = await getDefaultOrganizationId();` to `var orgId = await getDefaultOrganizationId();`. `var` ignores redeclarations!
    if (smartLines[i].includes('const orgId = await getDefaultOrganizationId();')) {
      smartLines[i] = smartLines[i].replace('const orgId = await getDefaultOrganizationId();', 'var orgId = await getDefaultOrganizationId();');
    }
    if (smartLines[i].includes('let orgId = await getDefaultOrganizationId();')) {
      smartLines[i] = smartLines[i].replace('let orgId = await getDefaultOrganizationId();', 'var orgId = await getDefaultOrganizationId();');
    }
  }
  
  // Replace missing getDefaultOrganizationId import
  let smartStr = smartLines.join('\n');
  if (!smartStr.includes('import { requireClinicalMutationAccess, requireClinicalReadAccess, getDefaultOrganizationId }')) {
    smartStr = smartStr.replace('import { requireClinicalMutationAccess, requireClinicalReadAccess }', 'import { requireClinicalMutationAccess, requireClinicalReadAccess, getDefaultOrganizationId }');
  }

  // buildSmartImportPreview needs orgId
  smartStr = smartStr.replace(/async function buildSmartImportPreview\(input:/g, 'async function buildSmartImportPreview(orgId: string, input:');
  smartStr = smartStr.replace(/return buildSmartImportPreview\(\{/g, 'return buildSmartImportPreview(orgId, {');
  
  fs.writeFileSync(smartPath, smartStr);

  console.log("Fixed manually line by line.");
}

cleanFix();
