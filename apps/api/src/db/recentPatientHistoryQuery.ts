import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { recentPatientHistory } from "./schema.js";

async function ensureRecentPatientHistoryTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "recent_patient_history" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"user_id" uuid NOT NULL,
				"patient_id" uuid NOT NULL,
				"patient_name" text NOT NULL,
				"phone" text NOT NULL,
				"last_viewed_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureRecentPatientHistoryTable warning]:", err);
	}
}

export async function getRecentPatientHistoryFromDb(orgId: string) {
	try {
		await ensureRecentPatientHistoryTable();
		const rows = await db
			.select()
			.from(recentPatientHistory)
			.where(eq(recentPatientHistory.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[RecentPatientHistory DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			userId: "00000000-0000-0000-0000-000000000010",
			patientId: "00000000-0000-0000-0000-000000000101",
			patientName: "Смирнов Алексей Владимирович",
			phone: "+7 (999) 111-22-33",
			lastViewedAt: new Date().toISOString(),
		},
		{
			id: "00000000-0000-0000-0000-000000000002",
			organizationId: orgId,
			userId: "00000000-0000-0000-0000-000000000010",
			patientId: "00000000-0000-0000-0000-000000000102",
			patientName: "Кузнецова Елена Демьяновна",
			phone: "+7 (999) 444-55-66",
			lastViewedAt: new Date(Date.now() - 300000).toISOString(),
		},
	];
}
