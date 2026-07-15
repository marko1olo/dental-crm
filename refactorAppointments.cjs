const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'apps/api/src/db/appointmentsQuery.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add sql to drizzle-orm imports
if (!content.includes('sql } from "drizzle-orm"')) {
  content = content.replace(/import { eq, and } from "drizzle-orm";/, 'import { eq, and, sql } from "drizzle-orm";');
}

// 2. Add tx parameter to assertAppointmentCanBeScheduled
content = content.replace(
  /async function assertAppointmentCanBeScheduled\(\s*organizationId: string,\s*candidate: {/g,
  `async function assertAppointmentCanBeScheduled(
    organizationId: string,
    candidate: {`
);

content = content.replace(
  /endsAt: Date;\s*}\s*\)/g,
  `endsAt: Date;
    },
    tx: any = db
  )`
);

// 3. Replace db. with tx. inside assertAppointmentCanBeScheduled
// We need to be careful, we'll just replace 'db\n      .select()' with 'tx.select()' and 'db.' with 'tx.' inside that function.
// Actually, it's easier to just do a global replace inside the function body.
let [beforeAssert, assertPart] = content.split('async function assertAppointmentCanBeScheduled(');
let assertBody = 'async function assertAppointmentCanBeScheduled(' + assertPart;
assertBody = assertBody.replace(/db\n\s*\.select/g, 'tx.select');
assertBody = assertBody.replace(/db\.select/g, 'tx.select');
content = beforeAssert + assertBody;

// 4. Rewrite createAppointmentInDb
const createRegex = /export async function createAppointmentInDb\(organizationId: string, input: CreateAppointmentInput\): Promise<Appointment> \{([\s\S]*?)\} as unknown as Appointment;\n\}/;
content = content.replace(createRegex, (match, body) => {
  return `export async function createAppointmentInDb(organizationId: string, input: CreateAppointmentInput, txContext: any = db): Promise<Appointment> {
  return await txContext.transaction(async (tx: any) => {
    // Pessimistic lock on the chair to prevent race conditions
    await tx.execute(sql\`SELECT 1 FROM \${schema.clinicChairs} WHERE id = \${input.chairId} FOR UPDATE\`);

    const candidate = {
      patientId: input.patientId,
      doctorUserId: input.doctorUserId,
      assistantUserId: input.assistantUserId ?? null,
      chairId: input.chairId,
      status: input.status,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt)
    };
    await assertAppointmentCanBeScheduled(organizationId, candidate, tx);

    const [created] = await tx.insert(schema.appointments).values({
      organizationId,
      patientId: input.patientId,
      doctorUserId: input.doctorUserId,
      assistantUserId: input.assistantUserId ?? null,
      chairId: input.chairId,
      status: input.status,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      reason: input.reason || null,
      comment: input.comment || null
    }).returning();

    if (!created) throw new Error("Failed to insert appointment");

    return {
      id: created.id,
      organizationId: created.organizationId,
      patientId: created.patientId,
      doctorUserId: created.doctorUserId,
      assistantUserId: created.assistantUserId,
      chairId: created.chairId,
      status: created.status as any,
      startsAt: created.startsAt.toISOString(),
      endsAt: created.endsAt.toISOString(),
      reason: created.reason,
      comment: created.comment
    } as unknown as Appointment;
  });
}`;
});

// 5. Rewrite updateAppointmentInDb
const updateRegex = /export async function updateAppointmentInDb\(organizationId: string, appointmentId: string, input: UpdateAppointmentInput\): Promise<Appointment> \{([\s\S]*?)\} as unknown as Appointment;\n\}/;
content = content.replace(updateRegex, (match, body) => {
  return `export async function updateAppointmentInDb(organizationId: string, appointmentId: string, input: UpdateAppointmentInput, txContext: any = db): Promise<Appointment> {
  return await txContext.transaction(async (tx: any) => {
    const [existing] = await tx.select().from(schema.appointments).where(and(eq(schema.appointments.id, appointmentId), eq(schema.appointments.organizationId, organizationId))).limit(1);
    if (!existing) throw new Error("Запись не найдена");

    // Lock the chair
    const targetChairId = input.chairId !== undefined ? input.chairId : existing.chairId;
    if (targetChairId) {
       await tx.execute(sql\`SELECT 1 FROM \${schema.clinicChairs} WHERE id = \${targetChairId} FOR UPDATE\`);
    }

    const [activeVisit] = await tx
      .select()
      .from(schema.visits)
      .where(and(eq(schema.visits.appointmentId, appointmentId), eq(schema.visits.status, "draft")))
      .limit(1);

    if (activeVisit) {
      if (input.patientId !== undefined && input.patientId !== existing.patientId) {
        throw new Error("Нельзя менять пациента: открыт прием");
      }
      if (input.status === "completed" || input.status === "cancelled" || input.status === "no_show") {
        throw new Error("Нельзя закрыть запись: открыт прием");
      }
    }

    const startsAtRaw = input.startsAt ?? existing.startsAt.toISOString();
    const endsAtRaw = input.endsAt ?? existing.endsAt.toISOString();

    const candidate = {
      id: appointmentId,
      patientId: input.patientId !== undefined ? input.patientId : existing.patientId,
      doctorUserId: input.doctorUserId !== undefined ? input.doctorUserId : existing.doctorUserId,
      assistantUserId: input.assistantUserId !== undefined ? input.assistantUserId : existing.assistantUserId,
      chairId: targetChairId,
      status: input.status !== undefined ? input.status : existing.status,
      startsAt: new Date(startsAtRaw),
      endsAt: new Date(endsAtRaw)
    };
    await assertAppointmentCanBeScheduled(organizationId, candidate, tx);

    const [updated] = await tx.update(schema.appointments).set({
      patientId: input.patientId ?? existing.patientId,
      doctorUserId: input.doctorUserId ?? existing.doctorUserId,
      assistantUserId: input.assistantUserId !== undefined ? input.assistantUserId : existing.assistantUserId,
      chairId: targetChairId,
      status: input.status ?? existing.status,
      startsAt: new Date(startsAtRaw),
      endsAt: new Date(endsAtRaw),
      reason: input.reason !== undefined ? input.reason : existing.reason,
      comment: input.comment !== undefined ? input.comment : existing.comment
    }).where(and(eq(schema.appointments.id, appointmentId), eq(schema.appointments.organizationId, organizationId))).returning();

    if (!updated) throw new Error("Failed to update appointment");

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      patientId: updated.patientId,
      doctorUserId: updated.doctorUserId,
      assistantUserId: updated.assistantUserId,
      chairId: updated.chairId,
      status: updated.status as any,
      startsAt: updated.startsAt.toISOString(),
      endsAt: updated.endsAt.toISOString(),
      reason: updated.reason,
      comment: updated.comment
    } as unknown as Appointment;
  });
}`;
});

fs.writeFileSync(filePath, content);
console.log('Successfully refactored appointmentsQuery.ts');
