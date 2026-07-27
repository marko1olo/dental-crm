import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { treatmentPlanStages } from "./schema.js";

export async function getTreatmentPlanStagesFromDb(orgId: string) {
	return db
		.select()
		.from(treatmentPlanStages)
		.where(eq(treatmentPlanStages.organizationId, orgId));
}
