import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { pricelistDoctorPayrolls } from "./schema.js";

export async function getPricelistDoctorPayrollsFromDb(orgId: string) {
	return db
		.select()
		.from(pricelistDoctorPayrolls)
		.where(eq(pricelistDoctorPayrolls.organizationId, orgId));
}
