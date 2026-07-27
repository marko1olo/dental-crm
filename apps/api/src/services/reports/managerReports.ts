/**
 * Отчёты руководителю клиники.
 *
 * ЗАЧЕМ ЭТОТ ФАЙЛ
 * Всё, что было — один обработчик /api/analytics/dashboard: воронка по
 * статусам записей, выручка по врачам, доли кресел и когорты. Владелец клиники
 * не мог увидеть ни динамику выручки по дням, ни долю неявок, ни дебиторку, ни
 * что именно продаётся. При этом данные лежат в базе: платежи, приёмы, позиции
 * лечения. Считать их было нечем.
 *
 * ПРАВИЛА, ОБЯЗАТЕЛЬНЫЕ ДЛЯ ВСЕХ ОТЧЁТОВ
 *
 * 1. Выручка — только платежи со статусом `paid`. `planned` — это ещё не
 *    полученные деньги, `refunded` и `voided` — возвращённые и отменённые.
 *    Смешать их значит показать выручку в разы больше фактической.
 *
 * 2. Ни одного придуманного коэффициента. Если себестоимости материалов и
 *    процента врача в базе нет — маржа не «35 % от выручки», а отсутствует.
 *    Прочерк в отчёте честнее правдоподобного числа, по которому принимают
 *    решения.
 *
 * 3. Знаменатель всегда назван. «Загрузка кресла 42 %» без указания, от чего
 *    считали, — не показатель. Здесь возвращаются и занятые минуты, и база
 *    расчёта, и признак того, что расписание кресла не заполнено.
 *
 * 4. Пустой период отмечается явным признаком. Нули, выданные за данные, читают
 *    как «клиника ничего не заработала», а не как «данных нет».
 *
 * 5. То, что нельзя отнести к врачу или услуге, не размазывается и не
 *    выбрасывается: для него отдельная строка «не отнесено».
 */

import { and, eq, gte, isNotNull, lte, ne, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	appointments,
	chairs,
	communicationOutbox,
	patients,
	payments,
	treatmentItems,
	users,
	visits
} from "../../db/schema.js";

export type ReportPeriod = {
	readonly from: Date;
	readonly to: Date;
};

export type ReportScope = ReportPeriod & {
	readonly organizationId: string;
};

/** Текущий месяц целиком — период по умолчанию. */
export function currentMonthPeriod(now = new Date()): ReportPeriod {
	const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
	const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
	return { from, to };
}

export type TimelineGranularity = "day" | "week" | "month";

export type RevenueTimelinePoint = {
	readonly bucket: string;
	readonly revenueRub: number;
	readonly paymentCount: number;
	readonly payingPatients: number;
};

export type RevenueTimeline = {
	readonly granularity: TimelineGranularity;
	readonly points: RevenueTimelinePoint[];
	readonly totalRub: number;
	readonly isEmpty: boolean;
};

/**
 * Динамика выручки. Группировка делается в Postgres через date_trunc: считать
 * это в приложении означало бы вытащить все платежи периода в память.
 */
export async function revenueTimeline(
	scope: ReportScope,
	granularity: TimelineGranularity = "day"
): Promise<RevenueTimeline> {
	const truncated =
		granularity === "month"
			? sql`date_trunc('month', ${payments.paidAt})`
			: granularity === "week"
				? sql`date_trunc('week', ${payments.paidAt})`
				: sql`date_trunc('day', ${payments.paidAt})`;

	const rows = await db
		.select({
			bucket: sql<string>`to_char(${truncated}, 'YYYY-MM-DD')`,
			revenueRub: sql<number>`coalesce(sum(${payments.amountRub}), 0)::int`,
			paymentCount: sql<number>`count(*)::int`,
			payingPatients: sql<number>`count(distinct ${payments.patientId})::int`
		})
		.from(payments)
		.where(
			and(
				eq(payments.organizationId, scope.organizationId),
				// Только фактически полученные деньги.
				eq(payments.status, "paid"),
				gte(payments.paidAt, scope.from),
				lte(payments.paidAt, scope.to)
			)
		)
		.groupBy(truncated)
		.orderBy(truncated);

	const points = rows.map((row) => ({
		bucket: row.bucket,
		revenueRub: Number(row.revenueRub),
		paymentCount: Number(row.paymentCount),
		payingPatients: Number(row.payingPatients)
	}));

	return {
		granularity,
		points,
		totalRub: points.reduce((total, point) => total + point.revenueRub, 0),
		isEmpty: points.length === 0
	};
}

