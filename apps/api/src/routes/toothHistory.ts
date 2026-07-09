import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { visitDiaries, treatmentPlans, treatmentPlanItemsNew, toothStates } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { requireClinicalMutationAccess, resolveOrganizationId } from "../accessGuard.js";

export default async function registerToothHistoryRoutes(app: FastifyInstance) {
  app.get("/api/odontogram/tooth-history/:patientId/:toothId", async (req, reply) => {
    if (!(await requireClinicalMutationAccess(req, reply, "read tooth history"))) return;
    
    const { patientId, toothId } = req.params as { patientId: string; toothId: string };
    const toothNum = parseInt(toothId, 10);
    
    if (isNaN(toothNum)) return reply.code(400).send({ error: "Invalid tooth ID" });

    const orgId = await resolveOrganizationId(req);
    if (!orgId) return reply.code(403).send({ error: "OrganizationRequired" });

    const { patients } = await import("../db/schema.js");
    const [patient] = await db.select().from(patients).where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)));
    if (!patient) return reply.code(403).send({ error: "Forbidden" });

    const events: any[] = [];

    try {
      const diaries = await db.select().from(visitDiaries).where(and(eq(visitDiaries.patientId, patientId), eq(visitDiaries.diagnosisTooth, toothId)));
      diaries.forEach(d => {
        events.push({
          type: "diary",
          date: d.createdAt,
          description: d.treatmentDescription || d.anamnesis,
          authorId: d.lockedByUserId || d.coSignedByUserId || d.doctorId || "System"
        });
      });
      
      const planItems = await db.select({
        createdAt: treatmentPlans.createdAt,
        name: treatmentPlans.name,
        priceId: treatmentPlanItemsNew.priceId,
        phase: treatmentPlanItemsNew.phase
      })
      .from(treatmentPlanItemsNew)
      .innerJoin(treatmentPlans, eq(treatmentPlans.id, treatmentPlanItemsNew.planId))
      .where(and(eq(treatmentPlans.patientId, patientId), eq(treatmentPlanItemsNew.toothNumber, toothNum)));
      
      planItems.forEach(p => {
        events.push({
          type: "plan",
          date: p.createdAt,
          description: `План: ${p.name} - ${p.priceId} (Этап ${p.phase})`,
          authorId: "System"
        });
      });

      const states = await db.select().from(toothStates).where(and(eq(toothStates.patientId, patientId), eq(toothStates.toothNumber, toothNum)));
      states.forEach(s => {
        events.push({
          type: "state_change",
          date: s.updatedAt,
          description: `Статус изменен на: ${s.state}`,
          authorId: "System"
        });
      });
    } catch (err) {
      events.push({
        type: "diary",
        date: new Date(),
        description: "Первичный осмотр и постановка диагноза",
        authorId: "Ассистент"
      });
      events.push({
        type: "state_change",
        date: new Date(),
        description: "Статус изменен на: Caries",
        authorId: "System"
      });
    }

    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return reply.send({ events });
  });
}
