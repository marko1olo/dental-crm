const fs = require('fs');
const path = require('path');
['apps/api/src/routes/egisz.ts', 'apps/api/src/routes/diary.ts', 'apps/api/src/routes/templates.ts'].forEach(p => {
  if (!fs.existsSync(p)) return;
  let t = fs.readFileSync(p, 'utf8');
  if (!t.includes('resolveOrganizationId')) t = t.replace('import { requireClinicalMutationAccess } from "../accessGuard.js";', 'import { requireClinicalMutationAccess, resolveOrganizationId } from "../accessGuard.js";');
  if (p.includes('egisz't)) {
    t = t.replace('import { eq }', 'import { eq, and }');
    t = t.replace('const [patient] = await db.select().from(patients).where(eq(patients.id, patientId));', 'const orgId = await resolveOrganizationId(req); if(!orgId) return reply.code(403).send({error:"OrgRequired"});\n    const [patient] = await db.select().from(patients).where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)));');
    t = t.replace('const logs = await db.select().from(egiszLogs).where(eq(egiszLogs.patientId, patientId));', 'const orgId = await resolveOrganizationId(req); if(!orgId) return reply.code(403).send({error:"OrgRequired"});\n    const logs = await db.select().from(egiszLogs).innerJoin(patients, eq(egiszLogs.patientId, patients.id)).where(and(eq(egiszLogs.patientId, patientId), eq(patients.organizationId, orgId))).then(res => res.map(r => r.egisz_logs));');
  }
  if (p.includes('diary't)) {
    t = t.replace('const [diary] = await db.select().from(visitDiaries).where(eq(visitDiaries.visitId, visitId));', 'const orgId = await resolveOrganizationId(req); if(!orgId) return reply.code(403).send({ error: "OrgRequired" }); const [diary] = await db.select().from(visitDiaries).where(and(eq(visitDiaries.visitId, visitId), eq(visitDiaries.organizationId, orgId)));');
    t = t.replace('const [existing] = await db.select().from(visitDiaries).where(eq(visitDiaries.visitId, data.visitId));', 'const orgId = await resolveOrganizationId(req); if(!orgId) return reply.code(403).send({ error: "OrgRequired" }); data.organizationId = orgId; const [existing] = await db.select().from(visitDiaries).where(and(eq(visitDiaries.visitId, data.visitId), eq(visitDiaries.organizationId, orgId)));');
    t = t.replace('await db.update(visitDiaries).set({', 'await db.update(visitDiaries).set({ organizationId: orgId,');
    t = t.replace('const plans = await db.select().from(treatmentPlans).where(eq(treatmentPlans.patientId, patientId));', 'const orgId = await resolveOrganizationId(req); if(!orgId) return reply.code(403).send({ error: "OrgRequired" }); const plans = await db.select().from(treatmentPlans).where(and(eq(treatmentPlans.patientId, patientId), eq(treatmentPlans.organizationId, orgId)));');
  }
  if (p.includes('templates'), {
    t = t.replace('const templates = await db.select().from(visitTemplates);', 'const orgId = await resolveOrganizationId(req); if(!orgId) return reply.code(403).send({ error: "OrgRequired" }); const templates = await db.select().from(visitTemplates).where(eq(visitTemplates.organizationId, orgId));');
    t = t.replace('import { eq }', 'import { eq , and }');
  }
  fs.writeFileSync(p, t, 'utf8');
});