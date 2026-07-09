import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import { visitDiaries, visitDiaryRevisions, treatmentPlanItemsNew, treatmentPlans, patients } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { requireClinicalMutationAccess, resolveOrganizationId } from "../accessGuard.js";
import crypto from "crypto";

const diarySchema = z.object({
  visitId: z.string().uuid(),
  patientId: z.string().uuid(),
  anamnesis: z.string().optional(),
  statusLocalis: z.string().optional(),
  diagnosisIcd10: z.string().optional(),
  diagnosisTooth: z.string().optional(),
  treatmentDescription: z.string().optional(),
  organizationId: z.string().uuid().optional(),
  status: z.enum(["draft", "signed"]).optional()
});

export default async function registerDiaryRoutes(app: FastifyInstance) {
  app.get("/api/diaries/visit/:visitId", async (req, reply) => {
    if (!(await requireClinicalMutationAccess(req, reply, "read diary"))) return;
    const { visitId } = req.params as { visitId: string };
    const orgId = await resolveOrganizationId(req); if (!orgId) return reply.code(403).send({error: "OrgRequired"}); 
    const [diary] = await db.select().from(visitDiaries).where(and(eq(visitDiaries.visitId, visitId), eq(visitDiaries.organizationId, orgId)));
    return reply.send({ diary: diary || null });
  });

  app.post("/api/diaries", async (req, reply) => {
    if (!(await requireClinicalMutationAccess(req, reply, "write diary"))) return;
    const data = diarySchema.parse(req.body);
    const userContext = (req as any).user;
    const userId = userContext?.id || null;
    const role = userContext?.role || "assistant";
    
    const orgId = await resolveOrganizationId(req); if (!orgId) return reply.code(403).send({error: "OrgRequired"}); 
    data.organizationId = orgId; 
    
    const [existing] = await db.select().from(visitDiaries).where(and(eq(visitDiaries.visitId, data.visitId), eq(visitDiaries.organizationId, orgId)));
    
    const isSigned = data.status === "signed";
    
    let diaryHash: string | null = null;
    let coSignedByUserId = existing?.coSignedByUserId || null;
    let draftAuthorId = existing?.draftAuthorId || null;
    
    if (isSigned) {
      if (role !== "doctor" && role !== "admin") {
         return reply.code(403).send({error: "Only doctors can sign"});
      }
      coSignedByUserId = userId;
      const hashStr = `${data.visitId}-${data.patientId}-${data.anamnesis || ''}-${data.statusLocalis || ''}-${data.treatmentDescription || ''}`;
      diaryHash = crypto.createHash('sha256').update(hashStr).digest('hex');
    } else {
      if (!existing) {
        draftAuthorId = userId;
      }
    }

    if (existing) {
      if (existing.isLocked) {
        return reply.code(403).send({error: "Diary is locked and cannot be modified"});
      }

      await db.update(visitDiaries).set({ 
        organizationId: orgId,
        anamnesis: data.anamnesis,
        statusLocalis: data.statusLocalis,
        diagnosisIcd10: data.diagnosisIcd10,
        diagnosisTooth: data.diagnosisTooth,
        treatmentDescription: data.treatmentDescription,
        updatedAt: new Date(),
        draftAuthorId: draftAuthorId,
        coSignedByUserId: coSignedByUserId,
        diaryHash: diaryHash,
        isLocked: isSigned,
        lockedAt: isSigned ? new Date() : null,
        lockedByUserId: isSigned ? userId : null
      }).where(and(eq(visitDiaries.id, existing.id), eq(visitDiaries.organizationId, orgId)));
    } else {
      await db.insert(visitDiaries).values({
        ...data,
        draftAuthorId: draftAuthorId,
        coSignedByUserId: coSignedByUserId,
        diaryHash: diaryHash,
        isLocked: isSigned,
        lockedAt: isSigned ? new Date() : null,
        lockedByUserId: isSigned ? userId : null
      });
    }

    return reply.send({ success: true, hash: diaryHash });
  });

  app.post("/api/diaries/:id/lock", async (req, reply) => {
    if (!(await requireClinicalMutationAccess(req, reply, "lock diary"))) return;
    const { id } = req.params as { id: string };
    const userContext = (req as any).user;
    const userId = userContext?.id || null;
    
    const orgId = await resolveOrganizationId(req);
    if (!orgId) return reply.code(403).send({error: "OrgRequired"});

    const [existing] = await db.select().from(visitDiaries).where(and(eq(visitDiaries.id, id), eq(visitDiaries.organizationId, orgId)));
    if (!existing) return reply.code(404).send({error: "Not found"});

    const hashStr = `${existing.visitId}-${existing.patientId}-${existing.anamnesis || ''}-${existing.statusLocalis || ''}-${existing.treatmentDescription || ''}`;
    const diaryHash = crypto.createHash('sha256').update(hashStr).digest('hex');

    await db.update(visitDiaries).set({ 
      isLocked: true,
      lockedAt: new Date(),
      lockedByUserId: userId,
      coSignedByUserId: userId,
      diaryHash: diaryHash
    }).where(and(eq(visitDiaries.id, id), eq(visitDiaries.organizationId, orgId)));
    
    return reply.send({ success: true, hash: diaryHash });
  });

  app.post("/api/diaries/sync-progress", async (req, reply) => {
    if (!(await requireClinicalMutationAccess(req, reply, "sync progress"))) return;
    const { patientId, priceId } = req.body as { patientId: string, priceId: string };
    
    const orgId = await resolveOrganizationId(req);
    if (!orgId) return reply.code(403).send({error: "OrgRequired"});
    const plans = await db.select()
      .from(treatmentPlans)
      .innerJoin(patients, eq(treatmentPlans.patientId, patients.id))
      .where(and(eq(treatmentPlans.patientId, patientId), eq(patients.organizationId, orgId)))
      .then(res => res.map(r => r.treatment_plans));
    return reply.send({ success: true });
  });

  app.put("/api/treatment-plans/:planId/signature", async (req, reply) => {
    if (!(await requireClinicalMutationAccess(req, reply, "sign plan"))) return;
    const { planId } = req.params as { planId: string };
    const { patientSignature } = req.body as { patientSignature: string };
    
    const orgId = await resolveOrganizationId(req);
    if (!orgId) return reply.code(403).send({error: "OrgRequired"});
    
    const [plan] = await db.select().from(treatmentPlans).where(eq(treatmentPlans.id, planId));
    if (!plan) return reply.code(404).send({error: "Not found"});
    
    const [patient] = await db.select().from(patients).where(eq(patients.id, plan.patientId));
    if (!patient || patient.organizationId !== orgId) return reply.code(403).send({error: "Forbidden"});

    await db.update(treatmentPlans)
      .set({ patientSignature, updatedAt: new Date() })
      .where(eq(treatmentPlans.id, planId));
      
    return reply.send({ success: true });
  });
}

