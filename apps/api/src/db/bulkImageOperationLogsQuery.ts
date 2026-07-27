import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { bulkImageOperationLogs } from "./schema.js";

export async function getBulkImageOperationLogsFromDb(orgId: string) {
	return db
		.select()
		.from(bulkImageOperationLogs)
		.where(eq(bulkImageOperationLogs.organizationId, orgId));
}
