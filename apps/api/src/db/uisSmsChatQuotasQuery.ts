import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { uisSmsChatQuotas } from "./schema.js";

export async function getUisSmsChatQuotasFromDb(orgId: string) {
	return db
		.select()
		.from(uisSmsChatQuotas)
		.where(eq(uisSmsChatQuotas.organizationId, orgId));
}
