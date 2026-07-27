import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { patientDuplicateMergeQueues } from "./schema.js";

export async function getPatientDuplicateMergeQueuesFromDb(orgId: string) {
	return db
		.select()
		.from(patientDuplicateMergeQueues)
		.where(eq(patientDuplicateMergeQueues.organizationId, orgId));
}
