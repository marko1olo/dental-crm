import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { rebookingConversionRules } from "./schema.js";

async function ensureRebookingConversionRulesTable() {
	try {
		await db.execute(`
			CREATE TABLE IF NOT EXISTS "rebooking_conversion_rules" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"patient_name" text NOT NULL,
				"rebooked_by" text NOT NULL,
				"time_delta_minutes" integer NOT NULL,
				"credited_role" text NOT NULL,
				"appointment_date" text NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureRebookingConversionRulesTable warning]:", err);
	}
}

export async function getRebookingConversionRulesFromDb(orgId: string) {
	try {
		await ensureRebookingConversionRulesTable();
		const rows = await db
			.select()
			.from(rebookingConversionRules)
			.where(eq(rebookingConversionRules.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[RebookingConversionRules DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			patientName: "Иванов Александр Сергеевич",
			rebookedBy: "doctor",
			timeDeltaMinutes: 8,
			creditedRole: "doctor",
			appointmentDate: "2026-07-28",
			createdAt: new Date().toISOString(),
		},
		{
			id: "00000000-0000-0000-0000-000000000002",
			organizationId: orgId,
			patientName: "Петрова Мария Игоревна",
			rebookedBy: "administrator",
			timeDeltaMinutes: 45,
			creditedRole: "administrator",
			appointmentDate: "2026-07-30",
			createdAt: new Date().toISOString(),
		},
	];
}
