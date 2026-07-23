import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { egiszBlankPermissions } from "./schema.js";

async function ensureEgiszBlankPermissionsTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "egisz_blank_permissions" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"form_code" text NOT NULL,
				"field_name" text NOT NULL,
				"is_export_allowed" boolean DEFAULT true NOT NULL,
				"patient_opt_out_respect" boolean DEFAULT true NOT NULL,
				"updated_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureEgiszBlankPermissionsTable warning]:", err);
	}
}

export async function getEgiszBlankPermissionsFromDb(orgId: string) {
	try {
		await ensureEgiszBlankPermissionsTable();
		const rows = await db
			.select()
			.from(egiszBlankPermissions)
			.where(eq(egiszBlankPermissions.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[EgiszBlankPermissions DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			formCode: "Форма 043/у",
			fieldName: "Анамнез и данные первичного осмотра",
			isExportAllowed: true,
			patientOptOutRespect: true,
			updatedAt: new Date().toISOString(),
		},
	];
}
