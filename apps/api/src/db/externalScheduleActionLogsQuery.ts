import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { externalScheduleActionLogs } from "./schema.js";

export async function getExternalScheduleActionLogsFromDb(orgId: string) {
	return db
		.select()
		.from(externalScheduleActionLogs)
		.where(eq(externalScheduleActionLogs.organizationId, orgId));
}
