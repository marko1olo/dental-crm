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

import { sumKopecks } from "@dental/shared";
import { and, eq, gte, isNotNull, lte, ne, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	appointments,
	chairs,
	clinics,
	communicationOutbox,
	patients,
	payments,
	treatmentItems,
	users,
	visits
} from "../../db/schema.js";
import { type Kopecks, rublesFromKopecks, toKopecks } from "../../money/patientDebt.js";

export type ReportPeriod = {
	readonly from: Date;
	readonly to: Date;
};

export type ReportScope = ReportPeriod & {
	readonly organizationId: string;
	/**
	 * Часовой пояс клиники. Нужен там, где группировка делается в PostgreSQL:
	 * `date_trunc` и `extract` считают в поясе СЕССИИ, а не клиники.
	 *
	 * Необязателен намеренно: без него поведение прежнее, и ни один вызывающий
	 * не ломается. Отсутствие пояса — не ошибка, а «неизвестно»; выдумывать
	 * московский за клинику нельзя.
	 */
	readonly timeZone?: string | null;
};

/**
 * ПОЯС, КОТОРЫЙ POSTGRESQL ЗНАЕТ. Иначе `AT TIME ZONE` бросает 22023
 * (`time zone "…" not recognized`) и отчёт превращается в 500.
 *
 * Проверять обязательно: `clinics.timezone` — свободный текст со значением по
 * умолчанию `Europe/Samara`, без ограничения на список
 * (`apps/api/src/db/schema.ts:298`). Единственная проверка при записи —
 * `timeZoneSchema` в общем пакете, и она спрашивает ICU, а не PostgreSQL:
 * `pg_timezone_names` знает 598 имён, набор ICU другой. Значит имя, принятое
 * при записи, здесь может оказаться неизвестным.
 *
 * Ответ кэшируется на процесс: список поясов внутри одной версии сервера не
 * меняется, а отчёты зовут это на каждый запрос.
 */
/**
 * ЧАСОВОЙ ПОЯС КЛИНИКИ, ОДИН НА ПРОЕКТ. `null` — определить не удалось.
 *
 * ЖИВЁТ ЗДЕСЬ, А НЕ В МАРШРУТЕ, потому что нужен уже двум разным маршрутам:
 * отчётам руководителя и выплатам врачам. Вторая копия этой функции стала бы
 * вторым источником истины о поясе клиники — ровно та болезнь, из которой в этом
 * проекте выросли четыре разных расчёта долга.
 *
 * Отказ базы не роняет отчёт: пояс неизвестен, и вызывающий работает как раньше.
 * Выдумывать московский за клинику нельзя — в базе пояс по умолчанию
 * Europe/Samara, и подстановка сдвинула бы границы месяца на час.
 */
/**
 * Фрагмент «в поясе клиники» для группировки в PostgreSQL.
 *
 * ПОЧЕМУ ИМЯ ПОЯСА ВСТАВЛЯЕТСЯ ЛИТЕРАЛОМ, А НЕ ПАРАМЕТРОМ. Через параметр
 * (`AT TIME ZONE $1`) выражение в SELECT и в GROUP BY получает РАЗНЫЕ номера
 * ($1 и $6), PostgreSQL считает их разными выражениями и отвергает запрос —
 * «column must appear in the GROUP BY clause». Именно так моя первая редакция
 * этой правки уронила отчёты в 500, и поймал это набор, а не рассуждение.
 *
 * ЛИТЕРАЛ ЗДЕСЬ БЕЗОПАСЕН, и это не «доверимся». Значение приходит только из
 * postgresKnowsTimeZone, то есть уже НАЙДЕНО в собственном каталоге
 * pg_timezone_names этого же сервера. Плюс форма имени сверяется ниже: буквы,
 * цифры, подчёркивание, плюс, минус и косая черта. Что не прошло — не
 * подставляется вовсе, и группировка остаётся в поясе сессии, как раньше.
 */
const TIME_ZONE_NAME_SHAPE = /^[A-Za-z0-9_+/-]+$/;

export function inClinicZone(column: unknown, zone: string | null) {
	if (!zone || !TIME_ZONE_NAME_SHAPE.test(zone)) return sql`${column}`;
	return sql`(${column} AT TIME ZONE ${sql.raw(`'${zone}'`)})`;
}

