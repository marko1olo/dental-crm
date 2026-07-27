import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { prodoctorovSyncExports } from "./schema.js";

export async function getProdoctorovSyncExportsFromDb(orgId: string) {
	return db
		.select()
		.from(prodoctorovSyncExports)
		.where(eq(prodoctorovSyncExports.organizationId, orgId));
}
