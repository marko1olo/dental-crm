const fs = require('fs');

let path = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts';
let code = fs.readFileSync(path, 'utf8');

// 1. Update imports
code = code.replace(/import \{\n  findVisitById,\n  getOrCreateImagingViewerSession,\n  listDicomWorkbenchBundles,\n  patients,\n  saveDicomWorkbenchBundle,\n  saveImagingViewerSession\n\} from "\.\.\/sampleData\.js";/, '');
code = code.replace(/import \{\n  getImagingStudiesForPatient,\n  getAllImagingStudies,\n  getImagingStudyById,\n  createImagingStudyInDb,\n  updateImagingStudyAiSummaryInDb,\n  getDefaultOrganizationId\n\} from "\.\.\/db\/imagingQuery\.js";/, 'import {\n  getImagingStudiesForPatient,\n  getAllImagingStudies,\n  getImagingStudyById,\n  createImagingStudyInDb,\n  updateImagingStudyAiSummaryInDb,\n  getDefaultOrganizationId,\n  getOrCreateImagingViewerSession,\n  listDicomWorkbenchBundles,\n  saveDicomWorkbenchBundle,\n  saveImagingViewerSession\n} from "../db/imagingQuery.js";\nimport { getVisitByIdInDb } from "../db/visitsQuery.js";');

// 2. fix /api/imaging/dicom-workbench endpoints
// POST /api/imaging/dicom-workbench
code = code.replace(/const bundle = saveDicomWorkbenchBundle\(input\);/, 'const bundle = await saveDicomWorkbenchBundle(orgId, input);');
// GET /api/imaging/dicom-workbench
code = code.replace(/const bundles = listDicomWorkbenchBundles\(Number\.isFinite\(requestedLimit\) \? requestedLimit : 8\);/, 'const bundles = await listDicomWorkbenchBundles(orgId, Number.isFinite(requestedLimit) ? requestedLimit : 8);');

// 3. fix /api/imaging/studies/:id/viewer-session endpoints
// GET /api/imaging/studies/:id/viewer-session
code = code.replace(/const session = getOrCreateImagingViewerSession\(study\);/, 'const session = await getOrCreateImagingViewerSession(orgId, study);');
// POST /api/imaging/studies/:id/viewer-session
code = code.replace(/const session = saveImagingViewerSession\(id, input\);/, 'const session = await saveImagingViewerSession(orgId, id, input);');

// 4. replace findVisitById
code = code.replace(/const visit = input\.visitId \? findVisitById\(input\.visitId\) : null;/, 'const visit = input.visitId ? await getVisitByIdInDb(orgId, input.visitId) : null;');

fs.writeFileSync(path, code);
console.log("imaging.ts refactored successfully.");
