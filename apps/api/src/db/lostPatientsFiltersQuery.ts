import { and, eq, gt } from "drizzle-orm";
import { db } from "./client.js";
import { appointments, lostPatientsFilters, patients } from "./schema.js";

export async function getLostPatientsFiltersFromDb(orgId: string) {
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

	return db
		.select()
		.from(lostPatientsFilters)
		.where(eq(lostPatientsFilters.organizationId, orgId));
}

