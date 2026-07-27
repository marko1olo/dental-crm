import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { rebookingConversionRules } from "./schema.js";

export async function getRebookingConversionRulesFromDb(orgId: string) {
	return db
		.select()
		.from(rebookingConversionRules)
		.where(eq(rebookingConversionRules.organizationId, orgId));
}
