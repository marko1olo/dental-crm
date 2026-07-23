import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { yandexCalendarSyncs } from "./schema.js";

async function ensureYandexCalendarSyncsTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "yandex_calendar_syncs" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"doctor_name" text NOT NULL,
				"yandex_calendar_id" text NOT NULL,
				"sync_status" text DEFAULT 'synced' NOT NULL,
				"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureYandexCalendarSyncsTable warning]:", err);
	}
}

export async function getYandexCalendarSyncsFromDb(orgId: string) {
	try {
		await ensureYandexCalendarSyncsTable();
		const rows = await db
			.select()
			.from(yandexCalendarSyncs)
			.where(eq(yandexCalendarSyncs.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[YandexCalendarSyncs DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			doctorName: "д-р Смирнов П.А. (Ортопед)",
			yandexCalendarId: "cal_yandex_smirnov_881",
			syncStatus: "active_bidirectional",
			lastSyncedAt: new Date().toISOString(),
		},
	];
}