export async function clinicTimeZone(organizationId: string): Promise<string | null> {
	try {
		const [clinic] = await db
			.select({ timezone: clinics.timezone })
			.from(clinics)
			.where(eq(clinics.organizationId, organizationId))
			.limit(1);
		return clinic?.timezone ?? null;
	} catch {
		return null;
	}
}

const knownTimeZoneCache = new Map<string, boolean>();

export async function postgresKnowsTimeZone(timeZone: string | null | undefined): Promise<string | null> {
	if (!timeZone) return null;
	const cached = knownTimeZoneCache.get(timeZone);
	if (cached !== undefined) return cached ? timeZone : null;
	try {
		const found = await db.execute(
			sql`select 1 as ok from pg_timezone_names where name = ${timeZone} limit 1`
		);
		const known = found.rows.length > 0;
		knownTimeZoneCache.set(timeZone, known);
		return known ? timeZone : null;
	} catch {
		// До базы не дошли — считаем пояс неизвестным и работаем как раньше.
		// Ронять отчёт из-за неудачной сверки списка поясов нельзя.
		return null;
	}
}

/**
 * Смещение пояса в миллисекундах для заданного мгновения. `null` — пояса не
 * существует. Готовой функции «местное время → мгновение» в стандартной
 * библиотеке нет, поэтому смещение снимается форматированием.
 */
function zoneOffsetMsAt(timeZone: string, instantMs: number): number | null {
	try {
		const parts = new Map(
			new Intl.DateTimeFormat("en-CA", {
				timeZone,
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
				hour12: false
			})
				.formatToParts(new Date(instantMs))
				.map((part) => [part.type, part.value])
		);
		const year = Number(parts.get("year"));
		const month = Number(parts.get("month"));
		const day = Number(parts.get("day"));
		// hour12: false может отдать 24 для полуночи — приводим к 0.
		const hour = Number(parts.get("hour")) % 24;
		const minute = Number(parts.get("minute"));
		const second = Number(parts.get("second"));
		if (![year, month, day, hour, minute, second].every((value) => Number.isFinite(value))) return null;
		// Показания часов пояса, прочитанные как UTC, минус само мгновение — это и
		// есть смещение. Миллисекунды в вывод не входят, поэтому мгновение
		// усекается до секунды.
		return Date.UTC(year, month - 1, day, hour, minute, second, 0) - Math.floor(instantMs / 1000) * 1000;
	} catch {
		return null;
	}
}

/**
 * Мгновение, в которое часы пояса показывают заданное местное время.
 *
 * Смещение снимается дважды: первый замер делается в точке, сдвинутой на
 * неизвестное ещё смещение, и у границы перехода на зимнее время он даёт
 * смещение ДРУГОЙ стороны границы. Уточняющий повторный замер — тот же приём,
 * что уже применён в `routes/publicBooking.ts:153-226`.
 */
export function instantOfLocalTime(
	timeZone: string,
	year: number,
	month: number,
	day: number
): number | null {
	const asIfUtc = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
	const firstOffset = zoneOffsetMsAt(timeZone, asIfUtc);
	if (firstOffset === null) return null;
	const candidate = asIfUtc - firstOffset;
	const refinedOffset = zoneOffsetMsAt(timeZone, candidate);
	if (refinedOffset === null) return null;
	return refinedOffset === firstOffset ? candidate : asIfUtc - refinedOffset;
}

/** Год и месяц, которые показывает календарь пояса. `null` — пояса не существует. */
function calendarMonthInTimeZone(timeZone: string, now: Date): { year: number; month: number } | null {
	try {
		const parts = new Map(
			new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
				.formatToParts(now)
				.map((part) => [part.type, part.value])
		);
		const year = Number(parts.get("year"));
		const month = Number(parts.get("month"));
		if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
		return { year, month };
	} catch {
		return null;
	}
}

