import { eq } from "drizzle-orm";
import { type TenantDb, withTenantReadCtx } from "./rls.js";
import { singleSessionEnforcements } from "./schema.js";

export async function getSingleSessionEnforcementsFromDb(
	orgId: string,
	tx?: TenantDb,
) {
	const run = (executor: TenantDb) =>
		executor
			.select()
			.from(singleSessionEnforcements)
			.where(eq(singleSessionEnforcements.organizationId, orgId));

	if (tx) return run(tx);
	return withTenantReadCtx(orgId, run);
}