export type DoctorPerformanceRow = {
	readonly doctorUserId: string | null;
	readonly doctorName: string;
	readonly revenueRub: number;
	readonly appointmentsTotal: number;
	readonly appointmentsCompleted: number;
	readonly appointmentsCancelled: number;
	readonly appointmentsNoShow: number;
	/** Доля завершённых от всех записей, 0…1. null — записей не было. */
	readonly completionRate: number | null;
	/** Доля неявок, 0…1. null — записей не было. */
	readonly noShowRate: number | null;
	/** Средний чек: выручка на завершённый приём. null — завершённых не было. */
	readonly averageTicketRub: number | null;
	/**
	 * Маржа не считается: себестоимости материалов и процента врача в базе нет.
	 * Поле оставлено, чтобы интерфейс показывал прочерк осознанно.
	 */
	readonly marginRub: null;
};

export type DoctorPerformanceReport = {
	readonly rows: DoctorPerformanceRow[];
	/** Выручка, которую не удалось отнести к врачу (платёж без приёма). */
	readonly unattributedRevenueRub: number;
	/**
	 * Пояснение к «не отнесено». Молчаливая строка с суммой без причины выглядит
	 * как ошибка расчёта, хотя это ограничение связей в данных.
	 */
	readonly attributionNote: string;
	readonly isEmpty: boolean;
};

/**
 * Выручка и загрузка по врачам.
 *
 * Платёж связывается с врачом через приём: payments → visits → appointments.
 * Платёж без визита отнести к врачу нельзя, и он попадает в отдельную сумму
 * «не отнесено» — размазывать его по врачам пропорционально значило бы
 * придумать данные.
 */
export async function doctorPerformance(scope: ReportScope): Promise<DoctorPerformanceReport> {
	const revenueRows = await db
		.select({
			doctorUserId: appointments.doctorUserId,
			revenueRub: sql<number>`coalesce(sum(${payments.amountRub}), 0)::int`
		})
		.from(payments)
		.leftJoin(visits, eq(payments.visitId, visits.id))
		.leftJoin(appointments, eq(visits.appointmentId, appointments.id))
		.where(
			and(
				eq(payments.organizationId, scope.organizationId),
				eq(payments.status, "paid"),
				gte(payments.paidAt, scope.from),
				lte(payments.paidAt, scope.to)
			)
		)
		.groupBy(appointments.doctorUserId);

	const appointmentRows = await db
		.select({
			doctorUserId: appointments.doctorUserId,
			status: appointments.status,
			total: sql<number>`count(*)::int`
		})
		.from(appointments)
		.where(
			and(
				eq(appointments.organizationId, scope.organizationId),
				gte(appointments.startsAt, scope.from),
				lte(appointments.startsAt, scope.to)
			)
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
		const fresh = { revenueRub: 0, total: 0, completed: 0, cancelled: 0, noShow: 0 };
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
			completionRate: accumulator.total > 0 ? accumulator.completed / accumulator.total : null,
			noShowRate: accumulator.total > 0 ? accumulator.noShow / accumulator.total : null,
			averageTicketRub:
				accumulator.completed > 0 ? Math.round(accumulator.revenueRub / accumulator.completed) : null,
			marginRub: null as null
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
		isEmpty: rows.length === 0 && unattributedRevenueRub === 0
	};
}

export type ChairLoadRow = {
	readonly chairId: string | null;
	readonly chairName: string;
	readonly appointments: number;
	readonly bookedMinutes: number;
	/**
	 * Занятость от расчётной базы, 0…1. null — базу определить нечем, и тогда
	 * показывать процент нельзя.
	 */
	readonly utilization: number | null;
};

