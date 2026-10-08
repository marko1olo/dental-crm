/**
 * Отчёты по выработке врачей, загрузке кресел, воронке приёмов, напоминаниям и расписанию.
 */

import { and, eq, gte, lte, ne, sql } from "drizzle-orm";
import { db } from "../../../db/client.js";
import {
	appointments,
	chairs,
	communicationOutbox,
	payments,
	users,
	visits,
} from "../../../db/schema.js";
import { inClinicZone, postgresKnowsTimeZone } from "./timezone.js";
import type {
	AppointmentFunnelReport,
	ChairLoadReport,
	ChairLoadRow,
	DoctorPerformanceReport,
	DoctorPerformanceRow,
	ReminderEffectGroup,
	ReminderEffectReport,
	ReportScope,
	ScheduleLoadCell,
	ScheduleLoadReport,
} from "./types.js";

/**
 * Выручка и загрузка по врачам.
 *
 * Платёж связывается с врачом через приём: payments → visits → appointments.
 * Платёж без визита отнести к врачу нельзя, и он попадает в отдельную сумму
 * «не отнесено» — размазывать его по врачам пропорционально значило бы
 * придумать данные.
 */
export async function doctorPerformance(
	scope: ReportScope,
): Promise<DoctorPerformanceReport> {
	const revenueRows = await db
		.select({
			doctorUserId: appointments.doctorUserId,
			revenueRub: sql<number>`coalesce(sum(${payments.amountRub}), 0)::numeric(12,2)`,
		})
		.from(payments)
		.leftJoin(visits, eq(payments.visitId, visits.id))
		.leftJoin(appointments, eq(visits.appointmentId, appointments.id))
		.where(
			and(
				eq(payments.organizationId, scope.organizationId),
				eq(payments.status, "paid"),
				gte(payments.paidAt, scope.from),
				lte(payments.paidAt, scope.to),
			),
		)
		.groupBy(appointments.doctorUserId);

	const appointmentRows = await db
		.select({
			doctorUserId: appointments.doctorUserId,
			status: appointments.status,
			total: sql<number>`count(*)::int`,
		})
		.from(appointments)
		.where(
			and(
				eq(appointments.organizationId, scope.organizationId),
				gte(appointments.startsAt, scope.from),
				lte(appointments.startsAt, scope.to),
			),
		)
		.groupBy(appointments.doctorUserId, appointments.status);

	const staff = await db
		.select({ id: users.id, fullName: users.fullName })
		.from(users)
		.where(eq(users.organizationId, scope.organizationId));
	const staffNames = new Map(staff.map((row) => [row.id, row.fullName]));

	type Accumulator = {
		revenueRub: number;
		total: number;
		completed: number;
		cancelled: number;
		noShow: number;
	};
	const byDoctor = new Map<string, Accumulator>();
	const ensure = (key: string): Accumulator => {
		const existing = byDoctor.get(key);
		if (existing) return existing;
		const fresh = {
			revenueRub: 0,
			total: 0,
			completed: 0,
			cancelled: 0,
			noShow: 0,
		};
		byDoctor.set(key, fresh);
		return fresh;
	};

	let unattributedRevenueRub = 0;
	for (const row of revenueRows) {
		const amount = Number(row.revenueRub);
		if (!row.doctorUserId) {
			unattributedRevenueRub += amount;
			continue;
		}
		ensure(row.doctorUserId).revenueRub += amount;
	}

	for (const row of appointmentRows) {
		if (!row.doctorUserId) continue;
		const accumulator = ensure(row.doctorUserId);
		const count = Number(row.total);
		accumulator.total += count;
		if (row.status === "completed") accumulator.completed += count;
		else if (row.status === "cancelled") accumulator.cancelled += count;
		else if (row.status === "no_show") accumulator.noShow += count;
	}

	const rows: DoctorPerformanceRow[] = [...byDoctor.entries()]
		.map(([doctorUserId, accumulator]) => ({
			doctorUserId,
			doctorName: staffNames.get(doctorUserId) ?? "Сотрудник вне списка",
			revenueRub: accumulator.revenueRub,
			appointmentsTotal: accumulator.total,
			appointmentsCompleted: accumulator.completed,
			appointmentsCancelled: accumulator.cancelled,
			appointmentsNoShow: accumulator.noShow,
			completionRate:
				accumulator.total > 0
					? accumulator.completed / accumulator.total
					: null,
			noShowRate:
				accumulator.total > 0 ? accumulator.noShow / accumulator.total : null,
			averageTicketRub:
				accumulator.completed > 0
					? Math.round(accumulator.revenueRub / accumulator.completed)
					: null,
			marginRub: null as null,
		}))
		.sort((left, right) => right.revenueRub - left.revenueRub);

	return {
		rows,
		unattributedRevenueRub,
		// У визита нет поля «врач»: единственная связь платежа с врачом идёт
		// через приём (payments.visit_id → visits.appointment_id →
		// appointments.doctor_user_id). Платёж без визита или визит без приёма
		// отнести не к чему, и такая сумма показывается отдельно, а не
		// размазывается по врачам.
		attributionNote:
			unattributedRevenueRub > 0
				? "Часть выручки не отнесена к врачу: платёж не связан с приёмом. " +
					"Связь идёт через приём, у визита отдельного поля «врач» нет. " +
					"Чтобы выручка попадала врачу, оплату нужно оформлять из визита, созданного из записи в расписании."
				: "Вся выручка периода отнесена к врачам.",
		isEmpty: rows.length === 0 && unattributedRevenueRub === 0,
	};
}

