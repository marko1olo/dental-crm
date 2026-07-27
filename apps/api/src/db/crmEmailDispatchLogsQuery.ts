import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { crmEmailDispatchLogs } from "./schema.js";


export async function getCrmEmailDispatchLogsFromDb(orgId: string) {
	return db
		.select()
		.from(crmEmailDispatchLogs)
		.where(eq(crmEmailDispatchLogs.organizationId, orgId));
}
