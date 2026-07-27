import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { egiszMultipleDiagnoses } from "./schema.js";

export async function getEgiszMultipleDiagnosesFromDb(orgId: string) {
	return db
		.select()
		.from(egiszMultipleDiagnoses)
		.where(eq(egiszMultipleDiagnoses.organizationId, orgId));
}
