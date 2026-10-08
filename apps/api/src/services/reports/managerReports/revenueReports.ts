/**
 * Отчёты по динамике выручки и потоку первичных/повторных пациентов.
 */

import { and, eq, gte, isNotNull, lte, sql } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { appointments, payments } from "../../../db/schema.js";
import { inClinicZone, postgresKnowsTimeZone } from "./timezone.js";
import type {
	PatientFlowPoint,
	PatientFlowReport,
	ReportScope,
	RevenueTimeline,
	RevenueTimelinePoint,
	TimelineGranularity,
} from "./types.js";

/**
 * Динамика выручки. Группировка делается в Postgres через date_trunc: считать
 * это в приложении означало бы вытащить все платежи периода в память.
 */
export async function revenueTimeline(
	scope: ReportScope,
	granularity: TimelineGranularity = "day",
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
			payingPatients: sql<number>`count(distinct ${payments.patientId})::int`,
		})
		.from(payments)
		.where(
			and(
				eq(payments.organizationId, scope.organizationId),
				// Только фактически полученные деньги.
				eq(payments.status, "paid"),
				gte(payments.paidAt, scope.from),
				lte(payments.paidAt, scope.to),
			),
		)
		.groupBy(truncated)
		.orderBy(truncated);

	const points: RevenueTimelinePoint[] = rows.map((row) => ({
		bucket: row.bucket,
		revenueRub: Number(row.revenueRub),
		paymentCount: Number(row.paymentCount),
		payingPatients: Number(row.payingPatients),
	}));

	return {
		granularity,
		points,
		totalRub: points.reduce((total, point) => total + point.revenueRub, 0),
		isEmpty: points.length === 0,
	};
}

/**
 * Первичные и повторные пациенты по месяцам.
 *
 * Первичным считается пациент, у которого это первый завершённый приём за всю
 * историю, а не первый в периоде: иначе при выборе «за март» все пациенты
 * клиники окажутся первичными.
 */
export async function patientFlow(
	scope: ReportScope,
): Promise<PatientFlowReport> {
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
			firstAt: sql<Date>`min(${appointments.startsAt})`,
		})
		.from(appointments)
		.where(
			and(
				eq(appointments.organizationId, scope.organizationId),
				eq(appointments.status, "completed"),
				isNotNull(appointments.patientId),
			),
		)
		.groupBy(appointments.patientId);

	const periodQuery = db
		.select({
			bucket: sql<string>`to_char(${monthBucket}, 'YYYY-MM')`,
			patientId: appointments.patientId,
			// Момент первого приёма пациента ВНУТРИ периода: сравнивать нужно с
			// ним, иначе повторный приём того же дня посчитался бы первичным.
			firstInBucketAt: sql<Date>`min(${appointments.startsAt})`,
		})
		.from(appointments)
		.where(
			and(
				eq(appointments.organizationId, scope.organizationId),
				eq(appointments.status, "completed"),
				isNotNull(appointments.patientId),
				gte(appointments.startsAt, scope.from),
				lte(appointments.startsAt, scope.to),
			),
		)
		.groupBy(monthBucket, appointments.patientId);

	const [firstEverRows, periodRows] = await Promise.all([
		firstEverQuery,
		periodQuery,
	]);

	const firstEverByPatient = new Map<string, number>();
	for (const row of firstEverRows) {
		if (row.patientId && row.firstAt)
			firstEverByPatient.set(row.patientId, new Date(row.firstAt).getTime());
	}

	const byBucket = new Map<
		string,
		{ newPatients: Set<string>; returningPatients: Set<string> }
	>();
	for (const row of periodRows) {
		if (!row.patientId) continue;
		const bucket = byBucket.get(row.bucket) ?? {
			newPatients: new Set<string>(),
			returningPatients: new Set<string>(),
		};

		// Первичный — тот, у кого приём в этом месяце и есть первый за всю
		// историю. Считать «первый в периоде» нельзя: при выборе одного месяца
		// первичными оказались бы все пациенты клиники.
		const firstEver = firstEverByPatient.get(row.patientId);
		const firstInBucket = new Date(row.firstInBucketAt).getTime();
		if (firstEver !== undefined && firstEver === firstInBucket)
			bucket.newPatients.add(row.patientId);
		else bucket.returningPatients.add(row.patientId);

		byBucket.set(row.bucket, bucket);
	}

	const points: PatientFlowPoint[] = [...byBucket.entries()]
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([bucket, sets]) => ({
			bucket,
			newPatients: sets.newPatients.size,
			// Пациент, пришедший в месяце и первично, и повторно, считается
			// первичным один раз: из повторных он исключается.
			returningPatients: [...sets.returningPatients].filter(
				(id) => !sets.newPatients.has(id),
			).length,
		}));

	return {
		points,
		newTotal: points.reduce((total, point) => total + point.newPatients, 0),
		returningTotal: points.reduce(
			(total, point) => total + point.returningPatients,
			0,
		),
		isEmpty: points.length === 0,
	};
}
