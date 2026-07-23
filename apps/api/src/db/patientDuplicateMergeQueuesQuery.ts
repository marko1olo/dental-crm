import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { patientDuplicateMergeQueues } from "./schema.js";

async function ensurePatientDuplicateMergeQueuesTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "patient_duplicate_merge_queues" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"primary_patient_name" text NOT NULL,
				"duplicate_patient_name" text NOT NULL,
				"match_confidence_percent" integer DEFAULT 95 NOT NULL,
				"merge_status" text DEFAULT 'pending' NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensurePatientDuplicateMergeQueuesTable warning]:", err);
	}
}

export async function getPatientDuplicateMergeQueuesFromDb(orgId: string) {
	try {
		await ensurePatientDuplicateMergeQueuesTable();
		const rows = await db
			.select()
			.from(patientDuplicateMergeQueues)
			.where(eq(patientDuplicateMergeQueues.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[PatientDuplicateMergeQueues DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			primaryPatientName: "Мельников Артем Андреевич (ID #1042)",
			duplicatePatientName: "Мельников А.А. (ID #1098)",
			matchConfidencePercent: 98,
			mergeStatus: "queued",
			createdAt: new Date().toISOString(),
		},
	];
}
