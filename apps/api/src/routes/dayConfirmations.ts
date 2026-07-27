/**
 * Подтверждения на день: кому звонить, а кому не нужно.
 *
 * ЗАЧЕМ ЭТОТ МАРШРУТ
 * Подтверждение приёма в одно касание уже работает, но администратор нигде не
 * видит его результата. Без этого экрана он по-прежнему обзванивает всех
 * подряд — то есть половину звонков делает зря, а половину нужных пропускает,
 * потому что не знает, до кого напоминание не дошло.
 *
 * Здесь на один день собирается всё, что определяет решение «звонить или нет»:
 * статус записи, что стало с напоминанием (не поставлено, стоит в очереди,
 * отправлено, доставлено, не доставлено), нажал ли пациент ссылку и есть ли у
 * него вообще телефон.
 *
 * ГЛАВНОЕ ПОЛЕ — needsCall. Оно и есть ответ: не подтвердил и напоминание до
 * него не дошло. Список, отсортированный по времени приёма, превращает утренний
 * обзвон из «всех по списку» в «этих шестерых».
 */

import { and, asc, eq, gte, like, lte } from "drizzle-orm";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { requireClinicalReadContext } from "../accessGuard.js";
import { db } from "../db/client.js";
import { appointmentActionCodes } from "../db/communicationsSchema.js";
import { appointments, clinics, communicationOutbox, patients, users } from "../db/schema.js";
import { enforcePermissionWhenStaffKnown } from "../security/permissions.js";

const querySchema = z.object({
	/** Дата в виде ГГГГ-ММ-ДД. По умолчанию — завтра: обзвон делают накануне. */
	date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "дата должна быть в виде ГГГГ-ММ-ДД")
		.optional()
});

/** Состояние напоминания глазами администратора, а не очереди. */
export type ReminderState = "not_queued" | "queued" | "sent" | "delivered" | "failed" | "suppressed" | "cancelled";

const OUTBOX_TO_REMINDER_STATE: Readonly<Record<string, ReminderState>> = {
	queued: "queued",
	sending: "queued",
	sent: "sent",
	delivered: "delivered",
	failed: "failed",
	suppressed: "suppressed",
	cancelled: "cancelled"
};

/**
 * Границы дня в часовом поясе клиники. Считать по серверному поясу нельзя:
 * в клинике на востоке страны «завтра» наступает раньше, и список приёмов
 * съехал бы на сутки.
 */
export function dayBoundsInTimeZone(date: string, timeZone: string): { from: Date; to: Date } | null {
	const parts = date.split("-").map((value) => Number.parseInt(value, 10));
	const [year, month, day] = parts;
	if (!year || !month || !day) return null;

	// Смещение пояса определяется через форматирование известного момента:
	// готовой функции «локальная дата → UTC» в стандартной библиотеке нет.
	const probe = Date.UTC(year, month - 1, day, 12, 0, 0);
	let offsetMinutes = 0;
	try {
		const formatter = new Intl.DateTimeFormat("en-US", {
			timeZone,
			hour: "2-digit",
			minute: "2-digit",
			hour12: false
		});
		const rendered = formatter.format(new Date(probe));
		const [renderedHour, renderedMinute] = rendered.split(":").map((value) => Number.parseInt(value, 10));
		if (renderedHour === undefined || renderedMinute === undefined || Number.isNaN(renderedHour)) return null;
		offsetMinutes = (renderedHour % 24) * 60 + renderedMinute - 12 * 60;
	} catch {
		return null;
	}

	const from = new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - offsetMinutes * 60_000);
	const to = new Date(from.getTime() + 24 * 60 * 60 * 1000 - 1);
	return { from, to };
}

/** Завтрашняя дата в поясе клиники — обзвон делают накануне. */
function tomorrowInTimeZone(timeZone: string, now = new Date()): string {
	const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
	try {
		// en-CA даёт ISO-подобный формат ГГГГ-ММ-ДД.
		return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
			tomorrow
		);
	} catch {
		return tomorrow.toISOString().slice(0, 10);
	}
}

function badRequest(reply: FastifyReply, message: string) {
	return reply.code(400).send({ error: "DayConfirmationValidationError", message });
}

