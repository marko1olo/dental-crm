import { FastifyInstance } from 'fastify';
import { db } from '../db/client.js';
import { clinicalTasks, treatmentPlanItemsNew, patients, treatmentPlans } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function (fastify: FastifyInstance) {
  fastify.post('/clinical/handoff', async (request, reply) => {
    const { treatmentPlanId, toothNumber } = request.body as { treatmentPlanId: string; toothNumber?: number };
    
    if (!treatmentPlanId) {
      return reply.code(400).send({ error: 'treatmentPlanId is required' });
    }

    // 1. Fetch the plan
    const planRecord = await db.select().from(treatmentPlans).where(eq(treatmentPlans.id, treatmentPlanId)).limit(1);
    if (!planRecord.length) {
      return reply.code(404).send({ error: 'Plan not found' });
    }
    const plan = planRecord[0];
    if (!plan) return reply.code(404).send({ error: 'Plan not found' });

    const patientRecord = await db.select().from(patients).where(eq(patients.id, plan.patientId)).limit(1);
    if (!patientRecord.length) {
      return reply.code(404).send({ error: 'Patient not found' });
    }
    const patient = patientRecord[0];
    if (!patient) return reply.code(404).send({ error: 'Patient not found' });

    // 2. We skip updating the tooth state in the formula table for MVP since it's mock
    // In a real app we'd update odontogram state.

    // 3. Generate Clinical Task for Prosthodontist
    const dueAt = new Date();
    dueAt.setMonth(dueAt.getMonth() + 3); // 3 months for osteointegration

    const taskTitle = `Ортопедия: зуб ${toothNumber || 'Не указан'}`;
    const taskDescription = `Пациент ${patient.fullName || 'Не указано'}. Срок остеоинтеграции имплантата подходит к концу. Время планировать этап протезирования (коронка).`;

    const task = await db.insert(clinicalTasks).values({
      organizationId: patient.organizationId,
      patientId: patient.id,
      treatmentPlanId: plan.id,
      taskType: 'prosthetics_handoff',
      status: 'pending',
      title: taskTitle,
      description: taskDescription,
      dueAt
    }).returning();

    return reply.send({ success: true, task: task[0] });
  });
}
