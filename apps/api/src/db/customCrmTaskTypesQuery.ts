import { eq } from "drizzle-orm";
import type { TenantDb } from "./client.js";
import { withTenantReadCtx } from "./rls.js";
import { customCrmTaskTypes } from "./schema.js";

export async function getCustomCrmTaskTypesFromDb(
	orgId: string,
	tx?: TenantDb,
) {
	if (tx) {
		return tx
			.select()
			.from(customCrmTaskTypes)
			.where(eq(customCrmTaskTypes.organizationId, orgId));
	}
	return withTenantReadCtx(orgId, (tenantTx) =>
		tenantTx
			.select()
			.from(customCrmTaskTypes)
			.where(eq(customCrmTaskTypes.organizationId, orgId)),
	);
}
