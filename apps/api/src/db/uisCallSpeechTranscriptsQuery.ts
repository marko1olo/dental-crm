import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { uisCallSpeechTranscripts } from "./schema.js";

export async function getUisCallSpeechTranscriptsFromDb(orgId: string) {
	return db
		.select()
		.from(uisCallSpeechTranscripts)
		.where(eq(uisCallSpeechTranscripts.organizationId, orgId));
}
