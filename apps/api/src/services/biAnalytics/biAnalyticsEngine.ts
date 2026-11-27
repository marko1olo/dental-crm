import { and, eq, inArray, sql } from "drizzle-orm";
import type { TenantDb } from "../../db/client.js";
import { withSuperuserBypass, withTenantReadCtx } from "../../db/rls.js";
import {
	appointments,
	organizations,
	patients,
	treatmentPlanStatus,
	treatmentPlans,
} from "../../db/schema.js";
import { computeBiAnalyticsSnapshots } from "./biAnalyticsSnapshots.js";
import { createApiLogger, safeLogError } from "../../observability/logger.js";

const logger = createApiLogger("biAnalyticsEngine");

/** Состояние плана лечения так, как его называет перечисление базы. */
export type TreatmentPlanStatus =
	(typeof treatmentPlanStatus.enumValues)[number];

/**
 * Ветви воронки планов лечения выведены напрямую из перечисления `treatmentPlanStatus`.
 * Порядок ветвей — канонический порядок `pg_enum` (`enumsortorder`).
 */
export const TREATMENT_PLAN_FUNNEL_STATUSES = treatmentPlanStatus.enumValues;

/**
 * Подпись и цвет ветви воронки для руководителя.
 */
export const TREATMENT_PLAN_FUNNEL_APPEARANCE: Record<
	TreatmentPlanStatus,
	{ readonly label: string; readonly fill: string }
> = {
	Draft: { label: "Черновики", fill: "#a1a1aa" },
	Active: { label: "В работе", fill: "#f59e0b" },
	Approved: { label: "Согласованы", fill: "#3b82f6" },
	Completed: { label: "Завершены", fill: "#10b981" },
	Rejected: { label: "Отклонены", fill: "#ef4444" },
};

/** Строка «статус → сколько планов» из группирующего запроса. */
export interface PlanStatusCount {
	readonly status: string | null;
	readonly count: number | string | null;
}

/**
 * Ветвь воронки в том виде, в каком она ложится в
 * `bi_analytics_snapshots.plan_funnel_json`.
 */
export interface PlanFunnelStage {
	readonly status: string;
	readonly name: string;
	readonly value: number;
	readonly fill: string;
}

/**
 * Построение воронки планов лечения из сырых строк агрегации.
 * Неизвестные статусы не отбрасываются, сохраняя целостность суммы планов.
 */
export function buildPlanFunnel(
	rows: readonly PlanStatusCount[],
): PlanFunnelStage[] {
	const known = new Map<string, number>(
		TREATMENT_PLAN_FUNNEL_STATUSES.map((status) => [status, 0]),
	);
	const unknown = new Map<string, number>();

	for (const row of rows) {
		const status = row.status ?? "";
		const parsed = Number(row.count ?? 0);
		const count = Number.isFinite(parsed) ? parsed : 0;
		const previous = known.get(status);
		if (previous !== undefined) {
			known.set(status, previous + count);
			continue;
		}
		unknown.set(status, (unknown.get(status) ?? 0) + count);
	}

	if (unknown.size > 0) {
		logger.error(
			{ unknownStatuses: [...unknown.keys()] },
			"Воронка планов лечения: база вернула состояния, которых нет в перечислении treatmentPlanStatus (db/schema.ts)",
		);
	}

	return [
		...TREATMENT_PLAN_FUNNEL_STATUSES.map((status) => ({
			status,
			name: TREATMENT_PLAN_FUNNEL_APPEARANCE[status].label,
			value: known.get(status) ?? 0,
			fill: TREATMENT_PLAN_FUNNEL_APPEARANCE[status].fill,
		})),
		...[...unknown.entries()].map(([status, value]) => ({
			status,
			name: status,
			value,
			fill: "#71717a",
		})),
	];
}

/**
 * Расчёт воронки планов лечения по статусам для всех указанных организаций.
 */
