import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { messengerFileAttachments } from "./schema.js";

export async function getMessengerFileAttachmentsFromDb(orgId: string) {
	return db
		.select()
		.from(messengerFileAttachments)
		.where(eq(messengerFileAttachments.organizationId, orgId));
}
