import { and, eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { uisSmsChatQuotas } from "./schema.js";

export async function getDailySmsQuota(organizationId: string) {
	const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

	const [quota] = await db
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

export async function incrementDailySmsQuota(organizationId: string) {
	const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

	await db
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
