import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { kkmItemQuantityUnits } from "./schema.js";

export async function getKkmItemQuantityUnitsFromDb(orgId: string) {
	return db
		.select()
		.from(kkmItemQuantityUnits)
		.where(eq(kkmItemQuantityUnits.organizationId, orgId));
}
