import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { diagnocatAiFindings } from "./schema.js";


export async function getDiagnocatAiFindingsFromDb(orgId: string) {
	return db
		.select()
		.from(diagnocatAiFindings)
		.where(eq(diagnocatAiFindings.organizationId, orgId));
}
