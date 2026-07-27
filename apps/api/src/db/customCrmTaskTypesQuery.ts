import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { customCrmTaskTypes } from "./schema.js";

export async function getCustomCrmTaskTypesFromDb(orgId: string) {
	return db
		.select()
		.from(customCrmTaskTypes)
		.where(eq(customCrmTaskTypes.organizationId, orgId));
}
