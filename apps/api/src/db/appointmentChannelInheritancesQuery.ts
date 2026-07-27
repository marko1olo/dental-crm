import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { appointmentChannelInheritances } from "./schema.js";

export async function getAppointmentChannelInheritancesFromDb(orgId: string) {
	return db
		.select()
		.from(appointmentChannelInheritances)
		.where(eq(appointmentChannelInheritances.organizationId, orgId));
}
