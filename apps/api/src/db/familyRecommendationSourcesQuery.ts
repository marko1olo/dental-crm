import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { familyRecommendationSources } from "./schema.js";

export async function getFamilyRecommendationSourcesFromDb(orgId: string) {
	return db
		.select()
		.from(familyRecommendationSources)
		.where(eq(familyRecommendationSources.organizationId, orgId));
}
