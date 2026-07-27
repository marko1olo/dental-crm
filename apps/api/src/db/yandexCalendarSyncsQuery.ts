import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { yandexCalendarSyncs } from "./schema.js";

export async function getYandexCalendarSyncsFromDb(orgId: string) {
	return db
		.select()
		.from(yandexCalendarSyncs)
		.where(eq(yandexCalendarSyncs.organizationId, orgId));
}
