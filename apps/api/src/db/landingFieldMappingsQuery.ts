import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { landingFieldMappings } from "./schema.js";

async function ensureLandingFieldMappingsTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "landing_field_mappings" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"landing_provider" text DEFAULT 'flexbe' NOT NULL,
				"form_name" text NOT NULL,
				"incoming_field_key" text NOT NULL,
				"mapped_crm_target" text NOT NULL,
				"is_active" boolean DEFAULT true NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureLandingFieldMappingsTable warning]:", err);
	}
}

export async function getLandingFieldMappingsFromDb(orgId: string) {
	try {
		await ensureLandingFieldMappingsTable();
		const rows = await db
			.select()
			.from(landingFieldMappings)
			.where(eq(landingFieldMappings.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[LandingFieldMappings DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			landingProvider: "flexbe",
			formName: "Форма заявки на имплантацию под ключ",
			incomingFieldKey: "user_phone_number_raw",
			mappedCrmTarget: "patient.phone",
			isActive: true,
			createdAt: new Date().toISOString(),
		},
		{
			id: "00000000-0000-0000-0000-000000000002",
			organizationId: orgId,
			landingProvider: "tilda",
			formName: "Форма записи на бесплатный осмотр",
			incomingFieldKey: "preferred_time_slot",
			mappedCrmTarget: "lead.desired_time",
			isActive: true,
			createdAt: new Date().toISOString(),
		},
	];
}
