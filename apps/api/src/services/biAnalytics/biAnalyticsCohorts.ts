import { kopecksToRubles } from "@dental/shared";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import { payments, users, visitDiaries } from "../../db/schema.js";
import {
	clinicTimeZone,
	inClinicZone,
	postgresKnowsTimeZone,
} from "../reports/managerReports.js";

/**
 * ЕДИНИЦА И ОТБОР ВЫРУЧКИ.
 *
 * Первичный источник суммы платежа — `payments.amount_kopecks` (`BIGINT`),
 * с fallback на `ROUND(payments.amount_rub * 100)::bigint` только для legacy-строк с `0`/`NULL`.
 * Отбирать нужно только оплаченные платежи `status = 'paid'`.
 */
export const PAID_PAYMENTS_ONLY = eq(payments.status, "paid");

const PAYMENT_KOPECKS_SQL = sql<string>`case when ${payments.amountKopecks} is not null and ${payments.amountKopecks} <> 0 then ${payments.amountKopecks}::bigint else round(coalesce(${payments.amountRub}, 0)::numeric * 100)::bigint end`;

/**
 * Корзина выручки: месяц по часам клиники и сумма ОПЛАЧЕННЫХ платежей за него.
 * Согласно Мандату 8wy («Zero Mocks»), выдуманные множители 1.5/2/3 сняты.
 * `Month 1` остаётся: сумма оплаченных платежей корзины без множителей.
 */
export interface CohortRevenuePoint {
	readonly cohort: string;
	readonly "Month 1": number;
}

/**
 * Расчёт когортного LTV по всем указанным организациям.
 * Месяц когорты считается в часовом поясе клиники (Europe/Moscow, Europe/Samara и др.),
 * приведение к поясу выполняется через проверку postgresKnowsTimeZone.
 */
export async function computeCohortLtvAll(organizationIds: readonly string[]) {
	const map = new Map<string, CohortRevenuePoint[]>();

	for (const organizationId of organizationIds) {
		await withTenantCtx(organizationId, async (tx) => {
			const zone = await postgresKnowsTimeZone(
				await clinicTimeZone(organizationId),
			);
			// Выражение месяца объявлено ОДИН раз на SELECT, GROUP BY и ORDER BY.
			const monthBucket = sql`date_trunc('month', ${inClinicZone(payments.createdAt, zone)})`;

			const rows = await tx
				.select({
					month: sql<string>`to_char(${monthBucket}, 'YYYY-MM')`,
					totalKopecks: sql<string>`coalesce(sum(${PAYMENT_KOPECKS_SQL}), 0)::bigint`,
				})
				.from(payments)
				.where(
					and(eq(payments.organizationId, organizationId), PAID_PAYMENTS_ONLY),
				)
				.groupBy(monthBucket)
				.orderBy(monthBucket);

			if (!rows.length) return;

			map.set(
				organizationId,
				rows.map((r) => ({
					cohort: r.month,
					"Month 1": kopecksToRubles(Number(r.totalKopecks ?? 0)),
				})),
			);
		});
	}

	return map;
}

/**
 * Строка прибыльности врача в том виде, в каком она ложится в
 * `bi_analytics_snapshots.doctor_profitability_json`.
 */
export interface DoctorProfitabilitySnapshotRow {
	readonly name: string;
	readonly revenue: number;
	readonly margin: number | null;
	readonly completionRate: number | null;
}

/**
 * Формирование строки доходности врача по реальным оплаченным суммам.
 * Выручка — число (number). Себестоимость и выдуманная маржа сняты (null)
 * в соответствии с Мандатом 8wy.
 */
export function doctorProfitabilityRow(
	name: string,
	totalRevenue: string | number | null,
): DoctorProfitabilitySnapshotRow {
	const revenue = Number(totalRevenue ?? 0);

	return {
		name,
		revenue: Number.isFinite(revenue) ? revenue : 0,
		margin: null,
		completionRate: null,
	};
}

/**
 * Расчёт доходности по врачам для всех клиник.
 * Строгая изоляция tenant: join дневника визита и врача только внутри organizationId платежа.
 */
export async function computeDoctorProfitabilityAll(
	organizationIds?: readonly string[],
): Promise<Map<string, DoctorProfitabilitySnapshotRow[]>> {
	if (organizationIds && organizationIds.length === 0) {
		return new Map();
	}
	const whereClause = organizationIds
		? and(PAID_PAYMENTS_ONLY, inArray(payments.organizationId, [...organizationIds]))
		: PAID_PAYMENTS_ONLY;
	const rows = await db
		.select({
			organizationId: payments.organizationId,
			doctorId: visitDiaries.doctorId,
			doctorName: users.fullName,
			totalRevenueKopecks: sql<string>`coalesce(sum(${PAYMENT_KOPECKS_SQL}), 0)::bigint`,
		})
		.from(payments)
		.leftJoin(
			visitDiaries,
			and(
				eq(payments.visitId, visitDiaries.visitId),
				eq(visitDiaries.organizationId, payments.organizationId),
			),
		)
		.leftJoin(
			users,
			and(
				eq(visitDiaries.doctorId, users.id),
				eq(users.organizationId, payments.organizationId),
			),
		)
		.where(whereClause)
		.groupBy(payments.organizationId, visitDiaries.doctorId, users.fullName);

	const map = new Map<string, DoctorProfitabilitySnapshotRow[]>();
	for (const r of rows) {
		if (!r.organizationId) continue;
		if (!map.has(r.organizationId)) {
			map.set(r.organizationId, []);
		}
		map.get(r.organizationId)?.push(
			doctorProfitabilityRow(
				r.doctorName ?? "Врач не указан",
				kopecksToRubles(Number(r.totalRevenueKopecks ?? 0)),
			),
		);
	}

	return map;
}