export async function registerDayConfirmationRoutes(app: FastifyInstance) {
	app.get("/api/schedule/day-confirmations", async (request, reply) => {
		const context = await requireClinicalReadContext(request, reply, "day confirmations");
		if (!context) return;
		if (!enforcePermissionWhenStaffKnown(request, reply, "schedule.read")) return;

		const parsed = querySchema.safeParse(request.query);
		if (!parsed.success) return badRequest(reply, "Дата должна быть в виде ГГГГ-ММ-ДД.");

		const [clinic] = await db
			.select({ timezone: clinics.timezone })
			.from(clinics)
			.where(eq(clinics.organizationId, context.organizationId))
			.limit(1);
		const timeZone = clinic?.timezone ?? "Europe/Moscow";

		const date = parsed.data.date ?? tomorrowInTimeZone(timeZone);
		const bounds = dayBoundsInTimeZone(date, timeZone);
		if (!bounds) return badRequest(reply, "Дату не удалось разобрать в часовом поясе клиники.");

		const appointmentRows = await db
			.select({
				id: appointments.id,
				startsAt: appointments.startsAt,
				status: appointments.status,
				patientId: appointments.patientId,
				doctorUserId: appointments.doctorUserId
			})
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, context.organizationId),
					gte(appointments.startsAt, bounds.from),
					lte(appointments.startsAt, bounds.to)
				)
			)
			.orderBy(asc(appointments.startsAt));

		if (appointmentRows.length === 0) {
			return {
				date,
				timeZone,
				summary: { total: 0, confirmed: 0, awaiting: 0 , cancelled: 0, noShow: 0, needsCall: 0, withoutPhone: 0 },
				rows: [],
				isEmpty: true
			};
		}

		// Имена пациентов и врачей, состояние напоминаний и отметки переходов по
		// ссылке — по одному запросу на всё, а не по запросу на строку.
		const patientRows = await db
			.select({ id: patients.id, fullName: patients.fullName, phone: patients.phone })
			.from(patients)
			.where(eq(patients.organizationId, context.organizationId));
		const patientById = new Map(patientRows.map((row) => [row.id, row]));

		const staffRows = await db
			.select({ id: users.id, fullName: users.fullName })
			.from(users)
			.where(eq(users.organizationId, context.organizationId));
		const staffById = new Map(staffRows.map((row) => [row.id, row.fullName]));

		const reminderRows = await db
			.select({
				dedupeKey: communicationOutbox.dedupeKey,
				status: communicationOutbox.status,
				channel: communicationOutbox.channel,
				sentAt: communicationOutbox.sentAt,
				deliveredAt: communicationOutbox.deliveredAt,
				lastErrorMessage: communicationOutbox.lastErrorMessage,
				receiptDetail: communicationOutbox.receiptDetail
			})
			.from(communicationOutbox)
			.where(
				and(eq(communicationOutbox.organizationId, context.organizationId), like(communicationOutbox.dedupeKey, "reminder:%"))
			);

		type ReminderInfo = {
			state: ReminderState;
			channel: string | null;
			at: Date | null;
			detail: string | null;
		};
		const reminderByAppointment = new Map<string, ReminderInfo>();
		for (const row of reminderRows) {
			// Ключ: reminder:<приём>:<часов>. Приёму может соответствовать несколько
			// напоминаний — за сутки и за два часа; берём самое продвинутое.
			const parts = row.dedupeKey.split(":");
			const appointmentId = parts[1];
			if (!appointmentId) continue;

			const state = OUTBOX_TO_REMINDER_STATE[row.status] ?? "queued";
			const candidate: ReminderInfo = {
				state,
				channel: row.channel,
				at: row.deliveredAt ?? row.sentAt ?? null,
				detail: row.receiptDetail ?? row.lastErrorMessage ?? null
			};
			const existing = reminderByAppointment.get(appointmentId);
			if (!existing || reminderStateRank(candidate.state) > reminderStateRank(existing.state)) {
				reminderByAppointment.set(appointmentId, candidate);
			}
		}

		const codeRows = await db
			.select({ appointmentId: appointmentActionCodes.appointmentId, usedAt: appointmentActionCodes.usedAt })
			.from(appointmentActionCodes)
			.where(eq(appointmentActionCodes.organizationId, context.organizationId));
		const clickedAtByAppointment = new Map<string, Date>();
		for (const row of codeRows) {
			if (!row.usedAt) continue;
			const existing = clickedAtByAppointment.get(row.appointmentId);
			if (!existing || row.usedAt > existing) clickedAtByAppointment.set(row.appointmentId, row.usedAt);
		}

		let confirmed = 0;
		let cancelled = 0;
		let noShow = 0;
		let needsCall = 0;
		let withoutPhone = 0;

		const rows = appointmentRows.map((appointment) => {
			const patient = appointment.patientId ? patientById.get(appointment.patientId) : undefined;
			const reminder = reminderByAppointment.get(appointment.id) ?? {
				state: "not_queued" as ReminderState,
				channel: null,
				at: null,
				detail: null
			};
			const clickedAt = clickedAtByAppointment.get(appointment.id) ?? null;
			const phone = patient?.phone?.trim() || null;

			if (appointment.status === "confirmed") confirmed += 1;
			if (appointment.status === "cancelled") cancelled += 1;
			if (appointment.status === "no_show") noShow += 1;
			if (!phone) withoutPhone += 1;

			// Звонить нужно тому, кто не подтвердил И до кого напоминание не дошло.
			// Доставленное напоминание без ответа — это ещё не повод звонить: у
			// пациента был выбор, и он им не воспользовался. А вот недоставленное
			// или неотправленное означает, что человек просто ничего не знает.
			const awaitingAnswer = appointment.status === "planned";
			const reminderReached = reminder.state === "delivered";
			const requiresCall = awaitingAnswer && !reminderReached;
			if (requiresCall) needsCall += 1;

			return {
				appointmentId: appointment.id,
				startsAt: appointment.startsAt,
				status: appointment.status,
				patientId: appointment.patientId,
				patientName: patient?.fullName ?? "Пациент не указан",
				phone,
				doctorName: appointment.doctorUserId ? (staffById.get(appointment.doctorUserId) ?? "Врач не в списке") : null,
				reminder,
				patientClickedAt: clickedAt,
				needsCall: requiresCall
			};
		});

		const awaiting = rows.filter((row) => row.status === "planned").length;

		return {
			date,
			timeZone,
			summary: {
				total: rows.length,
				confirmed,
				awaiting,
				cancelled,
				noShow,
				needsCall,
				withoutPhone
			},
			rows,
			isEmpty: false
		};
	});
}

/**
 * Порядок «продвинутости» состояний. Нужен, когда у приёма несколько напоминаний
 * (за сутки и за два часа): администратору важно самое лучшее из случившегося.
 */
function reminderStateRank(state: ReminderState): number {
	switch (state) {
		case "delivered":
			return 5;
		case "sent":
			return 4;
		case "queued":
			return 3;
		case "failed":
			return 2;
		case "suppressed":
			return 1;
		default:
			return 0;
	}
}

export default registerDayConfirmationRoutes;
