const fs = require('fs');
let code = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts', 'utf8');

// Replace imagingStudies.find inside viewer-session PUT
const oldViewerPut = `    const { id } = request.params as { id: string };
    const study = imagingStudies.find((candidate) => candidate.id === id);
    if (!study) return sendImagingStudyNotFound(reply);`;

const newViewerPut = `    const { id } = request.params as { id: string };
    const orgId = await getDefaultOrganizationId();
    if (!orgId) return reply.code(500).send({ ok: false, message: "No default organization found" });
    const study = await getImagingStudyById(orgId, id);
    if (!study) return sendImagingStudyNotFound(reply);`;

code = code.replace(oldViewerPut, newViewerPut);

// Remove unused imagingStudies import if present
code = code.replace(/import \{[^}]*imagingStudies[^}]*\} from "\.\.\/sampleData\.js";/, (match) => {
    return match.replace(/imagingStudies,\s*/, '').replace(/,\s*imagingStudies/, '');
});

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts', code);
console.log('imaging.ts updated put viewer-session');
