import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { singleSessionEnforcements } from "./schema.js";

export async function getSingleSessionEnforcementsFromDb(orgId: string) {
	return db
		.select()
		.from(singleSessionEnforcements)
		.where(eq(singleSessionEnforcements.organizationId, orgId));
}
