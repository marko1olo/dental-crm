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
import { createApiLogger, safeLogError } from "../../observability/logger.js";

const logger = createApiLogger("biAnalyticsSnapshots");

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
		const orgIds: string[] = targetOrgId
			? [targetOrgId]
			: (
					await withSuperuserBypass((tx) =>
						tx.select({ id: organizations.id }).from(organizations),
					)
				).map((o) => o.id);
		if (!orgIds.length) return { organizations: 0, succeeded: 0, failed: [] };

		const snapshotDate = new Date();
		const failed: string[] = [];
		let succeeded = 0;

		for (const orgId of orgIds) {
			try {
				await withTenantCtx(orgId, async (tx) => {
					const cohortLtvMap = await computeCohortLtvAll([orgId]);
					const planFunnelMap = await computePlanFunnelAll([orgId]);
					const chairUtilizationMap = await computeChairUtilizationAll([orgId]);
					const doctorProfitabilityMap = await computeDoctorProfitabilityAll([orgId]);

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

					logger.info({ orgId }, "Snapshot generated for org");
				});
				succeeded += 1;
			} catch (err) {
				failed.push(orgId);
				logger.error(
					{ err: safeLogError(err), orgId },
					"Error generating snapshot for organization",
				);
			}
		}

		if (failed.length > 0) {
			logger.error(
				{ failedCount: failed.length, totalCount: orgIds.length, failedOrgIds: failed },
				"Снимки не записаны у части организаций",
			);
		}

		return { organizations: orgIds.length, succeeded, failed };
	} catch (err) {
		logger.error({ err: safeLogError(err) }, "Error generating snapshots");
		throw err;
	}
}
