import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { scheduleClipboardItems } from "./schema.js";


export async function getScheduleClipboardItemsFromDb(orgId: string) {
	return db
		.select()
		.from(scheduleClipboardItems)
		.where(eq(scheduleClipboardItems.organizationId, orgId));
}
