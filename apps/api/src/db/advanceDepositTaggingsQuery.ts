import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { advanceDepositTaggings } from "./schema.js";


export async function getAdvanceDepositTaggingsFromDb(orgId: string) {
	return db
		.select()
		.from(advanceDepositTaggings)
		.where(eq(advanceDepositTaggings.organizationId, orgId));
}
