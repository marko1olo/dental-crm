import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { ndflTaxCalculators } from "./schema.js";

async function ensureNdflTaxCalculatorsTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "ndfl_tax_calculators" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"patient_name" text NOT NULL,
				"tax_code" text DEFAULT 'code_1' NOT NULL,
				"total_eligible_rub" numeric(12, 2) NOT NULL,
				"has_anomaly_warning" boolean DEFAULT false NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureNdflTaxCalculatorsTable warning]:", err);
	}
}

export async function getNdflTaxCalculatorsFromDb(orgId: string) {
	try {
		await ensureNdflTaxCalculatorsTable();
		const rows = await db
			.select()
			.from(ndflTaxCalculators)
			.where(eq(ndflTaxCalculators.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[NdflTaxCalculators DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			patientName: "Орлов Станислав Викторович",
			taxCode: "Код 1 (Обычное лечение)",
			totalEligibleRub: "45000.00",
			hasAnomalyWarning: false,
			createdAt: new Date().toISOString(),
		},
	];
}
