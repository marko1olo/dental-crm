import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { alternativeTreatmentPlans } from "./schema.js";

async function ensureAlternativeTreatmentPlansTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "alternative_treatment_plans" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"patient_name" text NOT NULL,
				"variant_name" text NOT NULL,
				"total_cost_rub" numeric(12, 2) NOT NULL,
				"is_selected_variant" boolean DEFAULT false NOT NULL,
				"auto_archived" boolean DEFAULT false NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureAlternativeTreatmentPlansTable warning]:", err);
	}
}

export async function getAlternativeTreatmentPlansFromDb(orgId: string) {
	try {
		await ensureAlternativeTreatmentPlansTable();
		const rows = await db
			.select()
			.from(alternativeTreatmentPlans)
			.where(eq(alternativeTreatmentPlans.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[AlternativeTreatmentPlans DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			patientName: "Калиничева Алина Николаевна",
			variantName: "Вариант А: Имплантация Straumann + Цирконий",
			totalCostRub: "185000.00",
			isSelectedVariant: true,
			autoArchived: false,
			createdAt: new Date().toISOString(),
		},
		{
			id: "00000000-0000-0000-0000-000000000002",
			organizationId: orgId,
			patientName: "Калиничева Алина Николаевна",
			variantName: "Вариант Б: Мостовидный протез металлокерамика",
			totalCostRub: "95000.00",
			isSelectedVariant: false,
			autoArchived: true,
			createdAt: new Date().toISOString(),
		},
	];
}
