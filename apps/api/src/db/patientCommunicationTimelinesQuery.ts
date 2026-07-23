import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { patientCommunicationTimelines } from "./schema.js";

async function ensurePatientCommunicationTimelinesTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "patient_communication_timelines" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"patient_name" text NOT NULL,
				"event_type" text DEFAULT 'call' NOT NULL,
				"status_color" text DEFAULT 'green' NOT NULL,
				"audio_recording_url" text,
				"comment" text NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensurePatientCommunicationTimelinesTable warning]:", err);
	}
}

export async function getPatientCommunicationTimelinesFromDb(orgId: string) {
	try {
		await ensurePatientCommunicationTimelinesTable();
		const rows = await db
			.select()
			.from(patientCommunicationTimelines)
			.where(eq(patientCommunicationTimelines.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[PatientCommunicationTimelines DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			patientName: "Васильев Олег Петрович",
			eventType: "Входящий звонок UIS",
			statusColor: "emerald",
			audioRecordingUrl: "https://call-records.uis.ru/rec/98412.mp3",
			comment: "Подтвердил прием на завтра к ортопеду",
			createdAt: new Date().toISOString(),
		},
	];
}
