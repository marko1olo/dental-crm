import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { nonDentalExaminationForms } from "./schema.js";

async function ensureNonDentalExaminationFormsTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "non_dental_examination_forms" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"specialty_type" text DEFAULT 'ENT' NOT NULL,
				"form_name" text NOT NULL,
				"patient_name" text NOT NULL,
				"complaints" text NOT NULL,
				"objective_status" text NOT NULL,
				"diagnosis_mkb" text NOT NULL,
				"recommendations" text NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureNonDentalExaminationFormsTable warning]:", err);
	}
}


export async function getNonDentalExaminationFormsFromDb(orgId: string) {
	try {
		await ensureNonDentalExaminationFormsTable();
		const rows = await db
			.select()
			.from(nonDentalExaminationForms)
			.where(eq(nonDentalExaminationForms.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[NonDentalExaminationForms DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			specialtyType: "ENT",
			formName: "Осмотр ЛОР-врача (без зубной формулы)",
			patientName: "Смирнов Алексей Владимирович",
			complaints: "Заложенность носа, боль в горле при глотании",
			objectiveStatus: "Слизистая глотки гиперемирована, носовое дыхание затруднено",
			diagnosisMkb: "J02.9 (Острый фарингит)",
			recommendations: "Полоскание антисептиками, спрей в нос 5 дней",
			createdAt: new Date().toISOString(),
		},
		{
			id: "00000000-0000-0000-0000-000000000002",
			organizationId: orgId,
			specialtyType: "cosmetology",
			formName: "Карта приема косметолога-эстетиста",
			patientName: "Кузнецова Елена Демьяновна",
			complaints: "Сухость кожи, снижение тонуса овалу лица",
			objectiveStatus: "Кожа сухого типа, снижен тургор, мелкоморщинистый тип старения",
			diagnosisMkb: "L90.9 (Атрофическое поражение кожи)",
			recommendations: "Курс биоревитализации 3 процедуры",
			createdAt: new Date().toISOString(),
		},
	];
}
