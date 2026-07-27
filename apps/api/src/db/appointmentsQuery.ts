import { db } from "./client.js";
import * as schema from "./schema.js";
import { eq, and, ne, lt, gt, or, type SQL } from "drizzle-orm";
import type { Appointment, CreateAppointmentInput, UpdateAppointmentInput } from "@dental/shared";
import {
  createAppointment as createAppointmentInMemory,
  updateAppointment as updateAppointmentInMemory,
  appointments as inMemoryAppointments
} from "../sampleData.js";

import { isPatientBookingBlocked } from "./patientArchiveReasonsAndBlacklistsQuery.js";

function useInMemory() {
  return process.env.DENTAL_STATE_PERSISTENCE === "off";
}

export async function createAppointmentInDb(organizationId: string, input: CreateAppointmentInput, tx?: any): Promise<Appointment> {
  if (useInMemory()) {
    return createAppointmentInMemory(input);
  }
  if (input.patientId && await isPatientBookingBlocked(organizationId, input.patientId)) {
    throw new Error("Пациент внесен в черный список. Запись заблокирована.");
  }

  const startsAtMs = Date.parse(input.startsAt);
  const endsAtMs = Date.parse(input.endsAt);
  if (!Number.isFinite(startsAtMs) || !Number.isFinite(endsAtMs) || endsAtMs <= startsAtMs) {
    throw new Error("Время окончания должно быть позже времени начала");
  }

  const executor = tx || db;
  const candidateStarts = new Date(startsAtMs);
  const candidateEnds = new Date(endsAtMs);

  if (input.status !== "cancelled" && input.status !== "no_show") {
    const conditions: SQL[] = [
      eq(schema.appointments.organizationId, organizationId),
      ne(schema.appointments.status, "cancelled"),
      ne(schema.appointments.status, "no_show"),
      lt(schema.appointments.startsAt, candidateEnds),
      gt(schema.appointments.endsAt, candidateStarts),
    ];
    const matchConditions: SQL[] = [];
    if (input.chairId) matchConditions.push(eq(schema.appointments.chairId, input.chairId));
    if (input.doctorUserId) matchConditions.push(eq(schema.appointments.doctorUserId, input.doctorUserId));

    if (matchConditions.length > 0) {
      const overlapping = await executor.select().from(schema.appointments).where(
        and(...conditions, or(...matchConditions))
      ).limit(1);

      if (overlapping.length > 0 && overlapping[0]) {
        const ov = overlapping[0];
        if (input.doctorUserId && ov.doctorUserId === input.doctorUserId) {
          throw new Error("У врача уже есть запись в это время");
        }
        throw new Error("Кресло уже занято другой записью в это время");
      }
    }
  }

  const [created] = await executor.insert(schema.appointments).values({
    organizationId,
    patientId: input.patientId,
    doctorUserId: input.doctorUserId,
    assistantUserId: input.assistantUserId ?? null,
    chairId: input.chairId,
    status: input.status,
    startsAt: candidateStarts,
    endsAt: candidateEnds,
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
    status: created.status,
    startsAt: created.startsAt.toISOString(),
    endsAt: created.endsAt.toISOString(),
    reason: created.reason,
    comment: created.comment
  } as unknown as Appointment;
}

export async function updateAppointmentInDb(organizationId: string, appointmentId: string, input: UpdateAppointmentInput): Promise<Appointment> {
  if (useInMemory()) {
    return updateAppointmentInMemory(appointmentId, input);
  }
  const [existing] = await db.select().from(schema.appointments).where(and(eq(schema.appointments.id, appointmentId), eq(schema.appointments.organizationId, organizationId))).limit(1);
  if (!existing) throw new Error("Запись не найдена");

  const startsAtRaw = input.startsAt ?? existing.startsAt.toISOString();
  const endsAtRaw = input.endsAt ?? existing.endsAt.toISOString();

  const startsAtMs = Date.parse(startsAtRaw);
  const endsAtMs = Date.parse(endsAtRaw);
  if (!Number.isFinite(startsAtMs) || !Number.isFinite(endsAtMs) || endsAtMs <= startsAtMs) {
    throw new Error("Время окончания должно быть позже времени начала");
  }

  const candidateStarts = new Date(startsAtMs);
  const candidateEnds = new Date(endsAtMs);
  const newStatus = input.status ?? existing.status;
  const newChairId = input.chairId ?? existing.chairId;
  const newDoctorUserId = input.doctorUserId ?? existing.doctorUserId;

  if (newStatus !== "cancelled" && newStatus !== "no_show") {
    const conditions: SQL[] = [
      eq(schema.appointments.organizationId, organizationId),
      ne(schema.appointments.id, appointmentId),
      ne(schema.appointments.status, "cancelled"),
      ne(schema.appointments.status, "no_show"),
      lt(schema.appointments.startsAt, candidateEnds),
      gt(schema.appointments.endsAt, candidateStarts),
    ];
    const matchConditions: SQL[] = [];
    if (newChairId) matchConditions.push(eq(schema.appointments.chairId, newChairId));
    if (newDoctorUserId) matchConditions.push(eq(schema.appointments.doctorUserId, newDoctorUserId));

    if (matchConditions.length > 0) {
      const overlapping = await db.select().from(schema.appointments).where(
        and(...conditions, or(...matchConditions))
      ).limit(1);

      if (overlapping.length > 0 && overlapping[0]) {
        const ov = overlapping[0];
        if (newDoctorUserId && ov.doctorUserId === newDoctorUserId) {
          throw new Error("У врача уже есть запись в это время");
        }
        throw new Error("Кресло уже занято другой записью в это время");
      }
    }
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
    status: updated.status,
    startsAt: updated.startsAt.toISOString(),
    endsAt: updated.endsAt.toISOString(),
    reason: updated.reason,
    comment: updated.comment
  } as unknown as Appointment;
}

export async function getAppointmentByIdInDb(organizationId: string, id: string) {
  if (useInMemory()) {
    return inMemoryAppointments.find((a) => a.id === id) ?? null;
  }
  const [res] = await db.select().from(schema.appointments).where(and(eq(schema.appointments.organizationId, organizationId), eq(schema.appointments.id, id))).limit(1);
  return res || null;
}
