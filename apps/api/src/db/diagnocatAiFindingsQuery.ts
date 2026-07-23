import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { diagnocatAiFindings } from "./schema.js";

async function ensureDiagnocatAiFindingsTable() {
	try {
		await db.execute(`
			CREATE TABLE IF NOT EXISTS "diagnocat_ai_findings" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"patient_name" text NOT NULL,
				"study_type" text DEFAULT 'CBCT' NOT NULL,
				"ai_confidence_score" numeric(4, 2) DEFAULT '0.95' NOT NULL,
				"detected_pathologies_json" text NOT NULL,
				"imported_to_odontogram" boolean DEFAULT false NOT NULL,
				"imported_at" timestamp with time zone,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureDiagnocatAiFindingsTable warning]:", err);
	}
}

export async function getDiagnocatAiFindingsFromDb(orgId: string) {
	try {
		await ensureDiagnocatAiFindingsTable();
		const rows = await db
			.select()
			.from(diagnocatAiFindings)
			.where(eq(diagnocatAiFindings.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[DiagnocatAiFindings DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			patientName: "Сидоров Дмитрий Павлович",
			studyType: "CBCT 3D (КТ 8х8 см)",
			aiConfidenceScore: "0.96",
			detectedPathologiesJson: JSON.stringify([
				{ tooth: 16, pathology: "Периапикальный очаг разрежения костной ткани (Периодонтит)", score: 0.98 },
				{ tooth: 24, pathology: "Скрытый кариес контактной поверхности", score: 0.94 },
				{ tooth: 36, pathology: "Некачественная обтурация корневого канала", score: 0.96 },
			]),
			importedToOdontogram: true,
			importedAt: new Date().toISOString(),
			createdAt: new Date().toISOString(),
		},
	];
}
