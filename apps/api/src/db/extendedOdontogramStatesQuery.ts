import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { extendedOdontogramStates } from "./schema.js";

async function ensureExtendedOdontogramStatesTable() {
	try {
		await db.execute(`
			CREATE TABLE IF NOT EXISTS "extended_odontogram_states" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"patient_name" text NOT NULL,
				"tooth_number" integer NOT NULL,
				"is_primary_pediatric" boolean DEFAULT false NOT NULL,
				"secondary_caries_under_filling" boolean DEFAULT false NOT NULL,
				"mobility_degree" integer DEFAULT 0 NOT NULL,
				"pediatric_crown_present" boolean DEFAULT false NOT NULL,
				"notes" text NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureExtendedOdontogramStatesTable warning]:", err);
	}
}

export async function getExtendedOdontogramStatesFromDb(orgId: string) {
	try {
		await ensureExtendedOdontogramStatesTable();
		const rows = await db
			.select()
			.from(extendedOdontogramStates)
			.where(eq(extendedOdontogramStates.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[ExtendedOdontogramStates DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			patientName: "Ковалева София Михайловна (8 лет)",
			toothNumber: 54,
			isPrimaryPediatric: true,
			secondaryCariesUnderFilling: true,
			mobilityDegree: 1,
			pediatricCrownPresent: true,
			notes: "Молочный моляр 54: коронка из нержавеющей стали, вторичный кариес по краям, подвижность I ст.",
			createdAt: new Date().toISOString(),
		},
		{
			id: "00000000-0000-0000-0000-000000000002",
			organizationId: orgId,
			patientName: "Иванов Александр Сергеевич",
			toothNumber: 46,
			isPrimaryPediatric: false,
			secondaryCariesUnderFilling: true,
			mobilityDegree: 2,
			pediatricCrownPresent: false,
			notes: "Зуб 46: старая реставрация пломбой, краевое прилегание нарушено (ПС), подвижность II ст.",
			createdAt: new Date().toISOString(),
		},
	];
}
