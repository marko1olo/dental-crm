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

/**
 * Пессимистично блокирует строки ресурсов приёма до проверки занятости.
 *
 * Проверка «свободно ли время» и вставка — два разных запроса. Между ними
 * другая транзакция успевает вставить свою запись, и оба вызова видят слот
 * свободным: кресло оказывается занято дважды. Замерено на живом API — два
 * одновременных POST /api/appointments на один слот давали 201/201 и две
 * строки в базе.
 *
 * Блокируем строки кресла, врача и пациента: две транзакции, претендующие
 * на общий ресурс, выстраиваются в очередь, и вторая уже видит запись
 * первой. Порядок блокировок фиксированный — кресло, врач, пациент, — иначе
 * встречные вызовы могут заклиниться друг о друга.
 */
async function lockAppointmentResources(
  executor: any,
  organizationId: string,
  resources: { chairId?: string | null; doctorUserId?: string | null; patientId?: string | null }
) {
  if (resources.chairId) {
    await executor
      .select({ id: schema.chairs.id })
      .from(schema.chairs)
      .where(and(eq(schema.chairs.organizationId, organizationId), eq(schema.chairs.id, resources.chairId)))
      .for("update")
      .limit(1);
  }
  if (resources.doctorUserId) {
    await executor
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(and(eq(schema.users.organizationId, organizationId), eq(schema.users.id, resources.doctorUserId)))
      .for("update")
      .limit(1);
  }
  if (resources.patientId) {
    await executor
      .select({ id: schema.patients.id })
      .from(schema.patients)
      .where(and(eq(schema.patients.organizationId, organizationId), eq(schema.patients.id, resources.patientId)))
      .for("update")
      .limit(1);
  }
}

/**
 * Ищет приём, который пересекается по времени с кандидатом по любому из
 * трёх ресурсов, и бросает ошибку с указанием конкретного виновника.
 *
 * Пациент проверяется наравне с креслом и врачом: физически он не может
 * сидеть в двух креслах одновременно, путь в памяти (sampleData) это
 * запрещает, а сообщение маршрута прямо обещает «время уже занято
 * пациентом, сотрудником или креслом». В пути через базу проверки пациента
 * не было — замерено на живом API: один и тот же пациент записывался в два
 * кресла на одно время, оба ответа 201.
 */
async function assertNoResourceOverlap(
  executor: any,
  organizationId: string,
  candidate: {
    startsAt: Date;
    endsAt: Date;
    chairId?: string | null;
    doctorUserId?: string | null;
    patientId?: string | null;
    excludeAppointmentId?: string;
  }
) {
  const conditions: SQL[] = [
    eq(schema.appointments.organizationId, organizationId),
    ne(schema.appointments.status, "cancelled"),
    ne(schema.appointments.status, "no_show"),
    lt(schema.appointments.startsAt, candidate.endsAt),
    gt(schema.appointments.endsAt, candidate.startsAt),
  ];
  if (candidate.excludeAppointmentId) {
    conditions.push(ne(schema.appointments.id, candidate.excludeAppointmentId));
  }

  const matchConditions: SQL[] = [];
  if (candidate.chairId) matchConditions.push(eq(schema.appointments.chairId, candidate.chairId));
  if (candidate.doctorUserId) matchConditions.push(eq(schema.appointments.doctorUserId, candidate.doctorUserId));
  if (candidate.patientId) matchConditions.push(eq(schema.appointments.patientId, candidate.patientId));
  if (matchConditions.length === 0) return;

  const overlapping = await executor
    .select()
    .from(schema.appointments)
    .where(and(...conditions, or(...matchConditions)))
    .limit(1);

  const ov = overlapping[0];
  if (!ov) return;

  // Порядок сообщений — от самого понятного администратору: пациент важнее
  // врача, врач важнее кресла.
  if (candidate.patientId && ov.patientId === candidate.patientId) {
    throw new Error("У пациента уже есть запись в это время");
  }
  if (candidate.doctorUserId && ov.doctorUserId === candidate.doctorUserId) {
    throw new Error("У врача уже есть запись в это время");
  }
  throw new Error("Кресло уже занято другой записью в это время");
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

  const candidateStarts = new Date(startsAtMs);
  const candidateEnds = new Date(endsAtMs);

  const insertChecked = async (executor: any) => {
    if (input.status !== "cancelled" && input.status !== "no_show") {
      await lockAppointmentResources(executor, organizationId, {
        chairId: input.chairId,
        doctorUserId: input.doctorUserId,
        patientId: input.patientId,
      });
      await assertNoResourceOverlap(executor, organizationId, {
        startsAt: candidateStarts,
        endsAt: candidateEnds,
        chairId: input.chairId,
        doctorUserId: input.doctorUserId,
        patientId: input.patientId,
      });
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
  };

  // Блокировки живут только внутри транзакции. Если вызывающий код уже
  // открыл свою — работаем в ней, иначе открываем собственную, иначе
  // проверка и вставка снова окажутся двумя независимыми операциями.
  if (tx) return insertChecked(tx);
  return db.transaction(insertChecked);
}

export async function updateAppointmentInDb(organizationId: string, appointmentId: string, input: UpdateAppointmentInput): Promise<Appointment> {
  if (useInMemory()) {
    return updateAppointmentInMemory(appointmentId, input);
  }
  // Перенос приёма — та же гонка, что и создание: между проверкой занятости
  // и записью другой администратор успевает занять слот. Всё внутри одной
  // транзакции с блокировкой строк ресурсов.
  const updated = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(schema.appointments)
      .where(and(eq(schema.appointments.id, appointmentId), eq(schema.appointments.organizationId, organizationId)))
      .for("update")
      .limit(1);
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
    const newPatientId = input.patientId ?? existing.patientId;

    if (newStatus !== "cancelled" && newStatus !== "no_show") {
      await lockAppointmentResources(tx, organizationId, {
        chairId: newChairId,
        doctorUserId: newDoctorUserId,
        patientId: newPatientId,
      });
      await assertNoResourceOverlap(tx, organizationId, {
        startsAt: candidateStarts,
        endsAt: candidateEnds,
        chairId: newChairId,
        doctorUserId: newDoctorUserId,
        patientId: newPatientId,
        excludeAppointmentId: appointmentId,
      });
    }

    const [row] = await tx.update(schema.appointments).set({
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

    return row;
  });

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
