import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { alternativeTreatmentPlans } from "./schema.js";

export async function getAlternativeTreatmentPlansFromDb(orgId: string) {
	return db
		.select()
		.from(alternativeTreatmentPlans)
		.where(eq(alternativeTreatmentPlans.organizationId, orgId));
}
