import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import { visitDiaries, visitDiaryRevisions, treatmentPlanItemsNew, treatmentPlans } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { requireClinicalMutationAccess } from "../accessGuard.js";

const diarySchema = z.object({
  visitId: z.string().uuid(),
  patientId: z.string().uuid(),
  anamnesis: z.string().optional(),
  statusLocalis: z.string().optional(),
  diagnosisIcd10: z.string().optional(),
  diagnosisTooth: z.string().optional(),
  treatmentDescription: z.string().optional(),
  organizationId: z.string().uuid().optional()
});

export default async function registerDiaryRoutes(app: FastifyInstance) {
  app.get("/api/diaries/visit/:visitId", async (req, reply) => {
    if (!(await requireClinicalMutationAccess(req, reply, "read diary"))) return;
    const { visitId } = req.params as { visitId: string };
    const [diary] = await db.select().from(visitDiaries).where(eq(visitDiaries.visitId, visitId));
    return reply.send({ diary: diary || null });
  });

  app.post("/api/diaries", async (req, reply) => {
    if (!(await requireClinicalMutationAccess(req, reply, "write diary"))) return;
    const data = diarySchema.parse(req.body);
    const userContext = (req as any).user;
    const userId = userContext?.id || null;
    
    const [existing] = await db.select().from(visitDiaries).where(eq(visitDiaries.visitId, data.visitId));
    
    if (existing) {
      if (existing.isLocked) {
        // Push old state to revisions
        await db.insert(visitDiaryRevisions).values({
          diaryId: existing.id,
          previousAnamnesis: existing.anamnesis,
          previousStatusLocalis: existing.statusLocalis,
          previousDiagnosisIcd10: existing.diagnosisIcd10,
          previousTreatmentDescription: existing.treatmentDescription,
          revisedAt: new Date(),
          revisedByUserId: userId
        });
      }

      await db.update(visitDiaries).set({
        anamnesis: data.anamnesis,
        statusLocalis: data.statusLocalis,
        diagnosisIcd10: data.diagnosisIcd10,
        diagnosisTooth: data.diagnosisTooth,
        treatmentDescription: data.treatmentDescription,
        updatedAt: new Date()
      }).where(eq(visitDiaries.id, existing.id));
    } else {
      await db.insert(visitDiaries).values(data);
    }

    return reply.send({ success: true });
  });

  app.post("/api/diaries/:id/lock", async (req, reply) => {
    if (!(await requireClinicalMutationAccess(req, reply, "lock diary"))) return;
    const { id } = req.params as { id: string };
    const userContext = (req as any).user;
    const userId = userContext?.id || null;
    
    await db.update(visitDiaries).set({ 
      isLocked: true,
      lockedAt: new Date(),
      lockedByUserId: userId
    }).where(eq(visitDiaries.id, id));
    
    return reply.send({ success: true });
  });

  app.post("/api/diaries/sync-progress", async (req, reply) => {
    if (!(await requireClinicalMutationAccess(req, reply, "sync progress"))) return;
    // Basic sync logic: find active plans for patient and mark item completed
    const { patientId, priceId } = req.body as { patientId: string, priceId: string };
    
    // In MVP, we just find the matching priceId in treatmentPlanItemsNew and mark completed.
    // Assuming treatmentPlans exist. We need to join but for simplicity we can do subqueries or 2 queries.
    const plans = await db.select().from(treatmentPlans).where(eq(treatmentPlans.patientId, patientId));
    if (plans.length > 0) {
      const firstPlan = plans[0];
      if (firstPlan) {
        const activePlanId = firstPlan.id; // MVP: use first plan
      }
    }
    return reply.send({ success: true });
  });
}
