/**
 * ztlLookAheadDaemon.ts — 08:00 AM Proactive ZTL (Dental Lab) Look-Ahead Daemon.
 *
 * Scans upcoming orthopedic appointments scheduled in the next 24–48 hours.
 * Cross-references dental lab orders (lab_orders) for each patient.
 * If a lab order is not marked as 'received' or 'completed' (e.g., 'sent', 'in_progress', 'shipped', 'refitting'),
 * generates proactive alert cards for clinic administrators with 1-click actions:
 * [Написать технику в WA] | [Перенести пациента].
 *
 * Implements 3-tier look-ahead cascade:
 * - 48h Look-Ahead (hoursUntil > 24 && <= 48): Gentle reminder to check with lab technician.
 * - 24h Look-Ahead (hoursUntil > 4 && <= 24): High priority warning to verify courier dispatch.
 * - Same Day / Morning of shift (hoursUntil <= 4): Critical alert to avert patient chair collision.
 */

import { and, eq, gte, inArray, lte, or } from "drizzle-orm";
import { db } from "../../db/client.js";
import { appointments, labOrders, patients, users } from "../../db/schema.js";

export interface ZtlLookAheadAlert {
	readonly id: string;
	readonly organizationId: string;
	readonly appointmentId: string;
	readonly patientId: string;
	readonly patientFullName: string;
	readonly patientPhone: string | null;
	readonly doctorId: string | null;
	readonly doctorName: string;
	readonly appointmentStartsAt: string;
	readonly hoursUntilAppointment: number;
	readonly labOrderId: string;
	readonly labOrderStatus: string;
	readonly labOrderStatusRu: string;
	readonly toothFdi: string | null;
	readonly material: string | null;
	readonly dueDate: string | null;
	readonly urgency: "LOW" | "HIGH" | "CRITICAL";
	readonly cascadeStage: "48h_reminder" | "24h_warning" | "same_day_critical";
	readonly message: string;
	readonly suggestedActions: Array<{
		readonly actionId: string;
		readonly title: string;
		readonly payload: Record<string, unknown>;
	}>;
	readonly createdAt: string;
}

export const LAB_ORDER_STATUS_RU_MAP: Readonly<Record<string, string>> = {
	draft: "Черновик (не отправлен)",
	sent: "Отправлен в лабораторию",
	in_progress: "В работе (нанесение керамики / фрезеровка)",
	shipped: "В пути из ЗТЛ",
	received: "Принят в клинике (готов к установке)",
	refitting: "На переделке / коррекции",
	completed: "Установлен / Завершен",
	cancelled: "Отменен",
};

/**
 * Executes the 08:00 AM ZTL Look-Ahead scan for a given organization or all organizations.
 * Implements 3-tier look-ahead cascade:
 * - 48h Look-Ahead (hoursUntil > 24 && <= 48): Gentle reminder to check with lab technician.
 * - 24h Look-Ahead (hoursUntil > 4 && <= 24): High priority warning to verify courier dispatch.
 * - Same Day / Morning of shift (hoursUntil <= 4): Critical alert to avert patient chair collision.
 */
