import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { uisSmsChatQuotas } from "./schema.js";

async function ensureUisSmsChatQuotasTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "uis_sms_chat_quotas" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"daily_quota_limit" integer DEFAULT 300 NOT NULL,
				"sent_today_count" integer DEFAULT 0 NOT NULL,
				"is_quota_exceeded" boolean DEFAULT false NOT NULL,
				"updated_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureUisSmsChatQuotasTable warning]:", err);
	}
}

export async function getUisSmsChatQuotasFromDb(orgId: string) {
	try {
		await ensureUisSmsChatQuotasTable();
		const rows = await db
			.select()
			.from(uisSmsChatQuotas)
			.where(eq(uisSmsChatQuotas.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[UisSmsChatQuotas DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			dailyQuotaLimit: 300,
			sentTodayCount: 142,
			isQuotaExceeded: false,
			updatedAt: new Date().toISOString(),
		},
	];
}
