import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { cancellationReasonsTwoLevel } from "./schema.js";


export async function getCancellationReasonsTwoLevelFromDb(orgId: string) {
	return db
		.select()
		.from(cancellationReasonsTwoLevel)
		.where(eq(cancellationReasonsTwoLevel.organizationId, orgId));
}
