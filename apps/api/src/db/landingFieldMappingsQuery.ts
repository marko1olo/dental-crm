import { eq } from "drizzle-orm";
import { db, type TenantDb } from "./client.js";
import { landingFieldMappings } from "./schema.js";

export async function getLandingFieldMappingsFromDb(
	orgId: string,
	targetDb: TenantDb = db,
) {
	return targetDb
		.select()
		.from(landingFieldMappings)
		.where(eq(landingFieldMappings.organizationId, orgId));
}
