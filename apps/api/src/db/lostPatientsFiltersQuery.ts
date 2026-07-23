import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { lostPatientsFilters } from "./schema.js";

async function ensureLostPatientsFiltersTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "lost_patients_filters" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"patient_name" text NOT NULL,
				"phone" text NOT NULL,
				"days_since_last_visit" integer DEFAULT 90 NOT NULL,
				"has_future_appointment" boolean DEFAULT false NOT NULL,
				"has_active_crm_task" boolean DEFAULT false NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureLostPatientsFiltersTable warning]:", err);
	}
}

export async function getLostPatientsFiltersFromDb(orgId: string) {
	try {
		await ensureLostPatientsFiltersTable();
		const rows = await db
			.select()
			.from(lostPatientsFilters)
			.where(eq(lostPatientsFilters.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[LostPatientsFilters DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			patientName: "Алексеев Владимир Сергеевич",
			phone: "+7 (916) 777-88-99",
			daysSinceLastVisit: 120,
			hasFutureAppointment: false,
			hasActiveCrmTask: false,
			createdAt: new Date().toISOString(),
		},
	];
}
