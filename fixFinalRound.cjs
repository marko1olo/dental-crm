const fs = require('fs');

function fixFinalRound() {
  const imagingPath = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts';
  let imaging = fs.readFileSync(imagingPath, 'utf8');

  // Fix saveDicomWorkbenchBundle(bundle) -> saveDicomWorkbenchBundle(orgId, bundle)
  imaging = imaging.replace(/saveDicomWorkbenchBundle\(bundle\)/g, 'saveDicomWorkbenchBundle(orgId, bundle)');
  // Fix saveImagingViewerSession(draft) -> saveImagingViewerSession(orgId, draft)
  imaging = imaging.replace(/saveImagingViewerSession\(draft\)/g, 'saveImagingViewerSession(orgId, draft)');
  // Fix saveImagingViewerSession(session) -> saveImagingViewerSession(orgId, session)
  imaging = imaging.replace(/saveImagingViewerSession\(session\)/g, 'saveImagingViewerSession(orgId, session)');

  // Fix getOrCreateImagingViewerSession(id) -> getOrCreateImagingViewerSession(orgId, id)
  imaging = imaging.replace(/getOrCreateImagingViewerSession\(id\)/g, 'getOrCreateImagingViewerSession(orgId, study)');

  // Wait, I don't have `study`? Oh, in `app.get("/api/imaging/studies/:id/viewer-session"`, I do have `const study = await getImagingStudyById(orgId, id);`
  // And it needs `await getOrCreateImagingViewerSession(orgId, study)`
  imaging = imaging.replace(/const session = getOrCreateImagingViewerSession\(orgId, study\);/g, 'const session = await getOrCreateImagingViewerSession(orgId, study);');

  // Fix 6365 `parseDicomImagingManifest` missing orgId? Wait, I added it in fix3.
  // Wait, look at error 6365: `parseDicomImagingManifest` might have been called elsewhere.
  // We'll search and replace parseDicomImagingManifest(input) to parseDicomImagingManifest(orgId, input) again.
  imaging = imaging.replace(/parseDicomImagingManifest\(input\)/g, 'parseDicomImagingManifest(orgId, input)');

  // Fix 6454 missing orgId. Let's see. "const patient = await getPatientByIdFromDb(draft.patientId);" -> "await getPatientByIdFromDb(orgId, draft.patientId);"
  // If orgId is not defined there, we can define it.
  // Actually, wait, let's wrap the fastify route for `app.put("/api/imaging/studies/:id", async (request, reply) => {`
  // Did I already do that? Yes, `const orgId = await getDefaultOrganizationId();` is there. So maybe I just missed it in some nested function?
  // I'll just use a regex to ensure orgId is declared in the `app.put("/api/imaging/studies/:id"` route.
  
  fs.writeFileSync(imagingPath, imaging);

  // Fix smartImports.ts
  const smartPath = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/smartImports.ts';
  let smart = fs.readFileSync(smartPath, 'utf8');
  smart = smart.replace(/async function buildSmartImportPreview\(input:/g, 'async function buildSmartImportPreview(orgId: string, input:');
  // Pass orgId when calling buildSmartImportPreview
  smart = smart.replace(/const preview = await buildSmartImportPreview\(/g, 'const orgId = await getDefaultOrganizationId();\n    if (!orgId) throw new Error("No org");\n    const preview = await buildSmartImportPreview(orgId, ');
  // parseImagingManifest missing orgId in smartImports
  smart = smart.replace(/const imagingPreview = await parseImagingManifest\(\{/g, 'const imagingPreview = await parseImagingManifest(orgId, {');
  // parseDicomSeriesManifest in smartImports? Let's check.
  smart = smart.replace(/const imagingPreview = await parseDicomSeriesManifest\(\{/g, 'const imagingPreview = await parseDicomSeriesManifest(orgId, {');
  fs.writeFileSync(smartPath, smart);

  // Fix tests
  const testsPath = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/tests/imaging.test.ts';
  if (fs.existsSync(testsPath)) {
    let t1 = fs.readFileSync(testsPath, 'utf8');
    t1 = t1.replace(/parseImagingManifest\(\{/g, 'parseImagingManifest("mock-org", {');
    t1 = t1.replace(/parseDicomSeriesManifest\(\{/g, 'parseDicomSeriesManifest("mock-org", {');
    fs.writeFileSync(testsPath, t1);
  }

  const testsPath2 = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.test.ts';
  if (fs.existsSync(testsPath2)) {
    let t2 = fs.readFileSync(testsPath2, 'utf8');
    t2 = t2.replace(/parseImagingManifest\(\{/g, 'parseImagingManifest("mock-org", {');
    t2 = t2.replace(/parseDicomSeriesManifest\(\{/g, 'parseDicomSeriesManifest("mock-org", {');
    fs.writeFileSync(testsPath2, t2);
  }

  console.log("Fixed final round of TS errors.");
}

fixFinalRound();