/**
 * ТЕКУЩИЙ МЕСЯЦ ЦЕЛИКОМ — ПЕРИОД ПО УМОЛЧАНИЮ, В ПОЯСЕ КЛИНИКИ.
 *
 * ЧТО БЫЛО СЛОМАНО. Границы месяца брались через `now.getFullYear()` /
 * `now.getMonth()`, то есть в поясе ПРОЦЕССА сервера. Считать календарную дату
 * обязан тот, кто знает пояс клиники (`clinics.timezone`, схема допускает любой
 * IANA-пояс и по умолчанию ставит `Europe/Samara`).
 *
 * ЧЕМ ЭТО ПЛОХО ДЛЯ КЛИНИКИ. Пока пояс сервера совпадает с поясом клиники,
 * расчёт случайно верен. Как только они расходятся, месяц отчёта съезжает:
 *   сервер UTC, клиника Самара (+4) — первые 4 часа 1-го числа попадают в
 *   ПРЕДЫДУЩИЙ месяц: выручка ночной смены уходит в закрытый период;
 *   сервер Самара (+4), клиника Москва (+3) — последний час 31-го числа
 *   попадает в СЛЕДУЮЩИЙ месяц.
 * Руководитель сверяет отчёт с кассой и не находит расхождения: суммы
 * правдоподобны, а месяц не тот.
 *
 * ИЗМЕРЕНО на этом хосте: пояс процесса Node и сессии PostgreSQL — оба
 * `Europe/Samara`, поэтому для клиники по умолчанию дефект здесь и сейчас НЕ
 * проявляется. Он проявляется при переносе на сервер в другом поясе и у любой
 * клиники, чей пояс отличается от серверного. Это дефект развёртывания, а не
 * ежедневный, и выдавать его за второе нельзя.
 *
 * Пояс неизвестен или не разобран — прежнее поведение: границы в поясе сервера.
 * Отчёт обязан вернуть какой-то период, отказ здесь хуже приблизительного ответа.
 */