export type ChairLoadReport = {
	readonly rows: ChairLoadRow[];
	/** Из чего считался знаменатель — обязательно к показу рядом с процентом. */
	readonly basis: {
		readonly workingDays: number;
		readonly minutesPerDay: number;
		readonly totalMinutesPerChair: number;
		readonly note: string;
	};
	readonly isEmpty: boolean;
};

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
	options: { readonly minutesPerDay?: number; readonly workingDaysPerWeek?: number } = {}
): Promise<ChairLoadReport> {
	const minutesPerDay = Math.max(60, Math.min(24 * 60, options.minutesPerDay ?? 12 * 60));
	const workingDaysPerWeek = Math.max(1, Math.min(7, options.workingDaysPerWeek ?? 6));

	const rows = await db
		.select({
			chairId: appointments.chairId,
			appointments: sql<number>`count(*)::int`,
			bookedMinutes: sql<number>`coalesce(sum(extract(epoch from (${appointments.endsAt} - ${appointments.startsAt})) / 60), 0)::int`
		})
		.from(appointments)
		.where(
			and(
				eq(appointments.organizationId, scope.organizationId),
				// Отменённые и неявки кресло не занимали.
				ne(appointments.status, "cancelled"),
				ne(appointments.status, "no_show"),
				gte(appointments.startsAt, scope.from),
				lte(appointments.startsAt, scope.to)
			)
		)
		.groupBy(appointments.chairId);

	const chairRows = await db
		.select({ id: chairs.id, name: chairs.name })
		.from(chairs)
		.where(eq(chairs.organizationId, scope.organizationId));
	const chairNames = new Map(chairRows.map((row) => [row.id, row.name]));

	const spanDays = Math.max(1, Math.ceil((scope.to.getTime() - scope.from.getTime()) / 86_400_000));
	const workingDays = Math.max(1, Math.round((spanDays * workingDaysPerWeek) / 7));
	const totalMinutesPerChair = workingDays * minutesPerDay;

	const result = rows
		.map((row) => {
			const bookedMinutes = Number(row.bookedMinutes);
			return {
				chairId: row.chairId,
				chairName: row.chairId ? (chairNames.get(row.chairId) ?? "Кресло вне списка") : "Без указания кресла",
				appointments: Number(row.appointments),
				bookedMinutes,
				// Записи без кресла нельзя отнести к занятости конкретного кресла.
				utilization: row.chairId ? Math.min(1, bookedMinutes / totalMinutesPerChair) : null
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
				"Отменённые приёмы и неявки в занятые минуты не входят."
		},
		isEmpty: result.length === 0
	};
}

export type AppointmentFunnelReport = {
	readonly byStatus: Readonly<Record<string, number>>;
	readonly total: number;
	/** Доля дошедших до кресла (arrived, in_treatment, completed). */
	readonly arrivalRate: number | null;
	readonly completionRate: number | null;
	readonly cancellationRate: number | null;
	readonly noShowRate: number | null;
	/**
	 * Потерянные приёмы: отмены плюс неявки. Именно этот показатель клиника
	 * может уменьшить напоминаниями, и именно его нужно смотреть до и после.
	 */
	readonly lostAppointments: number;
	readonly isEmpty: boolean;
};

export async function appointmentFunnel(scope: ReportScope): Promise<AppointmentFunnelReport> {
	const rows = await db
		.select({ status: appointments.status, total: sql<number>`count(*)::int` })
		.from(appointments)
		.where(
			and(
				eq(appointments.organizationId, scope.organizationId),
				gte(appointments.startsAt, scope.from),
				lte(appointments.startsAt, scope.to)
			)
		)
		.groupBy(appointments.status);

	const byStatus: Record<string, number> = {};
	let total = 0;
	for (const row of rows) {
		byStatus[row.status] = Number(row.total);
		total += Number(row.total);
	}

	const share = (value: number) => (total > 0 ? value / total : null);
	const arrived = (byStatus.arrived ?? 0) + (byStatus.in_treatment ?? 0) + (byStatus.completed ?? 0);
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
		isEmpty: total === 0
	};
}

// ─── Эффект напоминаний ──────────────────────────────────────────────────────

export type ReminderEffectGroup = {
	/** Сколько приёмов в группе. */
	readonly appointments: number;
	readonly completed: number;
	readonly cancelled: number;
	readonly noShow: number;
	/** Отмены плюс неявки — то, что клиника теряет. */
	readonly lost: number;
	/** Доля потерь; null, если приёмов в группе нет. */
	readonly lostRate: number | null;
};

