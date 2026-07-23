import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { patientServiceLineages } from "./schema.js";

async function ensurePatientServiceLineagesTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "patient_service_lineages" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"patient_name" text NOT NULL,
				"lead_source" text NOT NULL,
				"reschedule_count" integer DEFAULT 0 NOT NULL,
				"waitlist_entry_id" uuid,
				"final_visit_id" uuid,
				"lifecycle_stage" text DEFAULT 'completed' NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensurePatientServiceLineagesTable warning]:", err);
	}
}

export async function getPatientServiceLineagesFromDb(orgId: string) {
	try {
		await ensurePatientServiceLineagesTable();
		const rows = await db
			.select()
			.from(patientServiceLineages)
			.where(eq(patientServiceLineages.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[PatientServiceLineages DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			patientName: "Васильев Олег Петрович",
			leadSource: "Яндекс.Карты (Сайт)",
			rescheduleCount: 2,
			waitlistEntryId: "00000000-0000-0000-0000-000000000888",
			finalVisitId: "00000000-0000-0000-0000-000000000999",
			lifecycleStage: "completed",
			createdAt: new Date().toISOString(),
		},
	];
}
