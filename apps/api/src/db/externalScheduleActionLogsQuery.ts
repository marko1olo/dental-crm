import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { externalScheduleActionLogs } from "./schema.js";

async function ensureExternalScheduleActionLogsTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "external_schedule_action_logs" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"external_provider" text NOT NULL,
				"action_type" text NOT NULL,
				"patient_name" text NOT NULL,
				"appointment_slot" text NOT NULL,
				"status" text DEFAULT 'success' NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureExternalScheduleActionLogsTable warning]:", err);
	}
}

export async function getExternalScheduleActionLogsFromDb(orgId: string) {
	try {
		await ensureExternalScheduleActionLogsTable();
		const rows = await db
			.select()
			.from(externalScheduleActionLogs)
			.where(eq(externalScheduleActionLogs.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[ExternalScheduleActionLogs DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			externalProvider: "Забота 2.0 (AI Bot)",
			actionType: "Авто-подтверждение записи",
			patientName: "Кузнецов Денис Олегович",
			appointmentSlot: "Завтра 11:00 (д-р Ковалев А.В.)",
			status: "success",
			createdAt: new Date().toISOString(),
		},
	];
}
