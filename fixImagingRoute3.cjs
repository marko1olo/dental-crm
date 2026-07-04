const fs = require('fs');
let code = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts', 'utf8');

// Fix 1: Add orgId to app.post("/api/imaging/studies")
const oldPost = `  app.post("/api/imaging/studies", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "imaging study create"))) return;
    const parsed = parseImagingPayload(`;
const newPost = `  app.post("/api/imaging/studies", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "imaging study create"))) return;
    const orgId = await getDefaultOrganizationId();
    if (!orgId) return reply.code(500).send({ ok: false, message: "No default organization found" });
    const parsed = parseImagingPayload(`;
code = code.replace(oldPost, newPost);

// Fix 2: const createdStudyIds = [] -> const createdStudyIds: string[] = []
code = code.replace('const createdStudyIds = [];', 'const createdStudyIds: string[] = [];');

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts', code);
console.log('imaging.ts post route and createdStudyIds fixed');
