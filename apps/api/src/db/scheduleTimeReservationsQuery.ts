import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { scheduleTimeReservations } from "./schema.js";


export async function getScheduleTimeReservationsFromDb(orgId: string) {
	return db
		.select()
		.from(scheduleTimeReservations)
		.where(eq(scheduleTimeReservations.organizationId, orgId));
}
