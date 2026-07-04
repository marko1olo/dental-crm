const fs = require('fs');

function fixErrors3() {
  const path = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts';
  let code = fs.readFileSync(path, 'utf8');

  // Fix `return parseImagingManifest(input);`
  code = code.replace(/return parseImagingManifest\(input\);/g, 'const orgId = await getDefaultOrganizationId();\n      if (!orgId) throw new Error("No org");\n      return parseImagingManifest(orgId, input);');

  // Fix `return parseDicomImagingManifest(input);`
  code = code.replace(/return parseDicomImagingManifest\(input\);/g, 'const orgId = await getDefaultOrganizationId();\n      if (!orgId) throw new Error("No org");\n      return parseDicomImagingManifest(orgId, input);');
  
  // Fix `parseDicomImagingManifest(input)` anywhere else just in case
  code = code.replace(/parseDicomImagingManifest\(input\)/g, 'parseDicomImagingManifest(orgId, input)');

  // Fix `createImagingStudyInDb(orgId, {` missing await
  code = code.replace(/const study = createImagingStudyInDb\(orgId, \{/g, 'const study = await createImagingStudyInDb(orgId, {');

  // Check saveDicomWorkbenchBundle and saveImagingViewerSession.
  // Wait, the error is: `Cannot find name 'orgId'`. So my replacement `saveDicomWorkbenchBundle(bundle)` was correct, but I might have missed `orgId` elsewhere on those lines.
  // Let's find those lines. 6274 and 6282.

  code = code.split('saveDicomWorkbenchBundle(bundle)').join('saveDicomWorkbenchBundle(orgId, bundle)');
  code = code.split('saveImagingViewerSession(session)').join('saveImagingViewerSession(orgId, session)');
  code = code.split('saveImagingViewerSession(draft)').join('saveImagingViewerSession(orgId, draft)');
  
  // Add orgId to scopes where it's missing (e.g. 6274, 6282)
  // Let's wrap Fastify routes with `orgId` extraction.
  code = code.replace(/app\.post\("\/api\/imaging\/viewer\/dicom-bundle", async \(request, reply\) => \{([^]*?)await saveDicomWorkbenchBundle/g, 'app.post("/api/imaging/viewer/dicom-bundle", async (request, reply) => {$1const orgId = await getDefaultOrganizationId();\n      if (!orgId) throw new Error("No org");\n      await saveDicomWorkbenchBundle');
  
  code = code.replace(/app\.post\("\/api\/imaging\/viewer", async \(request, reply\) => \{([^]*?)await saveImagingViewerSession/g, 'app.post("/api/imaging/viewer", async (request, reply) => {$1const orgId = await getDefaultOrganizationId();\n      if (!orgId) throw new Error("No org");\n      await saveImagingViewerSession');
  
  // Fix 6452: `getPatientByIdFromDb` missing orgId.
  code = code.replace(/const patient = await getPatientByIdFromDb\(orgId, draft\.patientId\);/g, 'const orgId = await getDefaultOrganizationId();\n      if (!orgId) throw new Error("No org");\n      const patient = await getPatientByIdFromDb(orgId, draft.patientId);');
  
  // Fix 6457: `getVisitByIdInDb` missing orgId.
  code = code.replace(/const visit = await getVisitByIdInDb\(orgId, draft\.visitId\);/g, 'const orgId = await getDefaultOrganizationId();\n      if (!orgId) throw new Error("No org");\n      const visit = await getVisitByIdInDb(orgId, draft.visitId);');
  
  // Replace `const orgId = await getDefaultOrganizationId();` if duplicated in the same block.
  // It's fine to redeclare if they are in different scopes, but `fastify` routes are their own scope.
  
  fs.writeFileSync(path, code);
  console.log("Fixed TS errors round 3.");
}

fixErrors3();
