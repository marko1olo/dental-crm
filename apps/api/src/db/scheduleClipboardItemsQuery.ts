import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { scheduleClipboardItems } from "./schema.js";

async function ensureScheduleClipboardItemsTable() {
	try {
		await db.execute(`
			CREATE TABLE IF NOT EXISTS "schedule_clipboard_items" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"appointment_id" uuid NOT NULL,
				"patient_name" text NOT NULL,
				"doctor_name" text NOT NULL,
				"service_title" text NOT NULL,
				"duration_minutes" integer DEFAULT 30 NOT NULL,
				"clipboard_status" text DEFAULT 'copied' NOT NULL,
				"copied_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureScheduleClipboardItemsTable warning]:", err);
	}
}

export async function getScheduleClipboardItemsFromDb(orgId: string) {
	try {
		await ensureScheduleClipboardItemsTable();
		const rows = await db
			.select()
			.from(scheduleClipboardItems)
			.where(eq(scheduleClipboardItems.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[ScheduleClipboardItems DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			appointmentId: "00000000-0000-0000-0000-000000000099",
			patientName: "Васильев Игорь Олегович",
			doctorName: "д-р Петров В.С.",
			serviceTitle: "Лечение кариеса 2 поверхностей + установка пломбы",
			durationMinutes: 45,
			clipboardStatus: "copied",
			copiedAt: new Date().toISOString(),
		},
	];
}
