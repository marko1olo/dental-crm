import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { egiszBlankPermissions } from "./schema.js";

export async function getEgiszBlankPermissionsFromDb(orgId: string) {
	return db
		.select()
		.from(egiszBlankPermissions)
		.where(eq(egiszBlankPermissions.organizationId, orgId));
}
