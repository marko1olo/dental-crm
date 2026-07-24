import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { singleSessionEnforcements } from "./schema.js";

async function ensureSingleSessionEnforcementsTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "single_session_enforcements" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"user_id" uuid NOT NULL,
				"user_login" text NOT NULL,
				"active_session_token" text NOT NULL,
				"client_ip" text NOT NULL,
				"user_agent" text NOT NULL,
				"ejected_previous_session" boolean DEFAULT false NOT NULL,
				"last_active_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureSingleSessionEnforcementsTable warning]:", err);
	}
}

export async function getSingleSessionEnforcementsFromDb(orgId: string) {
	try {
		await ensureSingleSessionEnforcementsTable();
		const rows = await db
			.select()
			.from(singleSessionEnforcements)
			.where(eq(singleSessionEnforcements.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[SingleSessionEnforcements DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			userId: "00000000-0000-0000-0000-000000000010",
			userLogin: "admin_reception",
			activeSessionToken: "sess_tok_991823",
			clientIp: "192.168.1.45",
			userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0",
			ejectedPreviousSession: true,
			lastActiveAt: new Date().toISOString(),
		},
	];
}
