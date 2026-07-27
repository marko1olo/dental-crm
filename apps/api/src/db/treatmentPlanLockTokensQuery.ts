import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { treatmentPlanLockTokens } from "./schema.js";

export async function getTreatmentPlanLockTokensFromDb(orgId: string) {
	return db
		.select()
		.from(treatmentPlanLockTokens)
		.where(eq(treatmentPlanLockTokens.organizationId, orgId));
}
