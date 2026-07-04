const fs = require('fs');

function fixAllRemainingErrors() {
  const imagingPath = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts';
  let imaging = fs.readFileSync(imagingPath, 'utf8');
  const lines = imaging.split('\n');

  for (let i = 0; i < lines.length; i++) {
    // 6276, 6284: orgId missing in saveDicomWorkbenchBundle / saveImagingViewerSession routes
    if (lines[i].includes('app.post("/api/imaging/viewer/dicom-bundle", async (request, reply) => {')) {
      lines.splice(i + 1, 0, '    const orgId = await getDefaultOrganizationId();\n    if (!orgId) return reply.code(500).send({ error: "No org" });');
    }
    if (lines[i].includes('app.post("/api/imaging/viewer", async (request, reply) => {')) {
      lines.splice(i + 1, 0, '    const orgId = await getDefaultOrganizationId();\n    if (!orgId) return reply.code(500).send({ error: "No org" });');
    }

    // 6365: parseDicomImagingManifest expected 2 args but got 1
    // Usually this is `return parseDicomImagingManifest(input);`
    if (lines[i].includes('return parseDicomImagingManifest(input);')) {
      lines[i] = '    const orgId = await getDefaultOrganizationId();\n    if (!orgId) throw new Error("No org");\n    return parseDicomImagingManifest(orgId, input);';
    }

    // 6454, 6459, 6470: orgId missing.
    // In `app.put("/api/imaging/studies/:id"`:
    if (lines[i].includes('app.put("/api/imaging/studies/:id", async (request, reply) => {')) {
      // Check if we already have orgId
      lines.splice(i + 1, 0, '    const orgId = await getDefaultOrganizationId();\n    if (!orgId) return reply.code(500).send({ error: "No org" });');
    }
    
    // 6542: await expression error
    // Let's find `export async function commitImagingImport` and look for the map
    if (lines[i].includes('const createdStudyIds = readyRows.map((row) => {')) {
      lines[i] = lines[i].replace('readyRows.map((row) => {', 'await Promise.all(readyRows.map(async (row) => {');
      // Then find the matching `});` and make it `}));`
      for (let j = i + 1; j < i + 20; j++) {
        if (lines[j].includes('return study.id;')) {
          lines[j + 1] = lines[j + 1].replace('});', '}));');
          break;
        }
      }
    }
  }
  
  imaging = lines.join('\n');
  fs.writeFileSync(imagingPath, imaging);

  // smartImports.ts fixes
  const smartPath = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/smartImports.ts';
  let smart = fs.readFileSync(smartPath, 'utf8');
  
  if (!smart.includes('getDefaultOrganizationId')) {
    smart = smart.replace('import { requireClinicalReadAccess } from "../system/auth";', 'import { requireClinicalReadAccess, getDefaultOrganizationId } from "../system/auth";');
  }

  // 4514, 5593, 5733: Expected 2 args but got 1 in smartImports.ts
  smart = smart.replace(/parseImagingManifest\(\{/g, 'parseImagingManifest(orgId, {');
  smart = smart.replace(/parseDicomSeriesManifest\(\{/g, 'parseDicomSeriesManifest(orgId, {');
  smart = smart.replace(/buildSmartImportPreview\(\{/g, 'buildSmartImportPreview(orgId, {');
  smart = smart.replace(/async function buildSmartImportPreview\(input: \{/g, 'async function buildSmartImportPreview(orgId: string, input: {');

  // Let's also wrap routes where parseImagingManifest or buildSmartImportPreview are called with orgId
  smart = smart.replace(/app\.post\("\/api\/imports\/smart\/preview", async \(request, reply\) => \{([^]*?)const preview = await buildSmartImportPreview/g, 'app.post("/api/imports/smart/preview", async (request, reply) => {$1const orgId = await getDefaultOrganizationId();\n    if (!orgId) throw new Error("No org");\n    const preview = await buildSmartImportPreview');
  smart = smart.replace(/app\.post\("\/api\/imports\/smart\/commit", async \(request, reply\) => \{([^]*?)const preview = await buildSmartImportPreview/g, 'app.post("/api/imports/smart/commit", async (request, reply) => {$1const orgId = await getDefaultOrganizationId();\n    if (!orgId) throw new Error("No org");\n    const preview = await buildSmartImportPreview');
  
  fs.writeFileSync(smartPath, smart);

  // Test files fixes
  const testsPaths = [
    'C:/Clinic_MVP/dental-crm/apps/api/src/routes/tests/imaging.test.ts',
    'C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.test.ts'
  ];
  for (const tPath of testsPaths) {
    if (fs.existsSync(tPath)) {
      let tStr = fs.readFileSync(tPath, 'utf8');
      tStr = tStr.replace(/parseImagingManifest\(\{/g, 'parseImagingManifest("mock-org", {');
      tStr = tStr.replace(/parseDicomSeriesManifest\(\{/g, 'parseDicomSeriesManifest("mock-org", {');
      tStr = tStr.replace(/parseDicomImagingManifest\(\{/g, 'parseDicomImagingManifest("mock-org", {');
      fs.writeFileSync(tPath, tStr);
    }
  }

  console.log("Fixed final ALL round of TS errors.");
}

fixAllRemainingErrors();
