import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { extendedOdontogramStates } from "./schema.js";

export async function getExtendedOdontogramStatesFromDb(orgId: string) {
	return db
		.select()
		.from(extendedOdontogramStates)
		.where(eq(extendedOdontogramStates.organizationId, orgId));
}
