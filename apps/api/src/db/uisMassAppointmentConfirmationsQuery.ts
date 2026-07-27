import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { uisMassAppointmentConfirmations } from "./schema.js";

export async function getUisMassAppointmentConfirmationsFromDb(orgId: string) {
	return db
		.select()
		.from(uisMassAppointmentConfirmations)
		.where(eq(uisMassAppointmentConfirmations.organizationId, orgId));
}
