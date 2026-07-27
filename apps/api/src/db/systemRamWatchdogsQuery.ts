import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { systemRamWatchdogs } from "./schema.js";

export async function getSystemRamWatchdogsFromDb(orgId: string) {
	return db
		.select()
		.from(systemRamWatchdogs)
		.where(eq(systemRamWatchdogs.organizationId, orgId));
}