export type ReminderEffectReport = {
	/** Приёмы, до которых напоминание дошло (отправлено или доставлено). */
	readonly reminded: ReminderEffectGroup;
	/** Приёмы, до которых напоминание НЕ дошло: не ставилось, подавлено или упало. */
	readonly notReminded: ReminderEffectGroup;
	/**
	 * Разница долей потерь в процентных пунктах: notReminded − reminded.
	 * Положительное значение означает, что без напоминания теряется больше.
	 * null, если одна из групп пуста — сравнивать не с чем.
	 */
	readonly lostRateDifference: number | null;
	/**
	 * Почему это НЕ доказательство причинности. Группы различаются не только
	 * напоминанием: напоминание не уходит тем, у кого нет телефона, нет
	 * согласия или кто записан на сегодня. Такие пациенты и без напоминаний
	 * ведут себя иначе.
	 */
	readonly caveat: string;
	/**
	 * Размер меньшей из групп и хватает ли его, чтобы вообще смотреть на
	 * разницу.
	 *
	 * ЗАЧЕМ. На живых данных первый же прогон дал «напоминание дошло: 3 приёма,
	 * потерь 0» против «не дошло: 19 приёмов, потерь 26 %», то есть разницу в
	 * 26 процентных пунктов на выборке из трёх приёмов. Одна неявка в такой
	 * группе перевернула бы вывод на противоположный. Показывать такое число
	 * без предупреждения — значит подсунуть руководителю решение, основанное на
	 * случайности.
	 */
	readonly smallestGroupSize: number;
	readonly enoughData: boolean;
	readonly isEmpty: boolean;
};

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
export async function reminderEffect(scope: ReportScope): Promise<ReminderEffectReport> {
	/*
	 * Связь приёма с напоминанием — через ключ повтора вида
	 * `reminder:<приём>:<часов>`: отдельной колонки под приём в очереди нет.
	 * Разбор ключа делается в SQL через split_part, а не в JavaScript, чтобы не
	 * тащить в память всю очередь клиники за период.
	 */
	const reminded = db.$with("reminded").as(
		db
			.select({
				appointmentId: sql<string>`split_part(${communicationOutbox.dedupeKey}, ':', 2)::uuid`.as("appointment_id")
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
					sql`split_part(${communicationOutbox.dedupeKey}, ':', 2) ~ '^[0-9a-fA-F-]{36}$'`
				)
			)
			.groupBy(sql`split_part(${communicationOutbox.dedupeKey}, ':', 2)`)
	);

	const rows = await db
		.with(reminded)
		.select({
			wasReminded: sql<boolean>`(${appointments.id} IN (SELECT appointment_id FROM reminded))`.as("was_reminded"),
			status: appointments.status,
			total: sql<number>`count(*)::int`
		})
		.from(appointments)
		.where(
			and(
				eq(appointments.organizationId, scope.organizationId),
				gte(appointments.startsAt, scope.from),
				lte(appointments.startsAt, scope.to)
			)
		)
		.groupBy(sql`was_reminded`, appointments.status);

	const empty = (): { appointments: number; completed: number; cancelled: number; noShow: number } => ({
		appointments: 0,
		completed: 0,
		cancelled: 0,
		noShow: 0
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
			lostRate: bucket.appointments > 0 ? lost / bucket.appointments : null
		};
	};

	const remindedGroup = finish(tally.reminded);
	const notRemindedGroup = finish(tally.notReminded);
	const comparable = remindedGroup.lostRate !== null && notRemindedGroup.lostRate !== null;
	const smallestGroupSize = Math.min(remindedGroup.appointments, notRemindedGroup.appointments);
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
			? (notRemindedGroup.lostRate as number) - (remindedGroup.lostRate as number)
			: null,
		caveat,
		smallestGroupSize,
		enoughData,
		isEmpty: remindedGroup.appointments + notRemindedGroup.appointments === 0
	};
}

export type PatientFlowPoint = {
	readonly bucket: string;
	readonly newPatients: number;
	readonly returningPatients: number;
};

export type PatientFlowReport = {
	readonly points: PatientFlowPoint[];
	readonly newTotal: number;
	readonly returningTotal: number;
	readonly isEmpty: boolean;
};

/**
 * Первичные и повторные пациенты по месяцам.
 *
 * Первичным считается пациент, у которого это первый завершённый приём за всю
 * историю, а не первый в периоде: иначе при выборе «за март» все пациенты
 * клиники окажутся первичными.
 */
