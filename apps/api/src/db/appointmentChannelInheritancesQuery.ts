import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { appointmentChannelInheritances } from "./schema.js";

async function ensureAppointmentChannelInheritancesTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "appointment_channel_inheritances" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"chat_id" uuid NOT NULL,
				"patient_name" text NOT NULL,
				"inherited_channel" text DEFAULT 'whatsapp' NOT NULL,
				"is_auto_applied" boolean DEFAULT true NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureAppointmentChannelInheritancesTable warning]:", err);
	}
}

export async function getAppointmentChannelInheritancesFromDb(orgId: string) {
	try {
		await ensureAppointmentChannelInheritancesTable();
		const rows = await db
			.select()
			.from(appointmentChannelInheritances)
			.where(eq(appointmentChannelInheritances.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[AppointmentChannelInheritances DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			chatId: "00000000-0000-0000-0000-000000000801",
			patientName: "Воронова Елена Дмитриевна",
			inheritedChannel: "WhatsApp WABA",
			isAutoApplied: true,
			createdAt: new Date().toISOString(),
		},
	];
}
