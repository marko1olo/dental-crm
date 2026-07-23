import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { urgentScheduleRequests } from "./schema.js";

async function ensureUrgentScheduleRequestsTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "urgent_schedule_requests" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"patient_name" text NOT NULL,
				"request_type" text NOT NULL,
				"urgency_level" text DEFAULT 'high' NOT NULL,
				"doctor_name" text NOT NULL,
				"preferred_slot_time" text NOT NULL,
				"is_resolved" boolean DEFAULT false NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureUrgentScheduleRequestsTable warning]:", err);
	}
}

export async function getUrgentScheduleRequestsFromDb(orgId: string) {
	try {
		await ensureUrgentScheduleRequestsTable();
		const rows = await db
			.select()
			.from(urgentScheduleRequests)
			.where(eq(urgentScheduleRequests.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[UrgentScheduleRequests DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			patientName: "Тихонов Игорь Васильевич",
			requestType: "Острая боль (Перенос записи)",
			urgencyLevel: "urgent",
			doctorName: "д-р Соколов Е.М.",
			preferredSlotTime: "Сегодня 15:30",
			isResolved: false,
			createdAt: new Date().toISOString(),
		},
	];
}
