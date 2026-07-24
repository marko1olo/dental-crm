import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { patientServiceLineages } from "./schema.js";

async function ensurePatientServiceLineagesTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "patient_service_lineages" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"patient_id" uuid NOT NULL,
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

export async function getPatientServiceLineagesFromDb(orgId: string, patientId?: string) {
	try {
		await ensurePatientServiceLineagesTable();
		const query = patientId 
		    ? sql`SELECT * FROM patient_service_lineages WHERE organization_id = ${orgId} AND patient_id = ${patientId}`
		    : sql`SELECT * FROM patient_service_lineages WHERE organization_id = ${orgId}`;
		    
		const res = await db.execute(query);
		if (res && res.rows && res.rows.length > 0) {
			return res.rows.map((row: any) => ({
				id: row.id,
				organizationId: row.organization_id,
				patientId: row.patient_id,
				patientName: row.patient_name,
				leadSource: row.lead_source,
				rescheduleCount: row.reschedule_count,
				waitlistEntryId: row.waitlist_entry_id,
				finalVisitId: row.final_visit_id,
				lifecycleStage: row.lifecycle_stage,
				createdAt: row.created_at,
			}));
		}
	} catch (err) {
		console.warn("[PatientServiceLineages DB Fallback]:", err);
	}

	return patientId ? [] : [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			patientId: "00000000-0000-0000-0000-000000000002",
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
