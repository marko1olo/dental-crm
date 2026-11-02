import { and, eq } from "drizzle-orm";
import { appointments as inMemoryAppointments } from "../../sampleData.js";
import { db } from "../client.js";
import * as schema from "../schema.js";
import { useInMemory } from "./emergencyBookingCheck.js";

export async function getAppointmentByIdInDb(
	organizationId: string,
	id: string,
) {
	if (useInMemory()) {
		return inMemoryAppointments.find((a) => a.id === id) ?? null;
	}
	const [res] = await db
		.select()
		.from(schema.appointments)
		.where(
			and(
				eq(schema.appointments.organizationId, organizationId),
				eq(schema.appointments.id, id),
			),
		)
		.limit(1);
	return res || null;
}
