import { withSuperuserBypass, withTenantCtx } from "../../db/rls.js";
import { biAnalyticsSnapshots, organizations } from "../../db/schema.js";
import {
	computeCohortLtvAll,
	computeDoctorProfitabilityAll,
} from "./biAnalyticsCohorts.js";
import {
	computeChairUtilizationAll,
	computePlanFunnelAll,
} from "./biAnalyticsEngine.js";

/**
 * Итог прогона снимков аналитики.
 */
export interface BiAnalyticsSnapshotRun {
	/** Сколько организаций вернул каталог. */
	readonly organizations: number;
	/** Сколько снимков действительно записано. */
	readonly succeeded: number;
	/** Организации, чей снимок НЕ записан. Пустой список — полный успех. */
	readonly failed: readonly string[];
}

/**
 * Сбор и сохранение снапшотов BI-аналитики для всех или указанной организации.
 * Сохранение выполняется в таблицу `bi_analytics_snapshots` с соблюдением
 * tenant-изоляции `withTenantCtx`. Ошибки отдельных клиник логируются без
 * срыва выполнения для остальных.
 */
export async function computeBiAnalyticsSnapshots(
	targetOrgId?: string,
): Promise<BiAnalyticsSnapshotRun> {
	try {
		const orgs = targetOrgId
			? [{ id: targetOrgId } as any]
			: await withSuperuserBypass((tx) =>
					tx.select().from(organizations),
				);
		if (!orgs.length) return { organizations: 0, succeeded: 0, failed: [] };

		const snapshotDate = new Date();
		const failed: string[] = [];
		let succeeded = 0;

		for (const org of orgs) {
			const orgId = org.id;
			try {
				await withTenantCtx(orgId, async (tx) => {
					const [
						cohortLtvMap,
						planFunnelMap,
						chairUtilizationMap,
						doctorProfitabilityMap,
					] = await Promise.all([
						computeCohortLtvAll([orgId]),
						computePlanFunnelAll([orgId]),
						computeChairUtilizationAll(),
						computeDoctorProfitabilityAll(),
					]);

					const cohortLtvJson = cohortLtvMap.get(orgId) ?? [];
					const planFunnelJson = planFunnelMap.get(orgId) ?? [];
					const chairUtilizationJson = chairUtilizationMap.get(orgId) ?? [];
					const doctorProfitabilityJson =
						doctorProfitabilityMap.get(orgId) ?? [];

					await tx.insert(biAnalyticsSnapshots).values({
						organizationId: orgId,
						snapshotDate,
						cohortLtvJson,
						planFunnelJson,
						chairUtilizationJson,
						doctorProfitabilityJson,
					});

					console.log(`[BI Worker] Snapshot generated for org ${orgId}`);
				});
				succeeded += 1;
			} catch (err) {
				failed.push(orgId);
				console.error(
					`[BI Worker] Error generating snapshot for organization ${orgId}:`,
					err,
				);
			}
		}

		if (failed.length > 0) {
			console.error(
				`[BI Worker] Снимки не записаны у ${failed.length} организаций из ${orgs.length}: ${failed.join(", ")}`,
			);
		}

		return { organizations: orgs.length, succeeded, failed };
	} catch (err) {
		console.error("[BI Worker] Error generating snapshots:", err);
		throw err;
	}
}
