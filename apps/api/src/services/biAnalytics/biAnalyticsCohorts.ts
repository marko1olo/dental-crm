import { and, eq, sql } from "drizzle-orm";
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
 * payments."amount_rub" — колонка integer в ЦЕЛЫХ РУБЛЯХ.
 * Правильную конвенцию задаёт routes/analytics.ts: `sum(amount_rub)` без деления.
 * Отбирать нужно только оплаченные платежи `status = 'paid'`.
 */
export const PAID_PAYMENTS_ONLY = eq(payments.status, "paid");

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
					total: sql<number>`coalesce(sum(${payments.amountRub}), 0)`,
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
					"Month 1": Number(r.total ?? 0),
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
export async function computeDoctorProfitabilityAll(): Promise<
	Map<string, DoctorProfitabilitySnapshotRow[]>
> {
	const rows = await db
		.select({
			organizationId: payments.organizationId,
			doctorId: visitDiaries.doctorId,
			doctorName: users.fullName,
			totalRevenue: sql<number>`coalesce(sum(${payments.amountRub}), 0)`,
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
		.where(PAID_PAYMENTS_ONLY)
		.groupBy(payments.organizationId, visitDiaries.doctorId, users.fullName);

	const map = new Map<string, DoctorProfitabilitySnapshotRow[]>();
	for (const r of rows) {
		if (!r.organizationId) continue;
		if (!map.has(r.organizationId)) {
			map.set(r.organizationId, []);
		}
		map.get(r.organizationId)?.push(
			doctorProfitabilityRow(r.doctorName ?? "Врач не указан", r.totalRevenue),
		);
	}

	return map;
}
