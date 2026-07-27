import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { dadataGeocodedAddresses } from "./schema.js";

export async function getDadataGeocodedAddressesFromDb(orgId: string) {
	return db
		.select()
		.from(dadataGeocodedAddresses)
		.where(eq(dadataGeocodedAddresses.organizationId, orgId));
}
