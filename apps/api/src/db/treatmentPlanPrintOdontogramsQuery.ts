import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { treatmentPlanPrintOdontograms } from "./schema.js";

export async function getTreatmentPlanPrintOdontogramsFromDb(orgId: string) {
	return db
		.select()
		.from(treatmentPlanPrintOdontograms)
		.where(eq(treatmentPlanPrintOdontograms.organizationId, orgId));
}
