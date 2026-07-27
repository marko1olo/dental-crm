import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { confirmationPerformanceReports } from "./schema.js";

export async function getConfirmationPerformanceReportsFromDb(orgId: string) {
	return db
		.select()
		.from(confirmationPerformanceReports)
		.where(eq(confirmationPerformanceReports.organizationId, orgId));
}
