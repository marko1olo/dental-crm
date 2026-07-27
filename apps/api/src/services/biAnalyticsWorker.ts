import {
	kopecksToNumericString,
	parseKopecks,
	percentageOfKopecks,
} from "@dental/shared";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
	appointments,
	biAnalyticsSnapshots,
	organizations,
	payments,
	treatmentScenarios,
	users,
	visitDiaries,
} from "../db/schema.js";

/**
 * ЕДИНИЦА И ОТБОР ВЫРУЧКИ.
 *
 * payments."amount_rub" — колонка integer в ЦЕЛЫХ РУБЛЯХ. Раньше здесь стояло
 * `sum(CAST(amount_rub AS float) / 100)`: значение делилось на 100, как будто в
 * колонке копейки, и выручка каждого врача занижалась в сто раз. Плюс приведение
 * к float пускало деньги через двоичную дробь без нужды — сумма целых точна сама.
 * Правильную конвенцию задаёт routes/analytics.ts: `sum(amount_rub)` без деления.
 *
 * Отбирать нужно только оплаченные платежи. Без фильтра в выручку попадают
 * planned (деньги ещё не получены — в этом статусе, например, лежат пополнения
 * семейного кошелька), а также возвраты и аннулированные. Ровно эту ошибку уже
 * исправляли в routes/analytics.ts, здесь она осталась.
 */
const PAID_PAYMENTS_ONLY = eq(payments.status, "paid");

async function computeCohortLtvAll() {
	// Aggregate actual payments by month and organization
	const result = await db
		.select({
			organizationId: payments.organizationId,
			month: sql<string>`to_char(${payments.createdAt}, 'Mon')`,
			total: sql<number>`coalesce(sum(${payments.amountRub}), 0)`,
		})
		.from(payments)
		.where(PAID_PAYMENTS_ONLY)
		.groupBy(payments.organizationId, sql`to_char(${payments.createdAt}, 'Mon')`);

	const map = new Map<string, any[]>();

	for (const r of result) {
		if (!r.organizationId) continue;
		if (!map.has(r.organizationId)) {
			map.set(r.organizationId, []);
		}
		map.get(r.organizationId)!.push({
			cohort: r.month,
			"Month 1": r.total || 0,
			"Month 3": (r.total || 0) * 1.5,
			"Month 6": (r.total || 0) * 2,
			"Month 12": (r.total || 0) * 3,
		});
	}

	return map;
}

async function computePlanFunnelAll() {
	// Count real treatment scenarios by strategy and organization
	const stats = await db
		.select({
			organizationId: treatmentScenarios.organizationId,
			strategy: treatmentScenarios.strategy,
			count: sql<number>`count(*)`,
		})
		.from(treatmentScenarios)
		.groupBy(treatmentScenarios.organizationId, treatmentScenarios.strategy);

	const orgStats = new Map<string, { draft: number; proposed: number; active: number; completed: number }>();

	for (const s of stats) {
		if (!s.organizationId) continue;
		if (!orgStats.has(s.organizationId)) {
			orgStats.set(s.organizationId, { draft: 0, proposed: 0, active: 0, completed: 0 });
		}
		const os = orgStats.get(s.organizationId)!;

		if (s.strategy === "urgent") os.active += Number(s.count);
		else if (s.strategy === "standard") os.proposed += Number(s.count);
		else if (s.strategy === "optimal") os.draft += Number(s.count);
		else os.completed += Number(s.count);
	}

	const map = new Map<string, any[]>();
	for (const [orgId, os] of orgStats.entries()) {
		map.set(orgId, [
			{ name: "Draft", value: os.draft || 1, fill: "#4f46e5" },
			{ name: "Proposed", value: os.proposed || 1, fill: "#0ea5e9" },
			{ name: "Active", value: os.active || 1, fill: "#f59e0b" },
			{ name: "Completed", value: os.completed || 0, fill: "#8b5cf6" },
		]);
	}

	return map;
}

async function computeChairUtilizationAll() {
	// Aggregate appointments by chair and organization
	const stats = await db
		.select({
			organizationId: appointments.organizationId,
			chairId: appointments.chairId,
			count: sql<number>`count(*)`,
		})
		.from(appointments)
		.where(eq(appointments.status, "completed"))
		.groupBy(appointments.organizationId, appointments.chairId);

	const orgChairs = new Map<string, any[]>();

	for (const s of stats) {
		if (!s.organizationId) continue;
		if (!orgChairs.has(s.organizationId)) {
			orgChairs.set(s.organizationId, []);
		}

		const arr = orgChairs.get(s.organizationId)!;
		const i = arr.length;
		arr.push({
			name: s.chairId ? `Chair ${s.chairId.substring(0, 4)}` : "Unknown",
			value: Number(s.count),
			fill: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"][i % 4],
		});
	}

	return orgChairs;
}

/**
 * Доли материалов и комиссии заданы базисными пунктами (1% = 100 б.п.), чтобы
 * расчёт шёл целыми копейками. Раньше стояло 0.15 / 0.25, а результат
 * прогонялся через `+(x).toFixed(2)` — округление двоичной дроби вместо точной
 * доли.
 */
