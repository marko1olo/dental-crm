import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { collaborativeChatProcessingStates } from "./schema.js";

export async function getCollaborativeChatProcessingStatesFromDb(orgId: string) {
	return db
		.select()
		.from(collaborativeChatProcessingStates)
		.where(eq(collaborativeChatProcessingStates.organizationId, orgId));
}