/**
 * Занятость кресел.
 *
 * ПОЧЕМУ НЕ ПРОСТО «СЧЁТ ЗАПИСЕЙ». Существующий дашборд отдавал число записей
 * на кресло и подписывал это как загрузку. Тридцать коротких приёмов и десять
 * длинных дают одинаково бессмысленное сравнение. Здесь считаются занятые
 * минуты, а процент — от явно названной базы: рабочих дней в периоде на длину
 * рабочего дня.
 */
export async function chairLoad(
	scope: ReportScope,
	options: {
		readonly minutesPerDay?: number;
		readonly workingDaysPerWeek?: number;
	} = {},
): Promise<ChairLoadReport> {
	const minutesPerDay = Math.max(
		60,
		Math.min(24 * 60, options.minutesPerDay ?? 12 * 60),
	);
	const workingDaysPerWeek = Math.max(
		1,
		Math.min(7, options.workingDaysPerWeek ?? 6),
	);

	const rows = await db
		.select({
			chairId: appointments.chairId,
			appointments: sql<number>`count(*)::int`,
			bookedMinutes: sql<number>`coalesce(sum(extract(epoch from (${appointments.endsAt} - ${appointments.startsAt})) / 60), 0)::int`,
		})
		.from(appointments)
		.where(
			and(
				eq(appointments.organizationId, scope.organizationId),
				// Отменённые и неявки кресло не занимали.
				ne(appointments.status, "cancelled"),
				ne(appointments.status, "no_show"),
				gte(appointments.startsAt, scope.from),
				lte(appointments.startsAt, scope.to),
			),
		)
		.groupBy(appointments.chairId);

	const chairRows = await db
		.select({ id: chairs.id, name: chairs.name })
		.from(chairs)
		.where(eq(chairs.organizationId, scope.organizationId));
	const chairNames = new Map(chairRows.map((row) => [row.id, row.name]));

	const spanDays = Math.max(
		1,
		Math.ceil((scope.to.getTime() - scope.from.getTime()) / 86_400_000),
	);
	const workingDays = Math.max(
		1,
		Math.round((spanDays * workingDaysPerWeek) / 7),
	);
	const totalMinutesPerChair = workingDays * minutesPerDay;

	const result: ChairLoadRow[] = rows
		.map((row) => {
			const bookedMinutes = Number(row.bookedMinutes);
			return {
				chairId: row.chairId,
				chairName: row.chairId
					? (chairNames.get(row.chairId) ?? "Кресло вне списка")
					: "Без указания кресла",
				appointments: Number(row.appointments),
				bookedMinutes,
				// Записи без кресла нельзя отнести к занятости конкретного кресла.
				utilization: row.chairId
					? Math.min(1, bookedMinutes / totalMinutesPerChair)
					: null,
			};
		})
		.sort((left, right) => right.bookedMinutes - left.bookedMinutes);

	return {
		rows: result,
		basis: {
			workingDays,
			minutesPerDay,
			totalMinutesPerChair,
			note:
				`Знаменатель: ${workingDays} рабочих дн. × ${Math.round(minutesPerDay / 60)} ч. ` +
				"Отменённые приёмы и неявки в занятые минуты не входят.",
		},
		isEmpty: result.length === 0,
	};
}

export async function appointmentFunnel(
	scope: ReportScope,
): Promise<AppointmentFunnelReport> {
	const rows = await db
		.select({ status: appointments.status, total: sql<number>`count(*)::int` })
		.from(appointments)
		.where(
			and(
				eq(appointments.organizationId, scope.organizationId),
				gte(appointments.startsAt, scope.from),
				lte(appointments.startsAt, scope.to),
			),
		)
		.groupBy(appointments.status);

	const byStatus: Record<string, number> = {};
	let total = 0;
	for (const row of rows) {
		byStatus[row.status] = Number(row.total);
		total += Number(row.total);
	}

	const share = (value: number) => (total > 0 ? value / total : null);
	const arrived =
		(byStatus.arrived ?? 0) +
		(byStatus.in_treatment ?? 0) +
		(byStatus.completed ?? 0);
	const cancelled = byStatus.cancelled ?? 0;
	const noShow = byStatus.no_show ?? 0;

	return {
		byStatus,
		total,
		arrivalRate: share(arrived),
		completionRate: share(byStatus.completed ?? 0),
		cancellationRate: share(cancelled),
		noShowRate: share(noShow),
		lostAppointments: cancelled + noShow,
		isEmpty: total === 0,
	};
}

