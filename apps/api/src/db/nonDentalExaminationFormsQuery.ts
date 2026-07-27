import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { nonDentalExaminationForms } from "./schema.js";

export async function getNonDentalExaminationFormsFromDb(orgId: string) {
	return db
		.select()
		.from(nonDentalExaminationForms)
		.where(eq(nonDentalExaminationForms.organizationId, orgId));
}
