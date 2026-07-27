import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { previousChatDialogHistories } from "./schema.js";

export async function getPreviousChatDialogHistoriesFromDb(orgId: string) {
	return db
		.select()
		.from(previousChatDialogHistories)
		.where(eq(previousChatDialogHistories.organizationId, orgId));
}
