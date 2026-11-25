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
		return {
			smsSentCount: quota.smsSentCount,
			smsQuotaLimit: quota.smsQuotaLimit,
			remaining: Math.max(0, quota.smsQuotaLimit - quota.smsSentCount),
		};
	}

	return {
		smsSentCount: 0,
		smsQuotaLimit: 300,
		remaining: 300,
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
		})
		.onConflictDoNothing({
			target: [uisSmsChatQuotas.organizationId, uisSmsChatQuotas.monthYear],
		});

	const [quota] = await tx
		.select({
			smsSentCount: uisSmsChatQuotas.smsSentCount,
			smsQuotaLimit: uisSmsChatQuotas.smsQuotaLimit,
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
	return {
		smsSentCount,
		smsQuotaLimit,
		remaining: Math.max(0, smsQuotaLimit - smsSentCount),
	};
}

export async function incrementDailySmsQuota(organizationId: string, tx: TenantDb = db) {
	const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

	await tx
		.insert(uisSmsChatQuotas)
		.values({
			organizationId,
			monthYear: today,
			smsSentCount: 1,
			smsQuotaLimit: 300,
			costKopecks: 0,
		})
		.onConflictDoUpdate({
			target: [uisSmsChatQuotas.organizationId, uisSmsChatQuotas.monthYear],
			set: {
				smsSentCount: sql`${uisSmsChatQuotas.smsSentCount} + 1`,
			},
		});
}