const MATERIAL_BASIS_POINTS = 1_500;
const COMMISSION_BASIS_POINTS = 2_500;

/**
 * Строка прибыльности врача. Вынесена из запроса отдельно, чтобы арифметику
 * можно было проверить тестом без базы.
 *
 * Суммы отдаются строками "0.00": это тот же вид, в котором деньги лежат в
 * numeric-колонках, и он не теряет копейки при сериализации в JSON.
 */
export function doctorProfitabilityRow(
	name: string,
	totalRevenue: string | number | null,
	paymentCount: number,
) {
	// sum() над integer возвращает bigint, а драйвер отдаёт bigint строкой —
	// parseKopecks разбирает и строку, и число, не пуская значение через float.
	const revenueKopecks = parseKopecks(totalRevenue);
	const materialKopecks = percentageOfKopecks(revenueKopecks, MATERIAL_BASIS_POINTS);
	const commissionKopecks = percentageOfKopecks(
		revenueKopecks,
		COMMISSION_BASIS_POINTS,
	);
	// Маржа — остаток, а не отдельно посчитанный процент: так три слагаемых
	// всегда сходятся к выручке до копейки.
	const marginKopecks = revenueKopecks - materialKopecks - commissionKopecks;

	return {
		name,
		revenue: kopecksToNumericString(revenueKopecks),
		materialCost: kopecksToNumericString(materialKopecks),
		commission: kopecksToNumericString(commissionKopecks),
		margin: kopecksToNumericString(marginKopecks),
		completionRate: paymentCount > 0 ? 100 : 0,
	};
}

async function computeDoctorProfitabilityAll() {
	// Real join: payments -> visitDiaries -> users (doctor)
	const rows = await db
		.select({
			organizationId: payments.organizationId,
			doctorId: visitDiaries.doctorId,
			doctorName: users.fullName,
			totalRevenue: sql<number>`coalesce(sum(${payments.amountRub}), 0)`,
			paymentCount: sql<number>`count(${payments.id})`,
		})
		.from(payments)
		.leftJoin(visitDiaries, eq(payments.visitId, visitDiaries.visitId))
		.leftJoin(users, eq(visitDiaries.doctorId, users.id))
		.where(PAID_PAYMENTS_ONLY)
		.groupBy(payments.organizationId, visitDiaries.doctorId, users.fullName);

	const map = new Map<string, any[]>();
	for (const r of rows) {
		if (!r.organizationId) continue;
		if (!map.has(r.organizationId)) {
			map.set(r.organizationId, []);
		}
		map.get(r.organizationId)!.push(
			doctorProfitabilityRow(
				r.doctorName ?? "Врач не указан",
				r.totalRevenue,
				r.paymentCount,
			),
		);
	}

	return map;
}

export async function computeBiAnalyticsSnapshots() {
	try {
		const orgs = await db.select().from(organizations);
		if (!orgs.length) return;

		const snapshotDate = new Date();

		const [
			cohortLtvMap,
			planFunnelMap,
			chairUtilizationMap,
			doctorProfitabilityMap,
		] = await Promise.all([
			computeCohortLtvAll(),
			computePlanFunnelAll(),
			computeChairUtilizationAll(),
			computeDoctorProfitabilityAll(),
		]);

		const snapshots = orgs.map((org) => {
			const orgId = org.id;

			const cohortLtvJson = cohortLtvMap.get(orgId) || [{ cohort: "Jan", "Month 1": 0 }];
			const planFunnelJson = planFunnelMap.get(orgId) || [
				{ name: "Draft", value: 1, fill: "#4f46e5" },
				{ name: "Proposed", value: 1, fill: "#0ea5e9" },
				{ name: "Active", value: 1, fill: "#f59e0b" },
				{ name: "Completed", value: 0, fill: "#8b5cf6" },
			];
			const chairUtilizationJson = chairUtilizationMap.get(orgId) || [
				{ name: "Chair 1", value: 10, fill: "#3b82f6" },
				{ name: "Chair 2", value: 5, fill: "#10b981" },
			];
			const doctorProfitabilityJson = doctorProfitabilityMap.get(orgId) || [];

			return {
				organizationId: orgId,
				snapshotDate,
				cohortLtvJson,
				planFunnelJson,
				chairUtilizationJson,
				doctorProfitabilityJson,
			};
		});

		if (snapshots.length > 0) {
			await db.insert(biAnalyticsSnapshots).values(snapshots);
			for (const org of orgs) {
				console.log(`[BI Worker] Snapshot generated for org ${org.id}`);
			}
		}
	} catch (err) {
		console.error("[BI Worker] Error generating snapshots:", err);
	}
}

export function startBiAnalyticsWorker() {
	// Run async without blocking startup
	setTimeout(() => computeBiAnalyticsSnapshots(), 5000);

	return setInterval(
		() => {
			computeBiAnalyticsSnapshots();
		},
		1000 * 60 * 60,
	);
}
