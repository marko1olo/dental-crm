import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { messageTemplateCatalogs } from "./schema.js";

export async function getMessageTemplateCatalogsFromDb(orgId: string) {
	return db
		.select()
		.from(messageTemplateCatalogs)
		.where(eq(messageTemplateCatalogs.organizationId, orgId));
}
