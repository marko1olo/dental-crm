import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { chatMessageDispatchStatuses } from "./schema.js";

export async function getChatMessageDispatchStatusesFromDb(orgId: string) {
	return db
		.select()
		.from(chatMessageDispatchStatuses)
		.where(eq(chatMessageDispatchStatuses.organizationId, orgId));
}
