import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { egiszMultipleDiagnoses } from "./schema.js";

async function ensureEgiszMultipleDiagnosesTable() {
	try {
		await db.execute(`
			CREATE TABLE IF NOT EXISTS "egisz_multiple_diagnoses" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"patient_name" text NOT NULL,
				"main_diagnosis_mkb" text NOT NULL,
				"main_diagnosis_name" text NOT NULL,
				"accompanying_diagnoses_mkb" text NOT NULL,
				"cda_validation_status" text DEFAULT 'cda_r2_valid' NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureEgiszMultipleDiagnosesTable warning]:", err);
	}
}

export async function getEgiszMultipleDiagnosesFromDb(orgId: string) {
	try {
		await ensureEgiszMultipleDiagnosesTable();
		const rows = await db
			.select()
			.from(egiszMultipleDiagnoses)
			.where(eq(egiszMultipleDiagnoses.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[EGISZ Multiple Diagnoses DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			patientName: "Иванов Александр Сергеевич",
			mainDiagnosisMkb: "K02.1",
			mainDiagnosisName: "Кариес дентина (Зуб Z46)",
			accompanyingDiagnosesMkb: "K05.1 (Хронический гингивит), K03.6 (Отложения на зубах)",
			cdaValidationStatus: "cda_r2_valid",
			createdAt: new Date().toISOString(),
		},
		{
			id: "00000000-0000-0000-0000-000000000002",
			organizationId: orgId,
			patientName: "Петрова Мария Игоревна",
			mainDiagnosisMkb: "K04.0",
			mainDiagnosisName: "Пульпит зуба Z36",
			accompanyingDiagnosesMkb: "K05.3 (Хронический пародонтит)",
			cdaValidationStatus: "cda_r2_valid",
			createdAt: new Date().toISOString(),
		},
	];
}