export async function computePlanFunnelAll(
	organizationIds?: readonly string[],
	executor?: TenantDb,
): Promise<Map<string, PlanFunnelStage[]>> {
	const map = new Map<string, PlanFunnelStage[]>();
	if (!organizationIds || organizationIds.length === 0) {
		return map;
	}

	for (const organizationId of organizationIds) {
		const runForOrg = async (tx: TenantDb) => {
			const stats = await tx
				.select({
					status: treatmentPlans.status,
					count: sql<number>`count(*)::int`,
				})
				.from(treatmentPlans)
				.innerJoin(patients, eq(treatmentPlans.patientId, patients.id))
				.where(eq(patients.organizationId, organizationId))
				.groupBy(treatmentPlans.status);

			if (stats.length > 0) {
				map.set(organizationId, buildPlanFunnel(stats));
			}
		};

		if (executor) {
			await runForOrg(executor);
		} else {
			await withTenantReadCtx(organizationId, runForOrg);
		}
	}

	return map;
}

export interface ChairUtilizationPoint {
	readonly name: string;
	readonly value: number;
	readonly fill: string;
}

/**
 * Расчёт загрузки кресел по завершённым приёмам.
 */
export async function computeChairUtilizationAll(
	organizationIds?: readonly string[],
	executor?: TenantDb,
): Promise<Map<string, ChairUtilizationPoint[]>> {
	if (organizationIds && organizationIds.length === 0) {
		return new Map();
	}
	const completedOnly = eq(appointments.status, "completed");
	const orgChairs = new Map<string, ChairUtilizationPoint[]>();

	const queryWithTx = async (tx: TenantDb, scopeOrgIds?: readonly string[]) => {
		const whereClause = scopeOrgIds
			? and(completedOnly, inArray(appointments.organizationId, [...scopeOrgIds]))
			: completedOnly;
		const stats = await tx
			.select({
				organizationId: appointments.organizationId,
				chairId: appointments.chairId,
				count: sql<number>`count(*)`,
			})
			.from(appointments)
			.where(whereClause)
			.groupBy(appointments.organizationId, appointments.chairId);

		for (const s of stats) {
			if (!s.organizationId) continue;
			if (!orgChairs.has(s.organizationId)) {
				orgChairs.set(s.organizationId, []);
			}

			const arr = orgChairs.get(s.organizationId);
			if (!arr) continue;
			const i = arr.length;
			arr.push({
				name: s.chairId ? `Кресло ${s.chairId.substring(0, 4)}` : "Без кресла",
				value: Number(s.count),
				fill: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"][i % 4] ?? "#3b82f6",
			});
		}
	};

	if (executor) {
		await queryWithTx(executor, organizationIds);
		return orgChairs;
	}

	const targetOrgIds =
		organizationIds ??
		(
			await withSuperuserBypass((tx) =>
				tx.select({ id: organizations.id }).from(organizations),
			)
		).map((o) => o.id);

	for (const orgId of targetOrgIds) {
		await withTenantReadCtx(orgId, (tx) => queryWithTx(tx, [orgId]));
	}

	return orgChairs;
}

/**
 * Выполнение фонового сбора снапшотов с перехватом ошибок.
 */
export function runScheduledSnapshots(): void {
	void computeBiAnalyticsSnapshots().catch((err) => {
		logger.error({ err: safeLogError(err) }, "Плановый прогон снимков отказал");
	});
}

/** Алиас для запуска цикла сбора BI аналитики */
export const runBiAnalyticsWorker = runScheduledSnapshots;

let biWorkerInterval: NodeJS.Timeout | null = null;
let biStartupTimeout: NodeJS.Timeout | null = null;

/**
 * Запуск фонового планировщика BI-аналитики.
 */
export function startBiAnalyticsWorker(): NodeJS.Timeout {
	if (biWorkerInterval) {
		return biWorkerInterval;
	}

	biStartupTimeout = setTimeout(() => {
		biStartupTimeout = null;
		runScheduledSnapshots();
	}, 5000);
	biStartupTimeout.unref();

	biWorkerInterval = setInterval(
		() => {
			runScheduledSnapshots();
		},
		1000 * 60 * 60,
	);
	biWorkerInterval.unref();

	return biWorkerInterval;
}

/**
 * Остановка фонового планировщика BI-аналитики (graceful shutdown).
 */
export function stopBiAnalyticsWorker(): void {
	if (biStartupTimeout) {
		clearTimeout(biStartupTimeout);
		biStartupTimeout = null;
	}
	if (biWorkerInterval) {
		clearInterval(biWorkerInterval);
		biWorkerInterval = null;
	}
}
