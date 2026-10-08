import { and, eq, gte, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { patients, payments } from "../../db/schema.js";
import {
	clinicTimeZone,
	inClinicZone,
	postgresKnowsTimeZone,
} from "../../services/reports/managerReports.js";
import { RU_MONTHS } from "./types.js";

export interface CohortLtvItem {
	cohort: string;
	"Month 12": number;
}

export interface CohortCalculationResult {
	cohortLtvJson: CohortLtvItem[];
	cohortZone: string | null;
}

/**
 * 4. Cohort LTV — payments grouped by patient creation month
 *
 * МЕСЯЦ КОГОРТЫ СЧИТАЛСЯ В ПОЯСЕ СЕССИИ POSTGRESQL, А НЕ КЛИНИКИ.
 *
 * `date_trunc('month', …)` для колонки с часовым поясом режет месяц по
 * поясу СЕССИИ. У всех российских поясов смещение положительное, поэтому
 * день в поясе сессии ОТСТАЁТ от местного каждую ночь: в Самаре (пояс
 * клиники по умолчанию в схеме) до 04:00, на Камчатке половину суток.
 * Пациент, зарегистрированный вечером последнего дня месяца, попадал в
 * когорту СЛЕДУЮЩЕГО месяца — и оставался там навсегда, потому что
 * когорта присваивается один раз, по дате регистрации.
 *
 * ЧЕМ ЭТО ПЛОХО ДЛЯ КЛИНИКИ. Владелец сравнивает когорты между собой и
 * по этому сравнению решает, какая реклама сработала. Сдвинутый пациент
 * уносит свою выручку в чужой месяц: месяц регистрации недосчитывает
 * его, следующий получает подарок. Средний чек когорты — деление на
 * число пациентов в ней, поэтому ошибаются ОБА месяца сразу.
 *
 * ИЗМЕРЕНО на живой базе: момент 30 июня 2026 23:30 по часам клиники
 * (Europe/Moscow) при поясе сессии Europe/Samara даёт когорту 2026-07,
 * в поясе клиники — 2026-06. Пояс режет и ГРУППИРОВКУ, а не только
 * ярлык: два момента (30 июня 23:30 и 1 июля 10:00 по Москве) в поясе
 * сессии дают ОДНУ корзину 2026-07 из двух строк, в поясе клиники —
 * две корзины по одной.
 *
 * Приведение делается только к поясу, который PostgreSQL знает: иначе
 * `AT TIME ZONE` бросает 22023 и дашборд отдаёт 503. Пояс неизвестен —
 * поведение прежнее, ответ тот же, что и до правки.
 *
 * ВЫРАЖЕНИЕ ОБЪЯВЛЕНО ОДИН РАЗ на все ТРИ места (SELECT, GROUP BY,
 * ORDER BY). Через три отдельных фрагмента имя пояса ушло бы
 * параметром трижды и получило РАЗНЫЕ номера ($1, $6, $7) —
 * PostgreSQL считает такие выражения разными и отвергает запрос
 * целиком с «column must appear in the GROUP BY clause». Приведение
 * `::text` тут не спасает: дело не в типе, а в номере. Так уже дважды
 * падала в 500 тепловая карта смен.
 */
export async function calculateCohortLtv(
	orgId: string,
	now: Date = new Date(),
): Promise<CohortCalculationResult> {
	const ltvStartDate = new Date(now);
	ltvStartDate.setMonth(ltvStartDate.getMonth() - 12);

	const cohortZone = await postgresKnowsTimeZone(
		await clinicTimeZone(orgId),
	);
	const cohortMonthBucket = sql`date_trunc('month', ${inClinicZone(patients.createdAt, cohortZone)})`;

	const cohortRaw = await db
		.select({
			cohortMonth: sql<string>`to_char(${cohortMonthBucket}, 'YYYY-MM')`,
			patientId: payments.patientId,
			totalRevenue: sql<number>`coalesce(sum(${payments.amountRub}), 0)`,
		})
		.from(payments)
		.innerJoin(patients, eq(payments.patientId, patients.id))
		.where(
			and(
				eq(patients.organizationId, orgId),
				gte(patients.createdAt, ltvStartDate),
				// Только фактически полученные деньги (paid)
				eq(payments.status, "paid"),
			),
		)
		.groupBy(cohortMonthBucket, payments.patientId)
		.orderBy(cohortMonthBucket);

	const cohortMap = new Map<string, { m1: number[]; m12: number[] }>();
	for (const row of cohortRaw) {
		const cm = row.cohortMonth;
		if (!cm) continue;
		if (!cohortMap.has(cm)) {
			cohortMap.set(cm, { m1: [], m12: [] });
		}
		const bucket = cohortMap.get(cm)!;
		const rev = Number(row.totalRevenue);
		// БЫЛО: "выручка первого месяца" = 40% от общей — константа, а не расчёт.
		// Пока платежи не разделены по месяцам от даты регистрации пациента,
		// показываем только фактическую суммарную выручку когорты.
		bucket.m12.push(rev);
	}

	const cohortLtvJson: CohortLtvItem[] = Array.from(cohortMap.entries())
		.slice(-6)
		.map(([key, { m1, m12 }]) => {
			const [, monthStr] = key.split("-");
			const monthIdx = monthStr ? parseInt(monthStr, 10) - 1 : 0;
			const label = (RU_MONTHS as readonly string[])[monthIdx] ?? key;
			const avg = (arr: number[]) =>
				arr.length
					? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
					: 0;
			void m1;
			return {
				cohort: label,
				"Month 12": avg(m12),
			};
		});

	return {
		cohortLtvJson,
		cohortZone,
	};
}

export async function registerCohortRoutes(app: FastifyInstance) {
	app.get("/api/analytics/cohorts", async (request, reply) => {
		const readAllowed = await requireClinicalReadAccess(
			request,
			reply,
			"cohort analytics",
		);
		if (!readAllowed) return;

		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"cohort analytics",
		);
		if (!orgId) return;

		try {
			const result = await calculateCohortLtv(orgId, new Date());
			return {
				success: true,
				data: result,
			};
		} catch (e) {
			request.log.error({ err: e }, "Не удалось рассчитать когортный анализ");
			return reply.code(503).send({
				success: false,
				error: "CohortAnalyticsUnavailable",
				message: "Не удалось рассчитать когортный анализ. Повторите позже.",
			});
		}
	});
}
