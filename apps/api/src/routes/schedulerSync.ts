import { FastifyInstance } from 'fastify';
import { db } from '../db/client.js';
import { treatmentPlanItemsNew, appointments, patients, treatmentPlans } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export default async function (fastify: FastifyInstance) {
  fastify.post('/scheduler/draft-from-plan', async (request, reply) => {
    const { treatmentPlanId } = request.body as { treatmentPlanId: string };
    
    if (!treatmentPlanId) {
      return reply.code(400).send({ error: 'treatmentPlanId is required' });
    }

    // 1. Fetch Phase I surgical items
    const items = await db.select().from(treatmentPlanItemsNew).where(eq(treatmentPlanItemsNew.planId, treatmentPlanId));
    
    if (items.length === 0) {
      return reply.code(404).send({ error: 'No items found for this plan' });
    }

    const surgicalItems = items; // For MVP, assume phase I items are already filtered by UI or we just schedule everything

    if (surgicalItems.length === 0) {
      return reply.code(400).send({ error: 'No planned items available for scheduling' });
    }

    // Fetch the plan to get patient and org
    const planRecord = await db.select().from(treatmentPlans).where(eq(treatmentPlans.id, treatmentPlanId)).limit(1);
    if (!planRecord.length) {
      return reply.code(404).send({ error: 'Plan not found' });
    }
    const plan = planRecord[0];
    if (!plan) return reply.code(404).send({ error: 'Plan not found' });
    
    const patientId = plan.patientId;

    const patientRecord = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
    
    if (!patientRecord.length) {
         return reply.code(404).send({ error: 'Patient not found' });
    }
    const patient = patientRecord[0];
    if (!patient) return reply.code(404).send({ error: 'Patient not found' });
    
    const organizationId = patient.organizationId;

    // 2. Calculate duration
    // Base 30 min + 30 min per implant (simplified logic)
    const baseDurationMins = 30;
    const additionalMins = surgicalItems.length * 30;
    const totalDurationMins = baseDurationMins + additionalMins;

    // 3. Draft the appointment (starts tomorrow for MVP)
    const startsAt = new Date();
    startsAt.setDate(startsAt.getDate() + 1);
    startsAt.setHours(10, 0, 0, 0); // 10:00 AM

    const endsAt = new Date(startsAt.getTime() + totalDurationMins * 60000);

    const draftAppt = await db.insert(appointments).values({
      organizationId,
      patientId,
      status: 'planned',
      startsAt,
      endsAt,
      reason: `Хирургия по смете. Этап I (${surgicalItems.length} ед)`,
      comment: `Расчетное время: ${totalDurationMins} минут`
    }).returning();

    return reply.send({ success: true, appointment: draftAppt[0] });
  });
}
