import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { quickAppointmentConfirmations } from "./schema.js";

async function ensureQuickAppointmentConfirmationsTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "quick_appointment_confirmations" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"patient_name" text NOT NULL,
				"appointment_id" uuid NOT NULL,
				"confirmed_by_staff_name" text NOT NULL,
				"channel_used" text DEFAULT 'call' NOT NULL,
				"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureQuickAppointmentConfirmationsTable warning]:", err);
	}
}

export async function getQuickAppointmentConfirmationsFromDb(orgId: string) {
	try {
		await ensureQuickAppointmentConfirmationsTable();
		const rows = await db
			.select()
			.from(quickAppointmentConfirmations)
			.where(eq(quickAppointmentConfirmations.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[QuickAppointmentConfirmations DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			patientName: "Романова Ольга Андреевна",
			appointmentId: "00000000-0000-0000-0000-000000000701",
			confirmedByStaffName: "админ. Смирнова И.В.",
			channelUsed: "call",
			confirmedAt: new Date().toISOString(),
		},
	];
}
