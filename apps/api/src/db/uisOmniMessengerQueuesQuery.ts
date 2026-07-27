import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { uisOmniMessengerQueues } from "./schema.js";

export async function getUisOmniMessengerQueuesFromDb(orgId: string) {
	return db
		.select()
		.from(uisOmniMessengerQueues)
		.where(eq(uisOmniMessengerQueues.organizationId, orgId));
}