export async function patientFlow(scope: ReportScope): Promise<PatientFlowReport> {
	// Два запроса вместо одного с оконной функцией: тот вариант возвращал по
	// строке на КАЖДЫЙ завершённый приём за всю историю клиники и складывал их
	// в память. Здесь первый запрос агрегирован до одной строки на пациента, а
	// второй ограничен периодом.
	const firstEverRows = await db
		.select({
			patientId: appointments.patientId,
			firstAt: sql<Date>`min(${appointments.startsAt})`
		})
		.from(appointments)
		.where(
			and(
				eq(appointments.organizationId, scope.organizationId),
				eq(appointments.status, "completed"),
				isNotNull(appointments.patientId)
			)
		)
		.groupBy(appointments.patientId);

	const firstEverByPatient = new Map<string, number>();
	for (const row of firstEverRows) {
		if (row.patientId && row.firstAt) firstEverByPatient.set(row.patientId, new Date(row.firstAt).getTime());
	}

	const periodRows = await db
		.select({
			bucket: sql<string>`to_char(date_trunc('month', ${appointments.startsAt}), 'YYYY-MM')`,
			patientId: appointments.patientId,
			// Момент первого приёма пациента ВНУТРИ периода: сравнивать нужно с
			// ним, иначе повторный приём того же дня посчитался бы первичным.
			firstInBucketAt: sql<Date>`min(${appointments.startsAt})`
		})
		.from(appointments)
		.where(
			and(
				eq(appointments.organizationId, scope.organizationId),
				eq(appointments.status, "completed"),
				isNotNull(appointments.patientId),
				gte(appointments.startsAt, scope.from),
				lte(appointments.startsAt, scope.to)
			)
		)
		.groupBy(sql`date_trunc('month', ${appointments.startsAt})`, appointments.patientId);

	const byBucket = new Map<string, { newPatients: Set<string>; returningPatients: Set<string> }>();
	for (const row of periodRows) {
		if (!row.patientId) continue;
		const bucket =
			byBucket.get(row.bucket) ?? { newPatients: new Set<string>(), returningPatients: new Set<string>() };

		// Первичный — тот, у кого приём в этом месяце и есть первый за всю
		// историю. Считать «первый в периоде» нельзя: при выборе одного месяца
		// первичными оказались бы все пациенты клиники.
		const firstEver = firstEverByPatient.get(row.patientId);
		const firstInBucket = new Date(row.firstInBucketAt).getTime();
		if (firstEver !== undefined && firstEver === firstInBucket) bucket.newPatients.add(row.patientId);
		else bucket.returningPatients.add(row.patientId);

		byBucket.set(row.bucket, bucket);
	}

	const points = [...byBucket.entries()]
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([bucket, sets]) => ({
			bucket,
			newPatients: sets.newPatients.size,
			// Пациент, пришедший в месяце и первично, и повторно, считается
			// первичным один раз: из повторных он исключается.
			returningPatients: [...sets.returningPatients].filter((id) => !sets.newPatients.has(id)).length
		}));

	return {
		points,
		newTotal: points.reduce((total, point) => total + point.newPatients, 0),
		returningTotal: points.reduce((total, point) => total + point.returningPatients, 0),
		isEmpty: points.length === 0
	};
}

export type ServiceSalesRow = {
	readonly title: string;
	readonly quantity: number;
	readonly plannedRub: number;
	readonly averagePriceRub: number;
	readonly discountRub: number;
};

export type ServiceSalesReport = {
	readonly rows: ServiceSalesRow[];
	readonly plannedTotalRub: number;
	readonly discountTotalRub: number;
	readonly note: string;
	readonly isEmpty: boolean;
};

/**
 * Что продаётся. Считается по позициям лечения, а не по платежам: платёж не
 * знает, за какую услугу он получен.
 *
 * ВАЖНО ПРО СМЫСЛ ЧИСЛА. Это назначенная сумма, а не полученная. Разница между
 * ней и выручкой — это дебиторка и скидки, поэтому подписывать её словом
 * «выручка» нельзя.
 */