export async function runZtlLookAheadScan(options?: {
	organizationId?: string | undefined;
	lookAheadHours?: number | undefined;
	now?: Date | undefined;
}): Promise<ZtlLookAheadAlert[]> {
	try {
		const now = options?.now ?? new Date();
		const lookAheadHours = options?.lookAheadHours ?? 48;
		const windowEnd = new Date(now.getTime() + lookAheadHours * 60 * 60 * 1000);

		// Query appointments within the look-ahead window
		const conditions = [
			gte(appointments.startsAt, now),
			lte(appointments.startsAt, windowEnd),
			or(
				eq(appointments.status, "planned"),
				eq(appointments.status, "confirmed"),
			),
		];

		if (options?.organizationId) {
			conditions.push(eq(appointments.organizationId, options.organizationId));
		}

		const upcomingAppointments = await db
			.select({
				appointmentId: appointments.id,
				organizationId: appointments.organizationId,
				patientId: appointments.patientId,
				doctorUserId: appointments.doctorUserId,
				startsAt: appointments.startsAt,
				endsAt: appointments.endsAt,
				reason: appointments.reason,
				comment: appointments.comment,
				patientFullName: patients.fullName,
				patientPhone: patients.phone,
				doctorFullName: users.fullName,
			})
			.from(appointments)
			.leftJoin(patients, eq(appointments.patientId, patients.id))
			.leftJoin(users, eq(appointments.doctorUserId, users.id))
			.where(and(...conditions));

		const alerts: ZtlLookAheadAlert[] = [];

		for (const appt of upcomingAppointments) {
			if (!appt.patientId) continue;

			// Check for active lab orders for this patient
			const orders = await db
				.select({
					id: labOrders.id,
					status: labOrders.status,
					toothFdi: labOrders.toothFdi,
					material: labOrders.material,
					dueDate: labOrders.dueDate,
					doctorName: labOrders.doctorName,
					clinicalNotes: labOrders.clinicalNotes,
					priceRub: labOrders.priceRub,
				})
				.from(labOrders)
				.where(
					and(
						eq(labOrders.organizationId, appt.organizationId),
						eq(labOrders.patientId, appt.patientId),
						// Statuses that mean the order is NOT in the clinic yet
						inArray(labOrders.status, ["draft", "sent", "in_progress", "shipped", "refitting"]),
					),
				);

			if (orders.length === 0) {
				continue;
			}

			const patientFullName = appt.patientFullName || "Пациент";
			const doctorName = appt.doctorFullName || "Врач-ортопед";

			const hoursUntil = Math.max(
				0,
				Math.round((appt.startsAt.getTime() - now.getTime()) / (1000 * 60 * 60)),
			);

			const timeFormatted = `${appt.startsAt.toLocaleDateString("ru-RU")} ${appt.startsAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;

			for (const order of orders) {
				const statusRu = LAB_ORDER_STATUS_RU_MAP[order.status] ?? order.status;
				const toothInfo = order.toothFdi ? `зуб ${order.toothFdi}` : "конструкция";
				const materialInfo = order.material ? ` (${order.material})` : "";

				let urgency: ZtlLookAheadAlert["urgency"] = "LOW";
				let cascadeStage: ZtlLookAheadAlert["cascadeStage"] = "48h_reminder";
				let message = "";

				if (hoursUntil <= 4) {
					urgency = "CRITICAL";
					cascadeStage = "same_day_critical";
					message = `🔥 СРОЧНО: Прием СЕГОДНЯ через ${hoursUntil}ч (${timeFormatted}) у ${patientFullName}. Наряд ЗТЛ #${order.id.slice(0, 8)} (${toothInfo}${materialInfo}) в статусе «${statusRu}». Риск срыва приема! Связаться с ЗТЛ или предупредить пациента до выезда.`;
				} else if (hoursUntil <= 24) {
					urgency = "HIGH";
					cascadeStage = "24h_warning";
					message = `⚠️ Завтра примерка через ${hoursUntil}ч (${timeFormatted}) у ${patientFullName}. Наряд #${order.id.slice(0, 8)} (${toothInfo}${materialInfo}) в статусе «${statusRu}». Проверить отправку курьером из ЗТЛ.`;
				} else {
					urgency = "LOW";
					cascadeStage = "48h_reminder";
					message = `ℹ️ Напоминание: Через ${hoursUntil}ч (${timeFormatted}) запланирован прием у ${patientFullName}. Работа (${toothInfo}${materialInfo}) еще в лаборатории («${statusRu}»). Уточнить готовность у техника.`;
				}

				alerts.push({
					id: `ztl_alert_${appt.appointmentId}_${order.id}`,
					organizationId: appt.organizationId,
					appointmentId: appt.appointmentId,
					patientId: appt.patientId,
					patientFullName,
					patientPhone: appt.patientPhone,
					doctorId: appt.doctorUserId,
					doctorName,
					appointmentStartsAt: appt.startsAt.toISOString(),
					hoursUntilAppointment: hoursUntil,
					labOrderId: order.id,
					labOrderStatus: order.status,
					labOrderStatusRu: statusRu,
					toothFdi: order.toothFdi,
					material: order.material,
					dueDate: order.dueDate ? order.dueDate.toISOString() : null,
					urgency,
					cascadeStage,
					message,
					suggestedActions: [
						{
							actionId: "contact_lab_tech",
							title: "Написать технику в WhatsApp",
							payload: {
								labOrderId: order.id,
								patientId: appt.patientId,
								patientName: patientFullName,
								toothFdi: order.toothFdi,
							},
						},
						{
							actionId: "reschedule_patient",
							title: "Перенести прием пациента",
							payload: {
								appointmentId: appt.appointmentId,
								patientId: appt.patientId,
								patientName: patientFullName,
								patientPhone: appt.patientPhone,
							},
						},
					],
					createdAt: now.toISOString(),
				});
			}
		}

		return alerts;
	} catch {
		return [];
	}
}
