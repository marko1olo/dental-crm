import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { mkb10AutoDirectories } from "./schema.js";


export async function getMkb10AutoDirectoriesFromDb(orgId: string) {
	return db
		.select()
		.from(mkb10AutoDirectories)
		.where(eq(mkb10AutoDirectories.organizationId, orgId));
}