// ─── Эффект напоминаний ──────────────────────────────────────────────────────

/**
 * Ниже этого числа приёмов в группе разница долей — шум. Порог не статистический
 * критерий, а граница здравого смысла: на тридцати приёмах одна неявка меняет
 * долю на три процентных пункта, на трёх — на тридцать три.
 */
const RELIABLE_GROUP_SIZE = 30;

/**
 * Работают ли напоминания.
 *
 * ЧТО БЫЛО. В appointmentFunnel стоял комментарий «именно этот показатель
 * клиника может уменьшить напоминаниями, и именно его нужно смотреть до и
 * после» — а самого сравнения не было. Руководитель видел долю неявок и не мог
 * узнать, меняют ли её напоминания, за которые он платит по SMS.
 *
 * ПОЧЕМУ СРАВНИВАЮТСЯ ГРУППЫ, А НЕ ПЕРИОДЫ «ДО» И «ПОСЛЕ». История изменения
 * настроек в базе не хранится: момент включения напоминаний восстановить
 * нечем. Сравнение «месяц назад против этого месяца» приписало бы напоминаниям
 * заодно и сезон, и рекламу, и смену администратора. Сравнение внутри одного
 * периода от этого свободно.
 *
 * Приём считается напомненным, если хотя бы одно напоминание по нему получило
 * состояние «отправлено» или «доставлено». Подавленное и упавшее напоминание —
 * это НЕ напоминание: пациент его не видел.
 */
export async function reminderEffect(
	scope: ReportScope,
): Promise<ReminderEffectReport> {
	/*
	 * Связь приёма с напоминанием — через ключ повтора вида
	 * `reminder:<приём>:<часов>`: отдельной колонки под приём в очереди нет.
	 * Разбор ключа делается в SQL через split_part, а не в JavaScript, чтобы не
	 * тащить в память всю очередь клиники за период.
	 */
	const reminded = db.$with("reminded").as(
		db
			.select({
				appointmentId:
					sql<string>`split_part(${communicationOutbox.dedupeKey}, ':', 2)::uuid`.as(
						"appointment_id",
					),
			})
			.from(communicationOutbox)
			.where(
				and(
					eq(communicationOutbox.organizationId, scope.organizationId),
					sql`${communicationOutbox.dedupeKey} LIKE 'reminder:%'`,
					// Только то, что пациент реально мог увидеть.
					sql`${communicationOutbox.status} IN ('sent', 'delivered')`,
					// Ключ должен содержать корректный идентификатор: испорченная
					// строка не должна ронять весь отчёт приведением типа.
					sql`split_part(${communicationOutbox.dedupeKey}, ':', 2) ~ '^[0-9a-fA-F-]{36}$'`,
				),
			)
			.groupBy(sql`split_part(${communicationOutbox.dedupeKey}, ':', 2)`),
	);

	const rows = await db
		.with(reminded)
		.select({
			wasReminded:
				sql<boolean>`(${appointments.id} IN (SELECT appointment_id FROM reminded))`.as(
					"was_reminded",
				),
			status: appointments.status,
			total: sql<number>`count(*)::int`,
		})
		.from(appointments)
		.where(
			and(
				eq(appointments.organizationId, scope.organizationId),
				gte(appointments.startsAt, scope.from),
				lte(appointments.startsAt, scope.to),
			),
		)
		.groupBy(sql`was_reminded`, appointments.status);

	const empty = (): {
		appointments: number;
		completed: number;
		cancelled: number;
		noShow: number;
	} => ({
		appointments: 0,
		completed: 0,
		cancelled: 0,
		noShow: 0,
	});
	const tally = { reminded: empty(), notReminded: empty() };

	for (const row of rows) {
		const bucket = row.wasReminded ? tally.reminded : tally.notReminded;
		const count = Number(row.total);
		bucket.appointments += count;
		if (row.status === "completed") bucket.completed += count;
		if (row.status === "cancelled") bucket.cancelled += count;
		if (row.status === "no_show") bucket.noShow += count;
	}

	const finish = (bucket: ReturnType<typeof empty>): ReminderEffectGroup => {
		const lost = bucket.cancelled + bucket.noShow;
		return {
			...bucket,
			lost,
			lostRate: bucket.appointments > 0 ? lost / bucket.appointments : null,
		};
	};

	const remindedGroup = finish(tally.reminded);
	const notRemindedGroup = finish(tally.notReminded);
	const comparable =
		remindedGroup.lostRate !== null && notRemindedGroup.lostRate !== null;
	const smallestGroupSize = Math.min(
		remindedGroup.appointments,
		notRemindedGroup.appointments,
	);
	const enoughData = smallestGroupSize >= RELIABLE_GROUP_SIZE;

	const caveat = enoughData
		? "Это сравнение групп, а не доказательство причины: напоминание не уходит пациентам без телефона, " +
			"без согласия и записанным на сегодня, а они и без напоминаний приходят иначе."
		: `Данных мало: в меньшей группе ${smallestGroupSize} приём(ов), а разница становится осмысленной ` +
			`примерно от ${RELIABLE_GROUP_SIZE}. Одна неявка здесь меняет вывод на противоположный — ` +
			"смотрите на состав групп, а не на разницу долей.";

	return {
		reminded: remindedGroup,
		notReminded: notRemindedGroup,
		lostRateDifference: comparable
			? (notRemindedGroup.lostRate as number) -
				(remindedGroup.lostRate as number)
			: null,
		caveat,
		smallestGroupSize,
		enoughData,
		isEmpty: remindedGroup.appointments + notRemindedGroup.appointments === 0,
	};
}

