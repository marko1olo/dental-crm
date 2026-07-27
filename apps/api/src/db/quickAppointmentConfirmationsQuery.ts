import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { quickAppointmentConfirmations } from "./schema.js";

export async function getQuickAppointmentConfirmationsFromDb(orgId: string) {
	return db
		.select()
		.from(quickAppointmentConfirmations)
		.where(eq(quickAppointmentConfirmations.organizationId, orgId));
}
