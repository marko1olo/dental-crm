import { eq } from "drizzle-orm";
import { db, type TenantDb } from "./client.js";
import { dadataGeocodedAddresses } from "./schema.js";

export async function getDadataGeocodedAddressesFromDb(
	orgId: string,
	targetDb: TenantDb = db,
) {
	return targetDb
		.select()
		.from(dadataGeocodedAddresses)
		.where(eq(dadataGeocodedAddresses.organizationId, orgId));
}