/**
 * Загрузка по дням недели и часам. Нужна для решения, когда открывать смены и
 * куда ставить дополнительное кресло: «в среду с 10 до 13 очередь, а в субботу
 * пусто» из общей цифры за месяц не видно.
 */
export async function scheduleLoad(
	scope: ReportScope,
): Promise<ScheduleLoadReport> {
	/*
	 * ТЕПЛОВАЯ КАРТА СЧИТАЛАСЬ В ПОЯСЕ СЕССИИ POSTGRESQL, А НЕ КЛИНИКИ.
	 *
	 * `extract(isodow …)` и `extract(hour …)` для колонки с часовым поясом берут
	 * пояс СЕССИИ. Значит день недели и час приёма съезжали на всю величину
	 * смещения: вечерние приёмы уезжали на предыдущие сутки, а карта «когда
	 * открывать смены» советовала клинике не те часы. Для Камчатки это половина
	 * суток. Измерено прогоном на живой базе: один и тот же момент при
	 * `SET TIME ZONE 'UTC'` даёт isodow=3 hour=22, при `Europe/Samara` —
	 * isodow=4 hour=2, при `Asia/Kamchatka` — isodow=4 hour=10.
	 *
	 * Приведение делается только к поясу, который PostgreSQL знает: иначе
	 * `AT TIME ZONE` бросает 22023 и восемь рабочих отчётов руководителя
	 * превращаются в 500. Пояс неизвестен — поведение прежнее, и это честнее
	 * подставленного наугад московского.
	 */
	const zone = await postgresKnowsTimeZone(scope.timeZone);
	const localStart = inClinicZone(appointments.startsAt, zone);
	const rows = await db
		.select({
			weekday: sql<number>`extract(isodow from ${localStart})::int`,
			hour: sql<number>`extract(hour from ${localStart})::int`,
			appointments: sql<number>`count(*)::int`,
			bookedMinutes: sql<number>`coalesce(sum(extract(epoch from (${appointments.endsAt} - ${appointments.startsAt})) / 60), 0)::int`,
		})
		.from(appointments)
		.where(
			and(
				eq(appointments.organizationId, scope.organizationId),
				ne(appointments.status, "cancelled"),
				gte(appointments.startsAt, scope.from),
				lte(appointments.startsAt, scope.to),
			),
		)
		.groupBy(
			sql`extract(isodow from ${localStart})`,
			sql`extract(hour from ${localStart})`,
		);

	const cells: ScheduleLoadCell[] = rows
		.map((row) => ({
			weekday: Number(row.weekday),
			hour: Number(row.hour),
			appointments: Number(row.appointments),
			bookedMinutes: Number(row.bookedMinutes),
		}))
		.sort(
			(left, right) => left.weekday - right.weekday || left.hour - right.hour,
		);

	const byWeekday = new Map<number, number>();
	const byHour = new Map<number, number>();
	for (const cell of cells) {
		byWeekday.set(
			cell.weekday,
			(byWeekday.get(cell.weekday) ?? 0) + cell.bookedMinutes,
		);
		byHour.set(cell.hour, (byHour.get(cell.hour) ?? 0) + cell.bookedMinutes);
	}

	const peak = (source: Map<number, number>): number | null => {
		let best: number | null = null;
		let bestValue = -1;
		for (const [key, value] of source) {
			if (value > bestValue) {
				best = key;
				bestValue = value;
			}
		}
		return best;
	};

	return {
		cells,
		busiestWeekday: peak(byWeekday),
		busiestHour: peak(byHour),
		isEmpty: cells.length === 0,
	};
}
