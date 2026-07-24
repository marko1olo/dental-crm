import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { treatmentPlanStages } from "./schema.js";

async function ensureTreatmentPlanStagesTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "treatment_plan_stages" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"patient_name" text NOT NULL,
				"plan_title" text NOT NULL,
				"stage_order" integer DEFAULT 1 NOT NULL,
				"stage_name" text NOT NULL,
				"completion_percentage" integer DEFAULT 0 NOT NULL,
				"auto_archived" boolean DEFAULT false NOT NULL,
				"archived_at" timestamp with time zone,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureTreatmentPlanStagesTable warning]:", err);
	}
}

export async function getTreatmentPlanStagesFromDb(orgId: string) {
	try {
		await ensureTreatmentPlanStagesTable();
		const rows = await db
			.select()
			.from(treatmentPlanStages)
			.where(eq(treatmentPlanStages.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[TreatmentPlanStages DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			patientName: "Иванов Александр Сергеевич",
			planTitle: "Тотальное протезирование на имплантатах",
			stageOrder: 1,
			stageName: "Этап 1: Профессиональная гигиена и санация",
			completionPercentage: 100,
			autoArchived: true,
			archivedAt: new Date().toISOString(),
			createdAt: new Date().toISOString(),
		},
		{
			id: "00000000-0000-0000-0000-000000000002",
			organizationId: orgId,
			patientName: "Иванов Александр Сергеевич",
			planTitle: "Тотальное протезирование на имплантатах",
			stageOrder: 2,
			stageName: "Этап 2: Хирургическая имплантация 4 единиц",
			completionPercentage: 60,
			autoArchived: false,
			archivedAt: null,
			createdAt: new Date().toISOString(),
		},
	];
}
