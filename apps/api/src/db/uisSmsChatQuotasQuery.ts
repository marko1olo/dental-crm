import { and, eq } from "drizzle-orm";
import { db } from "./client.js";
import { uisSmsChatQuotas } from "./schema.js";

export async function getDailySmsQuota(organizationId: string) {
	const today = new Date().toISOString().split("T")[0]!; // YYYY-MM-DD

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
	const today = new Date().toISOString().split("T")[0]!; // YYYY-MM-DD

	const [existing] = await db
		.select()
		.from(uisSmsChatQuotas)
		.where(
			and(
				eq(uisSmsChatQuotas.organizationId, organizationId),
				eq(uisSmsChatQuotas.monthYear, today),
			),
		)
		.limit(1);

	if (existing) {
		await db
			.update(uisSmsChatQuotas)
			.set({
				smsSentCount: existing.smsSentCount + 1,
			})
			.where(
				and(
					eq(uisSmsChatQuotas.organizationId, organizationId),
					eq(uisSmsChatQuotas.monthYear, today),
				),
			);
	} else {
		await db.insert(uisSmsChatQuotas).values({
			organizationId,
			monthYear: today,
			smsSentCount: 1,
			smsQuotaLimit: 300,
		});
	}
}
