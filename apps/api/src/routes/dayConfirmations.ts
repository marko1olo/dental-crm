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

import { and, asc, eq, gte, inArray, like, lte, or } from "drizzle-orm";
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

/** Дата в поясе клиники в виде ГГГГ-ММ-ДД. null — пояс неизвестен. */
function dateInTimeZone(timeZone: string, moment: Date): string | null {
	try {
		// en-CA даёт ISO-подобный формат ГГГГ-ММ-ДД.
		return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
			moment
		);
	} catch {
		return null;
	}
}

/**
 * Следующий календарный день. Перенос через конец месяца и года делает сам
 * `Date.UTC`: день 32 в июле он превращает в 1 августа.
 */
function nextCalendarDay(date: string): string {
	const [year, month, day] = date.split("-").map((value) => Number.parseInt(value, 10));
	if (!year || !month || !day) return date;
	return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

/**
 * Завтрашняя дата в поясе клиники — обзвон делают накануне.
 *
 * ЧТО БЫЛО СЛОМАНО. Здесь к текущему моменту прибавлялись 24 часа, и результат
 * форматировался в поясе клиники. Сутки не всегда равны 24 часам: в день
 * перехода на зимнее время их 25, и прибавленные 24 часа не доводят до
 * следующей календарной даты. Для клиники в таком поясе список «на завтра»
 * молча становился списком на СЕГОДНЯ — администратор обзванивал не тот день,
 * а завтрашние приёмы оставались без подтверждения.
 *
 * Проверяемый пример: момент 2026-11-01T04:30:00Z в America/New_York — это
 * 1 ноября 00:30 по местному времени, сутки в этот день длиной 25 часов.
 * Прежний расчёт давал 2026-11-01, то есть сегодня.
 *
 * Теперь дата считается КАЛЕНДАРНО: берётся сегодняшняя дата в поясе клиники и
 * к ней прибавляется один день. Длина суток на это не влияет вообще.
 */
export function tomorrowInTimeZone(timeZone: string, now = new Date()): string {
	const today = dateInTimeZone(timeZone, now);
	// Пояс неизвестен — прежнее поведение: сутки вперёд по UTC. Здесь это
	// единственный доступный ответ, и он честнее отказа: маршрут обязан вернуть
	// список хотя бы за какой-то день.
	if (!today) return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
	return nextCalendarDay(today);
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
		//
		// И КАЖДЫЙ ИЗ ЭТИХ ЗАПРОСОВ ОГРАНИЧЕН ЭТИМ ДНЁМ. Раньше они были ограничены
		// только организацией: чтобы подписать ~30 строк, читалась вся картотека
		// клиники, весь исходящий журнал за все годы и все коды подтверждения. То
		// есть утренний обзвон на 30 приёмов дорожал линейно с возрастом клиники и
		// на второй год работы стоил вдвое, хотя приёмов в дне столько же.
		// Идентификаторы дня уже собраны выше, поэтому отбор идёт по ним.
		const dayPatientIds = [
			...new Set(appointmentRows.map((row) => row.patientId).filter((id): id is string => !!id))
		];
		const dayDoctorIds = [
			...new Set(appointmentRows.map((row) => row.doctorUserId).filter((id): id is string => !!id))
		];
		const dayAppointmentIds = appointmentRows.map((row) => row.id);

		const patientRows =
			dayPatientIds.length > 0
				? await db
						.select({ id: patients.id, fullName: patients.fullName, phone: patients.phone })
						.from(patients)
						.where(and(eq(patients.organizationId, context.organizationId), inArray(patients.id, dayPatientIds)))
				: [];
		const patientById = new Map(patientRows.map((row) => [row.id, row]));

		const staffRows =
			dayDoctorIds.length > 0
				? await db
						.select({ id: users.id, fullName: users.fullName })
						.from(users)
						.where(and(eq(users.organizationId, context.organizationId), inArray(users.id, dayDoctorIds)))
				: [];
		const staffById = new Map(staffRows.map((row) => [row.id, row.fullName]));

		// Ключ напоминания детерминирован — `reminder:<приём>:<часов>`, — поэтому
		// вместо «все напоминания организации» спрашиваются напоминания именно этих
		// приёмов. Условие построено как ИЛИ из префиксов, а не как один LIKE по
		// всей таблице: результат тот же по построению (отбрасываются ровно те
		// строки, которые прежний код читал, разбирал и затем ни разу не искал в
		// карте), но из базы в процесс больше не переносится весь журнал рассылок.
		// ЗАМЕРЕНО: индексом префиксы всё равно не обслуживаются — при пробном
		// индексе (organization_id, dedupe_key text_pattern_ops) в BEGIN…ROLLBACK
		// планировщик оставил оба LIKE в Filter, а в Index Cond ушёл только
		// organization_id. Поэтому индекс сюда не добавлен: он был бы украшением.
		// Выигрыш здесь в объёме перенесённых и разобранных строк, а не в чтении.
		const reminderRows =
			dayAppointmentIds.length > 0
				? await db
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
							and(
								eq(communicationOutbox.organizationId, context.organizationId),
								or(...dayAppointmentIds.map((id) => like(communicationOutbox.dedupeKey, `reminder:${id}:%`)))
							)
						)
				: [];

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

		// Коды подтверждения — только этих приёмов. Отбор попадает на индекс
		// appointment_action_codes_appointment_action_unique (appointment_id, action),
		// то есть перестаёт быть полным чтением таблицы. Условие по организации
		// оставлено первым: код чужой клиники не должен пролезть даже при ошибке
		// в идентификаторах приёмов.
		const codeRows =
			dayAppointmentIds.length > 0
				? await db
						.select({ appointmentId: appointmentActionCodes.appointmentId, usedAt: appointmentActionCodes.usedAt })
						.from(appointmentActionCodes)
						.where(
							and(
								eq(appointmentActionCodes.organizationId, context.organizationId),
								inArray(appointmentActionCodes.appointmentId, dayAppointmentIds)
							)
						)
				: [];
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
