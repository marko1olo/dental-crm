import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { visitExaminationPhotoLinks } from "./schema.js";

export async function getVisitExaminationPhotoLinksFromDb(orgId: string) {
	return db
		.select()
		.from(visitExaminationPhotoLinks)
		.where(eq(visitExaminationPhotoLinks.organizationId, orgId));
}
