import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { urgentScheduleRequests } from "./schema.js";

export async function getUrgentScheduleRequestsFromDb(orgId: string) {
	return db
		.select()
		.from(urgentScheduleRequests)
		.where(eq(urgentScheduleRequests.organizationId, orgId));
}
