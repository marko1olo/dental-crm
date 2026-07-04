import { db } from "./client.js";
import * as schema from "./schema.js";
import { eq, and } from "drizzle-orm";
import type { Appointment, CreateAppointmentInput, UpdateAppointmentInput } from "@dental/shared";

export async function createAppointmentInDb(organizationId: string, input: CreateAppointmentInput): Promise<Appointment> {
  const startsAtMs = Date.parse(input.startsAt);
  const endsAtMs = Date.parse(input.endsAt);
  if (!Number.isFinite(startsAtMs) || !Number.isFinite(endsAtMs) || endsAtMs <= startsAtMs) {
    throw new Error("Время окончания должно быть позже времени начала");
  }

  const [created] = await db.insert(schema.appointments).values({
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
}

export async function updateAppointmentInDb(organizationId: string, appointmentId: string, input: UpdateAppointmentInput): Promise<Appointment> {
  const [existing] = await db.select().from(schema.appointments).where(and(eq(schema.appointments.id, appointmentId), eq(schema.appointments.organizationId, organizationId))).limit(1);
  if (!existing) throw new Error("Запись не найдена");

  const startsAtRaw = input.startsAt ?? existing.startsAt.toISOString();
  const endsAtRaw = input.endsAt ?? existing.endsAt.toISOString();

  const startsAtMs = Date.parse(startsAtRaw);
  const endsAtMs = Date.parse(endsAtRaw);
  if (!Number.isFinite(startsAtMs) || !Number.isFinite(endsAtMs) || endsAtMs <= startsAtMs) {
    throw new Error("Время окончания должно быть позже времени начала");
  }

  const [updated] = await db.update(schema.appointments).set({
    patientId: input.patientId ?? existing.patientId,
    doctorUserId: input.doctorUserId ?? existing.doctorUserId,
    assistantUserId: input.assistantUserId !== undefined ? input.assistantUserId : existing.assistantUserId,
    chairId: input.chairId ?? existing.chairId,
    status: input.status ?? existing.status,
    startsAt: new Date(startsAtMs),
    endsAt: new Date(endsAtMs),
    reason: input.reason !== undefined ? input.reason : existing.reason,
    comment: input.comment !== undefined ? input.comment : existing.comment

  }).where(eq(schema.appointments.id, appointmentId)).returning();

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
}
