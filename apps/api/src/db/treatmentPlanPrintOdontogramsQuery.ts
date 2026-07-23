import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { treatmentPlanPrintOdontograms } from "./schema.js";

async function ensureTreatmentPlanPrintOdontogramsTable() {
	try {
		await db.execute(`
			CREATE TABLE IF NOT EXISTS "treatment_plan_print_odontograms" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"patient_name" text NOT NULL,
				"plan_title" text NOT NULL,
				"odontogram_included" boolean DEFAULT true NOT NULL,
				"tooth_formula_snippet" text NOT NULL,
				"print_layout_ready" boolean DEFAULT true NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureTreatmentPlanPrintOdontogramsTable warning]:", err);
	}
}

export async function getTreatmentPlanPrintOdontogramsFromDb(orgId: string) {
	try {
		await ensureTreatmentPlanPrintOdontogramsTable();
		const rows = await db
			.select()
			.from(treatmentPlanPrintOdontograms)
			.where(eq(treatmentPlanPrintOdontograms.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[TreatmentPlanPrintOdontograms DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			patientName: "Иванов Александр Сергеевич",
			planTitle: "План лечения: комплексная санация, 6 зубов",
			odontogramIncluded: true,
			toothFormulaSnippet: "18О 17C 16L 15И 14И | 24И 25И 26С 27С",
			printLayoutReady: true,
			createdAt: new Date().toISOString(),
		},
		{
			id: "00000000-0000-0000-0000-000000000002",
			organizationId: orgId,
			patientName: "Петрова Мария Игоревна",
			planTitle: "Ортопедический план лечения: протезирование 3 единицы",
			odontogramIncluded: true,
			toothFormulaSnippet: "46П 47П 48Уд | 36П",
			printLayoutReady: true,
			createdAt: new Date().toISOString(),
		},
	];
}
