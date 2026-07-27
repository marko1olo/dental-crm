import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { ndflTaxCalculators } from "./schema.js";

export async function getNdflTaxCalculatorsFromDb(orgId: string) {
	return db
		.select()
		.from(ndflTaxCalculators)
		.where(eq(ndflTaxCalculators.organizationId, orgId));
}
