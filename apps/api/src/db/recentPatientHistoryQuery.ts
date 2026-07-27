import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { recentPatientHistory } from "./schema.js";

export async function getRecentPatientHistoryFromDb(orgId: string) {
	return db
		.select()
		.from(recentPatientHistory)
		.where(eq(recentPatientHistory.organizationId, orgId));
}
