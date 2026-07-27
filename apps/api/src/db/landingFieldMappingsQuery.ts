import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { landingFieldMappings } from "./schema.js";

export async function getLandingFieldMappingsFromDb(orgId: string) {
	return db
		.select()
		.from(landingFieldMappings)
		.where(eq(landingFieldMappings.organizationId, orgId));
}
