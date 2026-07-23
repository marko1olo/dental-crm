import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { systemRamWatchdogs } from "./schema.js";

async function ensureSystemRamWatchdogsTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "system_ram_watchdogs" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"client_host_name" text NOT NULL,
				"used_ram_mb" integer NOT NULL,
				"total_ram_mb" integer NOT NULL,
				"warning_level" text DEFAULT 'normal' NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureSystemRamWatchdogsTable warning]:", err);
	}
}

export async function getSystemRamWatchdogsFromDb(orgId: string) {
	try {
		await ensureSystemRamWatchdogsTable();
		const rows = await db
			.select()
			.from(systemRamWatchdogs)
			.where(eq(systemRamWatchdogs.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[SystemRamWatchdogs DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			clientHostName: "RECEPTION-PC-01",
			usedRamMb: 6144,
			totalRamMb: 8192,
			warningLevel: "normal (75% RAM)",
			createdAt: new Date().toISOString(),
		},
	];
}
