import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { customExaminationFormCatalogs } from "./schema.js";

export async function getCustomExaminationFormCatalogsFromDb(orgId: string) {
	return db
		.select()
		.from(customExaminationFormCatalogs)
		.where(eq(customExaminationFormCatalogs.organizationId, orgId));
}
