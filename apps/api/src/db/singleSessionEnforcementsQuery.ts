import { eq } from "drizzle-orm";
import { withTenantCtx } from "./rls.js";
import { singleSessionEnforcements } from "./schema.js";

export async function getSingleSessionEnforcementsFromDb(orgId: string) {
	return withTenantCtx(orgId, async (tx) =>
		tx
			.select()
			.from(singleSessionEnforcements)
			.where(eq(singleSessionEnforcements.organizationId, orgId)),
	);
}
