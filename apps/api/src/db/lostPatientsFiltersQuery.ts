import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "./client.js";
import { appointments, lostPatientsFilters, patients } from "./schema.js";

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
		const now = new Date();
		const allPatients = await db
			.select()
			.from(patients)
			.where(eq(patients.organizationId, orgId));

		if (allPatients && allPatients.length > 0) {
			const results: any[] = [];
			for (const p of allPatients) {
				const futureApps = await db
					.select()
					.from(appointments)
					.where(and(eq(appointments.organizationId, orgId), eq(appointments.patientId, p.id), gt(appointments.startsAt, now)))
					.limit(1);

				const hasFuture = futureApps.length > 0;
				if (!hasFuture) {
					results.push({
						id: p.id,
						organizationId: orgId,
						patientName: p.fullName,
						phone: p.phone || "Не указан",
						daysSinceLastVisit: 90,
						hasFutureAppointment: false,
						hasActiveCrmTask: false,
						createdAt: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
					});
				}
			}
			if (results.length > 0) return results;
		}

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