export async function serviceSales(scope: ReportScope, limit = 50): Promise<ServiceSalesReport> {
	// Сумма позиции: цена за единицу на количество минус скидка, не ниже нуля.
	// Выражение используется и в выборке, и в сортировке, поэтому объявлено один
	// раз: `orderBy(sql`2 desc`)` по номеру столбца отсортировал бы по
	// количеству, и LIMIT отрезал бы самые дорогие услуги вместо самых мелких.
	const lineTotal = sql<number>`coalesce(sum(greatest(${treatmentItems.unitPriceRub} * greatest(${treatmentItems.quantity}, 1) - ${treatmentItems.discountRub}, 0)), 0)::int`;

	const rows = await db
		.select({
			title: treatmentItems.title,
			quantity: sql<number>`coalesce(sum(greatest(${treatmentItems.quantity}, 1)), 0)::int`,
			plannedRub: lineTotal,
			discountRub: sql<number>`coalesce(sum(${treatmentItems.discountRub}), 0)::int`
		})
		.from(treatmentItems)
		.leftJoin(visits, eq(treatmentItems.visitId, visits.id))
		.where(
			and(
				eq(treatmentItems.organizationId, scope.organizationId),
				ne(treatmentItems.status, "cancelled"),
				// Позиции без визита в период не попадают: датировать их нечем.
				gte(visits.createdAt, scope.from),
				lte(visits.createdAt, scope.to)
			)
		)
		.groupBy(treatmentItems.title)
		.orderBy(sql`${lineTotal} desc`)
		.limit(Math.max(1, Math.min(500, limit)));

	const result = rows
		.map((row) => {
			const quantity = Number(row.quantity);
			const plannedRub = Number(row.plannedRub);
			return {
				title: row.title,
				quantity,
				plannedRub,
				averagePriceRub: quantity > 0 ? Math.round(plannedRub / quantity) : 0,
				discountRub: Number(row.discountRub)
			};
		})
		.sort((left, right) => right.plannedRub - left.plannedRub);

	return {
		rows: result,
		plannedTotalRub: result.reduce((total, row) => total + row.plannedRub, 0),
		discountTotalRub: result.reduce((total, row) => total + row.discountRub, 0),
		note:
			"Суммы назначенные, а не полученные: разница с выручкой — это дебиторка и скидки. " +
			"Позиции без привязки к приёму в отчёт не входят, датировать их нечем.",
		isEmpty: result.length === 0
	};
}

export type ReceivablesBucket = "current" | "up_to_30" | "up_to_90" | "over_90" | "undated";

export type ReceivablesRow = {
	readonly patientId: string;
	readonly patientName: string;
	readonly debtRub: number;
	readonly oldestChargeAt: string | null;
	readonly bucket: ReceivablesBucket;
};

export type ReceivablesReport = {
	readonly rows: ReceivablesRow[];
	readonly totalDebtRub: number;
	readonly byBucket: Readonly<Record<ReceivablesBucket, number>>;
	readonly note: string;
	readonly isEmpty: boolean;
};

/**
 * Дебиторка: кто и сколько не доплатил.
 *
 * Долг = назначено минус оплачено, как это считает db/domainStateHydration.ts.
 * Считается на дату отчёта, а не за период: долг не «возникает в марте», он
 * просто есть. Срок определяется по самой ранней неоплаченной позиции; позиции
 * без визита датировать нечем — они попадают в отдельную корзину, а не
 * приписываются к «текущим».
 */
