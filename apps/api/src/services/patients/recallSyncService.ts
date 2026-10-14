import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { appointments, patientRecalls } from "../../db/schema.js";
import { wsBroker } from "../websocketBroker.js";

/**
 * Реактивная связка Запись/Визит <-> Контрольный вызов (Recall).
 * 
 * Правила:
 * 1. При создании записи на приём (checkup / гигиена / осмотр):
 *    находящийся в ожидании recall ('pending') переходит в 'scheduled' с привязкой scheduledAppointmentId.
 * 2. При завершении приёма ('completed'):
 *    связанный или текущий recall переходит в 'completed' с фиксацией completedAt,
 *    и автоматически планируется следующий recall через 180 дней (+6 месяцев).
 */
export async function syncRecallOnAppointmentCreated(
	organizationId: string,
	appointment: {
		id: string;
		patientId: string | null;
		doctorUserId?: string | null | undefined;
		reason?: string | null | undefined;
	},
): Promise<void> {
	if (!appointment.patientId) return;

	try {
		// Ищем открытый recall со статусом 'pending'
		const [pendingRecall] = await db
			.select({ id: patientRecalls.id })
			.from(patientRecalls)
			.where(
				and(
					eq(patientRecalls.organizationId, organizationId),
					eq(patientRecalls.patientId, appointment.patientId),
					eq(patientRecalls.status, "pending"),
				),
			)
			.orderBy(desc(patientRecalls.createdAt))
			.limit(1);

		if (pendingRecall) {
			await db
				.update(patientRecalls)
				.set({
					status: "scheduled",
					scheduledAppointmentId: appointment.id,
					doctorId: appointment.doctorUserId || null,
					updatedAt: new Date(),
				})
				.where(eq(patientRecalls.id, pendingRecall.id));

			wsBroker.broadcastToOrganization(organizationId, {
				type: "PATIENT_RECALL_UPDATED",
				payload: {
					recallId: pendingRecall.id,
					patientId: appointment.patientId,
					status: "scheduled",
					scheduledAppointmentId: appointment.id,
					updatedAt: new Date().toISOString(),
				},
			});
		}
	} catch (err) {
		console.error("[recallSyncService] syncRecallOnAppointmentCreated failed:", err);
	}
}

export async function syncRecallOnAppointmentCompleted(
	organizationId: string,
	appointmentId: string,
): Promise<void> {
	try {
		// Получаем данные приёма
		const [appt] = await db
			.select({
				id: appointments.id,
				patientId: appointments.patientId,
				doctorUserId: appointments.doctorUserId,
			})
			.from(appointments)
			.where(
				and(
					eq(appointments.id, appointmentId),
					eq(appointments.organizationId, organizationId),
				),
			)
			.limit(1);

		if (!appt || !appt.patientId) return;

		const now = new Date();
		const nextDueDate = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000); // +180 дней

		// 1. Завершаем активный recall (связанный или находящийся в ожидании/запланирован)
		const [activeRecall] = await db
			.select({ id: patientRecalls.id })
			.from(patientRecalls)
			.where(
				and(
					eq(patientRecalls.organizationId, organizationId),
					eq(patientRecalls.patientId, appt.patientId),
					inArray(patientRecalls.status, ["scheduled", "pending"]),
				),
			)
			.orderBy(desc(patientRecalls.createdAt))
			.limit(1);

		if (activeRecall) {
			await db
				.update(patientRecalls)
				.set({
					status: "completed",
					completedAt: now,
					appointmentId: appt.id,
					updatedAt: now,
				})
				.where(eq(patientRecalls.id, activeRecall.id));
		}

		// 2. Создаем следующий recall на +180 дней
		const [newRecall] = await db
			.insert(patientRecalls)
			.values({
				organizationId,
				patientId: appt.patientId,
				doctorId: appt.doctorUserId || null,
				appointmentId: appt.id,
				reason: "Плановый профилактический осмотр и гигиена",
				cohortType: "hygiene_therapy",
				status: "pending",
				dueDate: nextDueDate,
				createdAt: now,
				updatedAt: now,
			})
			.returning({ id: patientRecalls.id });

		wsBroker.broadcastToOrganization(organizationId, {
			type: "PATIENT_RECALL_UPDATED",
			payload: {
				completedRecallId: activeRecall?.id ?? null,
				newRecallId: newRecall?.id ?? null,
				patientId: appt.patientId,
				status: "pending",
				dueDate: nextDueDate.toISOString(),
				updatedAt: now.toISOString(),
			},
		});
	} catch (err) {
		console.error("[recallSyncService] syncRecallOnAppointmentCompleted failed:", err);
	}
}