export function currentMonthPeriod(now = new Date(), timeZone?: string | null): ReportPeriod {
	if (timeZone) {
		const calendar = calendarMonthInTimeZone(timeZone, now);
		if (calendar) {
			const monthStart = instantOfLocalTime(timeZone, calendar.year, calendar.month, 1);
			// Начало следующего месяца минус миллисекунда: конец периода включающий
			// (`lte`), а длину месяца так считать не нужно вообще.
			const nextMonthStart = instantOfLocalTime(
				timeZone,
				calendar.month === 12 ? calendar.year + 1 : calendar.year,
				calendar.month === 12 ? 1 : calendar.month + 1,
				1
			);
			if (monthStart !== null && nextMonthStart !== null) {
				return { from: new Date(monthStart), to: new Date(nextMonthStart - 1) };
			}
		}
	}

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
	/*
	 * ДЕНЬ ВЫРУЧКИ СЧИТАЛСЯ В ПОЯСЕ СЕССИИ POSTGRESQL, А НЕ КЛИНИКИ.
	 *
	 * `date_trunc` для колонки с часовым поясом группирует по поясу СЕССИИ. Значит
	 * вечерняя оплата уезжала в предыдущий день: касса за смену не сходилась с
	 * кассой в динамике, и администратор искал недостачу там, где её нет. Величина
	 * разъезда равна смещению пояса — четыре часа для Самары, двенадцать для
	 * Камчатки; измерено прямым запросом при починке тепловой карты смен.
	 *
	 * Тот же приём, что и там: приведение только к поясу, который PostgreSQL знает,
	 * иначе AT TIME ZONE бросает 22023 и отчёт превращается в 500.
	 */
	const zone = await postgresKnowsTimeZone(scope.timeZone);
	const localPaidAt = inClinicZone(payments.paidAt, zone);
	const truncated =
		granularity === "month"
			? sql`date_trunc('month', ${localPaidAt})`
			: granularity === "week"
				? sql`date_trunc('week', ${localPaidAt})`
				: sql`date_trunc('day', ${localPaidAt})`;

	const rows = await db
		.select({
			bucket: sql<string>`to_char(${truncated}, 'YYYY-MM-DD')`,
			revenueRub: sql<number>`coalesce(sum(${payments.amountRub}), 0)::numeric(12,2)`,
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
			revenueRub: sql<number>`coalesce(sum(${payments.amountRub}), 0)::numeric(12,2)`
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
	/*
	 * МЕСЯЦ ВОРОНКИ СЧИТАЛСЯ В ПОЯСЕ СЕССИИ POSTGRESQL, А НЕ КЛИНИКИ.
	 *
	 * `date_trunc('month', …)` для колонки с часовым поясом режет месяц по поясу
	 * СЕССИИ. Значит вечерний приём последнего дня месяца уезжал в СЛЕДУЮЩИЙ
	 * месяц, а первый приём пациента вместе с ним: клиника видела первичного не
	 * в том месяце, когда он пришёл. Отчёт «сколько новых пациентов дал июнь»
	 * недосчитывал их и дарил июлю, и по этим числам оценивают рекламу.
	 *
	 * ИЗМЕРЕНО на живой базе: приём 30 июня 23:30 по Москве при поясе сессии
	 * Europe/Samara попадает в 2026-07, в поясе клиники — в 2026-06. Пояс режет
	 * и ГРУППИРОВКУ: те же два приёма в поясе сессии дают одну корзину 2026-07,
	 * в поясе клиники — две (2026-06 и 2026-07).
	 *
	 * Приведение делается только к поясу, который PostgreSQL знает: иначе
	 * `AT TIME ZONE` бросает 22023 и восемь рабочих отчётов руководителя
	 * превращаются в 500. Пояс неизвестен — поведение прежнее.
	 *
	 * Выражение месяца объявлено ОДИН раз и используется и в SELECT, и в
	 * GROUP BY. Через два отдельных фрагмента имя пояса ушло бы параметром
	 * дважды и получило РАЗНЫЕ номера ($1 в SELECT и $6 в GROUP BY) —
	 * PostgreSQL считает их разными выражениями и отвергает запрос целиком.
	 * Именно так уже дважды падала в 500 тепловая карта смен.
	 */
	const zone = await postgresKnowsTimeZone(scope.timeZone);
	const monthBucket = sql`date_trunc('month', ${inClinicZone(appointments.startsAt, zone)})`;

	// Два запроса вместо одного с оконной функцией: тот вариант возвращал по
	// строке на КАЖДЫЙ завершённый приём за всю историю клиники и складывал их
	// в память. Здесь первый запрос агрегирован до одной строки на пациента, а
	// второй ограничен периодом.
	const firstEverQuery = db
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

	const periodQuery = db
		.select({
			bucket: sql<string>`to_char(${monthBucket}, 'YYYY-MM')`,
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
		.groupBy(monthBucket, appointments.patientId);

	const [firstEverRows, periodRows] = await Promise.all([firstEverQuery, periodQuery]);

	const firstEverByPatient = new Map<string, number>();
	for (const row of firstEverRows) {
		if (row.patientId && row.firstAt) firstEverByPatient.set(row.patientId, new Date(row.firstAt).getTime());
	}

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
	/*
	 * Было `::int`. Количество объявлено numeric(10,2), а цена с миграции 0135
	 * хранится с копейками: приведение к целому округляло итог по услуге.
	 * Проверено на базе: половина услуги за 6 805,50 ₽ давала в отчёте 3 403
	 * вместо 3 402,75.
	 */
	const lineTotal = sql<number>`coalesce(sum(greatest(${treatmentItems.unitPriceRub} * greatest(${treatmentItems.quantity}, 1) - ${treatmentItems.discountRub}, 0)), 0)::numeric(12,2)`;

	const rows = await db
		.select({
			title: treatmentItems.title,
			quantity: sql<number>`coalesce(sum(greatest(${treatmentItems.quantity}, 1)), 0)::int`,
			plannedRub: lineTotal,
			discountRub: sql<number>`coalesce(sum(${treatmentItems.discountRub}), 0)::numeric(12,2)`
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

/**
 * Деньги в тексте для человека — всегда с копейками.
 *
 * `toLocaleString("ru-RU")` без параметров печатает 3 100,5 вместо 3 100,50:
 * в примечании к отчёту о деньгах это выглядит как другая сумма.
 *
 * ВХОД — ЦЕЛЫЕ КОПЕЙКИ, А НЕ РУБЛИ ЧИСЛОМ, и это не косметика. Пока сюда
 * принимались рубли, в примечание можно было передать результат сложения в
 * плавающей точке: `toLocaleString` с двумя знаками напечатал бы
 * `3 491,4900000000002` как «3 491,49», то есть ТИХО подтвердил бы потерю
 * точности ровно в том тексте, который бухгалтер сверяет с кассой. С копейками
 * на входе передать сюда грязь физически нечем: `rublesFromKopecks` принимает
 * только целое число копеек и на нецелом бросает `MoneyPrecisionError`.
 */
function rubToKopeckText(kopecks: Kopecks): string {
	return rublesFromKopecks(kopecks).toLocaleString("ru-RU", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
}

/** Пациент заплатил больше, чем ему назначено: клиника должна ему, а не он ей. */
export type ReceivablesPrepaymentRow = {
	readonly patientId: string;
	readonly patientName: string;
	readonly prepaidRub: number;
};

export type ReceivablesReport = {
	readonly rows: ReceivablesRow[];
	readonly totalDebtRub: number;
	readonly byBucket: Readonly<Record<ReceivablesBucket, number>>;
	/** Переплаты по каждому пациенту, суммой от крупной к мелкой. */
	readonly prepayments: ReceivablesPrepaymentRow[];
	/** Сколько всего клиника должна вернуть пациентам. */
	readonly totalPrepaidRub: number;
	readonly note: string;
	readonly isEmpty: boolean;
};

/**
 * Дебиторка: кто и сколько не доплатил — и кто переплатил.
 *
 * Долг = назначено минус оплачено, как это считает db/domainStateHydration.ts.
 * Считается на дату отчёта, а не за период: долг не «возникает в марте», он
 * просто есть. Срок определяется по самой ранней неоплаченной позиции; позиции
 * без визита датировать нечем — они попадают в отдельную корзину, а не
 * приписываются к «текущим».
 *
 * ПОЧЕМУ ЗДЕСЬ ПОЯВИЛИСЬ ПЕРЕПЛАТЫ. Отрицательный долг этот отчёт отбрасывал
 * фильтром `debtRub >= minDebtRub`, и переплативший пациент просто исчезал из
 * всех отчётов. При этом главный экран (`buildBillingSummary`, sampleData.ts)
 * вычитает оплаченное из назначенного ПО ВСЕЙ КЛИНИКЕ одним действием, то есть
 * чужая переплата молча уменьшает чей-то долг. Так и появилось расхождение,
 * измеренное на живой базе: 51 400 ₽ на главном экране против 53 000 ₽ в
 * дебиторке — разница ровно в двух переплатах по 800 ₽. Ни один экран не
 * говорил, что клиника должна двум людям деньги.
 *
 * Проверено повторно сквозным прогоном (tests/routes/chainWeldProof.ts): оплата
 * 1 500,50 ₽ пациенту без назначенного лечения уменьшила долг всей клиники на
 * главном экране и не изменила дебиторку.
 *
 * Способ подсчёта долга здесь НЕ менялся: `totalDebtRub` и корзины считаются
 * прежним выражением, иначе разошлись бы ещё сильнее. Добавлено недостающее
 * понятие — переплата отдельным числом, с которым числа двух экранов сходятся:
 * долг − переплаты = сумма, которую показывает главный экран.
 *
 * Переплаты берутся по ОБЪЕДИНЕНИЮ пациентов из позиций лечения и из платежей:
 * пациент, заплативший вперёд до любых назначений, в позициях лечения не
 * встречается вовсе, и по одной таблице его переплату не увидеть.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ГДЕ ЭТОТ КАНОН ТЕРЯЛ КОПЕЙКИ — В СТРОКЕ, А НЕ В ФОРМУЛЕ (замер 2026-07-29)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Формула была права, а РЕЗУЛЬТАТ дособирался в JavaScript плавающей точкой:
 *
 *     debtRub: Number(planned) - paid        // 41300.99 − 14800
 *
 * На живой демо-клинике `d0000000-…-d001` это давало в СТРОКЕ отчёта
 * `26500.989999999998` вместо `26500.99` — измерено через маршрут
 * `/api/reports/receivables`, не выведено. Итог при этом округлялся отдельным
 * `Math.round(value * 100) / 100` и печатался чистым (`53 001,49`), то есть
 * строка отчёта и его итог были посчитаны РАЗНОЙ арифметикой.
 *
 * ЧЕМ ЭТО ПЛОХО ДЛЯ КЛИНИКИ. Третий знак после запятой не проходит
 * `moneyRubSchema` (`packages/shared/src/tests/money-contract-kopecks.test.ts`),
 * а колонка `numeric(12,2)` его молча обрежет: сумма, названная пациенту по
 * телефону, и сумма, попавшая в базу, расходятся, и объяснить расхождение
 * нечем — в отчёте оно не видно, потому что итог округлён, а строка нет.
 * Корзина (`byBucket`) не округлялась ВООВСЕ и копила те же грязные значения;
 * сегодня её сумма вышла чистой случайно (`26500.989999999998 + 26500.5`
 * попало ровно в `53001.49`), при другом наборе строк она отдала бы хвост.
 *
 * ЧТО ИСПРАВЛЕНО И ПОЧЕМУ ИМЕННО ТАК. Арифметика НЕ переехала в JavaScript:
 * умножение на количество, вычитание скидки, зажим в ноль и суммирование по
 * пациенту по-прежнему делает PostgreSQL точным `numeric` — в запросах ниже не
 * изменён ни один символ. Изменено то, что делается с ЕГО ответом:
 *
 *  1. Сумма переводится в ЦЕЛЫЕ КОПЕЙКИ при первом касании (`toKopecks` из
 *     `money/patientDebt.ts`), и до самой границы контракта деньги живут целыми
 *     числами: вычитание, отбор по порогу, сортировка, корзины, итог.
 *     `2650099` копеек — это ровно 26 500,99 ₽, потерять копейку в целых нечем.
 *  2. `Math.round(value * 100) / 100` удалён отовсюду. Он не «округляет до
 *     копейки», а МОЛЧА ПРИНИМАЕТ `3491.4900000000002` за `3491.49`, то есть
 *     подписывается за чужую потерю точности. `toKopecks` на таком значении
 *     бросает `MoneyPrecisionError` (422) — отказ громкий, а не тихий.
 *  3. В рубли числом переводится только то, что уходит в ответ
 *     (`rublesFromKopecks`), потому что контракт объявлен `number`. Складывать
 *     эти числа обратно нельзя — имя функции для этого и выбрано так, чтобы
 *     любое такое сложение было видно в диффе.
 *
 * ПОЧЕМУ ВЫЧИТАНИЕ НЕ ОТДАНО POSTGRESQL ОДНИМ `full outer join`. Оно бы
 * закрыло ОДНУ строку из трёх мест потери: корзины и итог всё равно
 * складываются в JavaScript — корзина зависит от `now` и от календарной
 * арифметики, а порог отбора применяется после. Значит целые копейки в
 * JavaScript обязательны в любом случае, а как только они целые, вычитание в
 * них уже точное, и второй запрос не покупает ничего. Против него — цена:
 * канон стоит под 22 проверками маршрута, а соединение двух агрегатов в
 * построителе запросов — ровно та конструкция, на которой этот файл уже терял
 * отчёты в 500 (имя пояса уходило параметром, и одно выражение получало разные
 * номера в SELECT и GROUP BY). Точную часть PostgreSQL и так уже делает; дефект
 * был в том, что JavaScript выбрасывал её точность следующей же строкой.
 *
 * ПОЧЕМУ ЭТО НЕ ДЕСЯТАЯ ФОРМУЛА ДОЛГА. Формула та же — «назначено минус
 * оплачено» на пациенте. Аппарат копеек взят готовым из `money/patientDebt.ts`
 * (`toKopecks`, `rublesFromKopecks`) и `packages/shared` (`sumKopecks`); своего
 * разбора денег, своего округления и своей печати сумм здесь нет.
 */
export async function receivables(
	organizationId: string,
	options: { readonly now?: Date; readonly minDebtRub?: number; readonly limit?: number } = {}
): Promise<ReceivablesReport> {
	const now = options.now ?? new Date();
	/*
	 * Порог тоже в копейках: сравнивать целые копейки с рублями числом значило бы
	 * вернуть плавающую точку в отбор строк. Маршрут пропускает только целые рубли
	 * (`reports.ts`, `minDebtRub: z.coerce.number().int().min(1)`), поэтому здесь
	 * перевод точный; порог с третьим знаком после запятой отвергается, а не
	 * округляется молча.
	 */
	const minDebtKopecks = toKopecks(Math.max(1, options.minDebtRub ?? 1), "порог долга");
	const limit = Math.max(1, Math.min(1000, options.limit ?? 200));

	const plannedRows = await db
		.select({
			patientId: treatmentItems.patientId,
			/*
			 * Тип объявлен `string | number`, потому что таким это и приходит:
			 * `db/moneyTypeParsers.ts` переводит `numeric` в число ТОЛЬКО когда оно
			 * возвращается в ту же строку байт в байт, иначе отдаёт текст как есть.
			 * Оба варианта точны на входе, и `toKopecks` принимает оба; прежнее
			 * `sql<number>` было неправдой о втором из них.
			 */
			plannedRub: sql<string | number>`coalesce(sum(greatest(${treatmentItems.unitPriceRub} * greatest(${treatmentItems.quantity}, 1) - ${treatmentItems.discountRub}, 0)), 0)::numeric(12,2)`,
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
			paidRub: sql<string | number>`coalesce(sum(${payments.amountRub}), 0)::numeric(12,2)`
		})
		.from(payments)
		.where(and(eq(payments.organizationId, organizationId), eq(payments.status, "paid")))
		.groupBy(payments.patientId);
	/*
	 * ПЕРЕВОД В КОПЕЙКИ НА ПЕРВОМ КАСАНИИ, а не перед выдачей. Здесь стояло
	 * `Number(row.paidRub)`: само по себе оно точно, но дальше это число попадало
	 * в вычитание рублей, и копейка терялась там. Целые копейки закрывают вопрос
	 * для всех последующих действий сразу.
	 */
	const paidByPatient = new Map(paidRows.map((row) => [row.patientId, toKopecks(row.paidRub, "оплачено пациентом")]));

	// Баланс по каждому пациенту, который есть хотя бы в одной из двух таблиц.
	// Положительный — долг, отрицательный — переплата.
	const plannedByPatient = new Map(plannedRows.map((row) => [row.patientId, row]));
	const balances = [...new Set<string>([...plannedByPatient.keys(), ...paidByPatient.keys()])].map((patientId) => {
		const planned = plannedByPatient.get(patientId);
		const oldestChargeAt = planned?.oldestChargeAt ? new Date(planned.oldestChargeAt) : null;
		const plannedKopecks = planned === undefined ? 0 : toKopecks(planned.plannedRub, "назначено пациенту");
		return {
			patientId,
			// ЗДЕСЬ БЫЛ ДЕФЕКТ: `Number(planned) - paid` в рублях давало
			// 41300.99 − 14800 = 26500.989999999998. В целых копейках то же
			// вычитание — 4130099 − 1480000 = 2650099, то есть ровно 26 500,99 ₽.
			debtKopecks: plannedKopecks - (paidByPatient.get(patientId) ?? 0),
			oldestChargeAt,
			hasUndated: Number(planned?.undatedItems ?? 0) > 0
		};
	});

	const debtors = balances
		.filter((row) => row.debtKopecks >= minDebtKopecks)
		.sort((left, right) => right.debtKopecks - left.debtKopecks)
		.slice(0, limit);

	// Порог тот же, что у долга: копеечные хвосты округления не выдаём за
	// обязательство клиники вернуть деньги.
	const overpaid = balances
		.filter((row) => -row.debtKopecks >= minDebtKopecks)
		.sort((left, right) => left.debtKopecks - right.debtKopecks)
		.slice(0, limit);
	/*
	 * Сумма целых копеек через `sumKopecks`: он проверяет КАЖДОЕ слагаемое на
	 * целость, поэтому испорченное значение падает на сложении, а не расползается
	 * в итог. Здесь стояло `reduce` по рублям с `Math.round(… * 100) / 100`
	 * снаружи — и именно это округление молча принимало 1600.0000000000002 за
	 * 1 600,00 вместо того, чтобы сказать, что деньги уже потеряли точность.
	 */
	const totalPrepaidKopecks = sumKopecks(overpaid.map((row) => -row.debtKopecks));

	if (debtors.length === 0 && overpaid.length === 0) {
		return {
			rows: [],
			totalDebtRub: 0,
			byBucket: { current: 0, up_to_30: 0, up_to_90: 0, over_90: 0, undated: 0 },
			prepayments: [],
			totalPrepaidRub: 0,
			note: "Долгов нет, переплат тоже нет.",
			isEmpty: true
		};
	}

	const names = new Map<string, string>();
	const nameRows = await db
		.select({ id: patients.id, fullName: patients.fullName })
		.from(patients)
		.where(eq(patients.organizationId, organizationId));
	for (const row of nameRows) names.set(row.id, row.fullName);

	/*
	 * Корзины копятся В КОПЕЙКАХ. Здесь стояло `byBucket[bucket] += row.debtRub`
	 * по рублям, и это было ХУЖЕ строки: у корзины не было даже того округления,
	 * которое стояло на итоге, то есть грязь плавающей точки уходила в ответ
	 * ничем не прикрытая. Сегодня она вышла чистой случайно — сумма двух живых
	 * долгов попала ровно в представимое значение.
	 */
	const byBucketKopecks: Record<ReceivablesBucket, Kopecks> = {
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
		byBucketKopecks[bucket] += row.debtKopecks;

		return {
			patientId: row.patientId,
			patientName: names.get(row.patientId) ?? "Пациент вне картотеки",
			// Границу контракта деньги переходят один раз и в самом конце:
			// `ReceivablesRow.debtRub` объявлен числом, потому что его проверяет
			// `moneyRubSchema`. Складывать это число обратно нельзя.
			debtRub: rublesFromKopecks(row.debtKopecks),
			oldestChargeAt: row.oldestChargeAt ? row.oldestChargeAt.toISOString() : null,
			bucket
		};
	});

	const prepayments: ReceivablesPrepaymentRow[] = overpaid.map((row) => ({
		patientId: row.patientId,
		patientName: names.get(row.patientId) ?? "Пациент вне картотеки",
		prepaidRub: rublesFromKopecks(-row.debtKopecks)
	}));

	/*
	 * ИТОГ — СУММА ТЕХ ЖЕ САМЫХ СТРОК, а не второй расчёт по тем же данным:
	 * `rows` получены из `debtors` один к одному, и складываются здесь их же
	 * копейки. Поэтому «сумма строк = итог» и «сумма строк корзины = корзина»
	 * выполняются по построению, а не по совпадению округлений.
	 */
	const totalDebtKopecks = sumKopecks(debtors.map((row) => row.debtKopecks));
	const byBucket: Record<ReceivablesBucket, number> = {
		current: rublesFromKopecks(byBucketKopecks.current),
		up_to_30: rublesFromKopecks(byBucketKopecks.up_to_30),
		up_to_90: rublesFromKopecks(byBucketKopecks.up_to_90),
		over_90: rublesFromKopecks(byBucketKopecks.over_90),
		undated: rublesFromKopecks(byBucketKopecks.undated)
	};

	return {
		rows,
		totalDebtRub: rublesFromKopecks(totalDebtKopecks),
		byBucket,
		prepayments,
		totalPrepaidRub: rublesFromKopecks(totalPrepaidKopecks),
		note:
			"Долг = назначено минус оплачено, на дату отчёта. Срок — по самой ранней позиции лечения; " +
			"позиции без привязки к приёму датировать нечем, они в отдельной корзине. " +
			(totalPrepaidKopecks > 0
				? `Переплаты показаны отдельно: клиника должна вернуть ${rubToKopeckText(totalPrepaidKopecks)} ₽ ` +
					`${prepayments.length} пациент(ам). На главном экране сумма к оплате считается по всей клинике одним ` +
					`вычитанием, поэтому там переплаты уже зачтены в долг других пациентов: ` +
					`${rubToKopeckText(totalDebtKopecks)} − ${rubToKopeckText(totalPrepaidKopecks)} = ` +
					`${rubToKopeckText(totalDebtKopecks - totalPrepaidKopecks)} ₽.`
				: "Переплат нет: ни один пациент не заплатил больше назначенного."),
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
		.groupBy(sql`extract(isodow from ${localStart})`, sql`extract(hour from ${localStart})`);

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
