import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { digitalReceiptDispatches } from "./schema.js";

export async function getDigitalReceiptDispatchesFromDb(orgId: string) {
	return db
		.select()
		.from(digitalReceiptDispatches)
		.where(eq(digitalReceiptDispatches.organizationId, orgId));
}
