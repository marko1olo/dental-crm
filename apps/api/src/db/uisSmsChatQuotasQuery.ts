import { kopecksToNumericString, kopecksToRubles, rublesToKopecks } from "@dental/shared";
import { and, eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import type { TenantDb } from "./rls.js";
import { uisSmsChatQuotas } from "./schema.js";

export async function getDailySmsQuota(organizationId: string, tx: TenantDb = db) {
	const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

	const [quota] = await tx
		.select()
		.from(uisSmsChatQuotas)
		.where(
			and(
				eq(uisSmsChatQuotas.organizationId, organizationId),
				eq(uisSmsChatQuotas.monthYear, today),
			),
		)
		.limit(1);

	if (quota) {
		const costKopecks =
			quota.costKopecks != null
				? quota.costKopecks
				: quota.costRub != null
					? rublesToKopecks(Number(quota.costRub))
					: 0;
		return {
			smsSentCount: quota.smsSentCount,
			smsQuotaLimit: quota.smsQuotaLimit,
			remaining: Math.max(0, quota.smsQuotaLimit - quota.smsSentCount),
			costKopecks,
			costRub: kopecksToRubles(costKopecks),
		};
	}

	return {
		smsSentCount: 0,
		smsQuotaLimit: 300,
		remaining: 300,
		costKopecks: 0,
		costRub: 0,
	};
}

/**
 * Ensures the daily SMS quota row exists and acquires a row-level lock
 * (`FOR UPDATE`) inside the active tenant transaction to prevent TOCTOU races.
 */
export async function ensureAndLockDailySmsQuota(organizationId: string, tx: TenantDb) {
	const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

	await tx
		.insert(uisSmsChatQuotas)
		.values({
			organizationId,
			monthYear: today,
			smsSentCount: 0,
			smsQuotaLimit: 300,
			costKopecks: 0,
			costRub: "0.00",
		})
		.onConflictDoNothing({
			target: [uisSmsChatQuotas.organizationId, uisSmsChatQuotas.monthYear],
		});

	const [quota] = await tx
		.select({
			smsSentCount: uisSmsChatQuotas.smsSentCount,
			smsQuotaLimit: uisSmsChatQuotas.smsQuotaLimit,
			costKopecks: uisSmsChatQuotas.costKopecks,
		})
		.from(uisSmsChatQuotas)
		.where(
			and(
				eq(uisSmsChatQuotas.organizationId, organizationId),
				eq(uisSmsChatQuotas.monthYear, today),
			),
		)
		.for("update")
		.limit(1);

	const smsSentCount = quota?.smsSentCount ?? 0;
	const smsQuotaLimit = quota?.smsQuotaLimit ?? 300;
	const costKopecks = quota?.costKopecks ?? 0;
	return {
		smsSentCount,
		smsQuotaLimit,
		remaining: Math.max(0, smsQuotaLimit - smsSentCount),
		costKopecks,
		costRub: kopecksToRubles(costKopecks),
	};
}

export async function incrementDailySmsQuota(
	organizationId: string,
	tx: TenantDb = db,
	smsCostKopecks = 0,
) {
	const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
	const safeCostKopecks =
		Number.isFinite(smsCostKopecks) && smsCostKopecks > 0
			? Math.round(smsCostKopecks)
			: 0;

	const [upserted] = await tx
		.insert(uisSmsChatQuotas)
		.values({
			organizationId,
			monthYear: today,
			smsSentCount: 1,
			smsQuotaLimit: 300,
			costKopecks: safeCostKopecks,
			costRub: kopecksToNumericString(safeCostKopecks),
		})
		.onConflictDoUpdate({
			target: [uisSmsChatQuotas.organizationId, uisSmsChatQuotas.monthYear],
			set: {
				smsSentCount: sql`${uisSmsChatQuotas.smsSentCount} + 1`,
				...(safeCostKopecks > 0
					? {
							costKopecks: sql`${uisSmsChatQuotas.costKopecks} + ${safeCostKopecks}`,
						}
					: {}),
			},
		})
		.returning({
			id: uisSmsChatQuotas.id,
			costKopecks: uisSmsChatQuotas.costKopecks,
		});

	if (safeCostKopecks > 0 && upserted) {
		await tx
			.update(uisSmsChatQuotas)
			.set({
				costRub: kopecksToNumericString(upserted.costKopecks ?? safeCostKopecks),
			})
			.where(
				and(
					eq(uisSmsChatQuotas.id, upserted.id),
					eq(uisSmsChatQuotas.organizationId, organizationId),
				),
			);
	}
}