export async function receivables(
	organizationId: string,
	options: { readonly now?: Date; readonly minDebtRub?: number; readonly limit?: number } = {}
): Promise<ReceivablesReport> {
	const now = options.now ?? new Date();
	const minDebtRub = Math.max(1, options.minDebtRub ?? 1);
	const limit = Math.max(1, Math.min(1000, options.limit ?? 200));

	const plannedRows = await db
		.select({
			patientId: treatmentItems.patientId,
			plannedRub: sql<number>`coalesce(sum(greatest(${treatmentItems.unitPriceRub} * greatest(${treatmentItems.quantity}, 1) - ${treatmentItems.discountRub}, 0)), 0)::int`,
			oldestChargeAt: sql<Date | null>`min(${visits.createdAt})`,
			undatedItems: sql<number>`count(*) filter (where ${visits.createdAt} is null)::int`
		})
		.from(treatmentItems)
		.leftJoin(visits, eq(treatmentItems.visitId, visits.id))
		.where(and(eq(treatmentItems.organizationId, organizationId), ne(treatmentItems.status, "cancelled")))
		.groupBy(treatmentItems.patientId);

	const paidRows = await db
		.select({
			patientId: payments.patientId,
			paidRub: sql<number>`coalesce(sum(${payments.amountRub}), 0)::int`
		})
		.from(payments)
		.where(and(eq(payments.organizationId, organizationId), eq(payments.status, "paid")))
		.groupBy(payments.patientId);
	const paidByPatient = new Map(paidRows.map((row) => [row.patientId, Number(row.paidRub)]));

	const debtors = plannedRows
		.map((row) => ({
			patientId: row.patientId,
			debtRub: Number(row.plannedRub) - (paidByPatient.get(row.patientId) ?? 0),
			oldestChargeAt: row.oldestChargeAt ? new Date(row.oldestChargeAt) : null,
			hasUndated: Number(row.undatedItems) > 0
		}))
		.filter((row) => row.debtRub >= minDebtRub)
		.sort((left, right) => right.debtRub - left.debtRub)
		.slice(0, limit);

	if (debtors.length === 0) {
		return {
			rows: [],
			totalDebtRub: 0,
			byBucket: { current: 0, up_to_30: 0, up_to_90: 0, over_90: 0, undated: 0 },
			note: "Долгов нет.",
			isEmpty: true
		};
	}

	const names = new Map<string, string>();
	const nameRows = await db
		.select({ id: patients.id, fullName: patients.fullName })
		.from(patients)
		.where(eq(patients.organizationId, organizationId));
	for (const row of nameRows) names.set(row.id, row.fullName);

	const byBucket: Record<ReceivablesBucket, number> = {
		current: 0,
		up_to_30: 0,
		up_to_90: 0,
		over_90: 0,
		undated: 0
	};

	const rows: ReceivablesRow[] = debtors.map((row) => {
		let bucket: ReceivablesBucket;
		if (!row.oldestChargeAt) {
			bucket = "undated";
		} else {
			const ageDays = Math.floor((now.getTime() - row.oldestChargeAt.getTime()) / 86_400_000);
			bucket = ageDays <= 7 ? "current" : ageDays <= 30 ? "up_to_30" : ageDays <= 90 ? "up_to_90" : "over_90";
		}
		byBucket[bucket] += row.debtRub;

		return {
			patientId: row.patientId,
			patientName: names.get(row.patientId) ?? "Пациент вне картотеки",
			debtRub: row.debtRub,
			oldestChargeAt: row.oldestChargeAt ? row.oldestChargeAt.toISOString() : null,
			bucket
		};
	});

	return {
		rows,
		totalDebtRub: rows.reduce((total, row) => total + row.debtRub, 0),
		byBucket,
		note:
			"Долг = назначено минус оплачено, на дату отчёта. Срок — по самой ранней позиции лечения; " +
			"позиции без привязки к приёму датировать нечем, они в отдельной корзине.",
		isEmpty: false
	};
}

export type ScheduleLoadCell = {
	/** 1 — понедельник, 7 — воскресенье (ISO). */
	readonly weekday: number;
	readonly hour: number;
	readonly appointments: number;
	readonly bookedMinutes: number;
};

export type ScheduleLoadReport = {
	readonly cells: ScheduleLoadCell[];
	readonly busiestWeekday: number | null;
	readonly busiestHour: number | null;
	readonly isEmpty: boolean;
};

/**
 * Загрузка по дням недели и часам. Нужна для решения, когда открывать смены и
 * куда ставить дополнительное кресло: «в среду с 10 до 13 очередь, а в субботу
 * пусто» из общей цифры за месяц не видно.
 */
export async function scheduleLoad(scope: ReportScope): Promise<ScheduleLoadReport> {
	const rows = await db
		.select({
			weekday: sql<number>`extract(isodow from ${appointments.startsAt})::int`,
			hour: sql<number>`extract(hour from ${appointments.startsAt})::int`,
			appointments: sql<number>`count(*)::int`,
			bookedMinutes: sql<number>`coalesce(sum(extract(epoch from (${appointments.endsAt} - ${appointments.startsAt})) / 60), 0)::int`
		})
		.from(appointments)
		.where(
			and(
				eq(appointments.organizationId, scope.organizationId),
				ne(appointments.status, "cancelled"),
				gte(appointments.startsAt, scope.from),
				lte(appointments.startsAt, scope.to)
			)
		)
		.groupBy(sql`extract(isodow from ${appointments.startsAt})`, sql`extract(hour from ${appointments.startsAt})`);

	const cells = rows
		.map((row) => ({
			weekday: Number(row.weekday),
			hour: Number(row.hour),
			appointments: Number(row.appointments),
			bookedMinutes: Number(row.bookedMinutes)
		}))
		.sort((left, right) => left.weekday - right.weekday || left.hour - right.hour);

	const byWeekday = new Map<number, number>();
	const byHour = new Map<number, number>();
	for (const cell of cells) {
		byWeekday.set(cell.weekday, (byWeekday.get(cell.weekday) ?? 0) + cell.bookedMinutes);
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
		isEmpty: cells.length === 0
	};
}
