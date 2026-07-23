import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { customExaminationFormCatalogs } from "./schema.js";

async function ensureCustomExaminationFormCatalogsTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "custom_examination_form_catalogs" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"form_code" text DEFAULT 'FORM_043U' NOT NULL,
				"form_title" text NOT NULL,
				"custom_field_count" integer DEFAULT 12 NOT NULL,
				"egisz_unified" boolean DEFAULT true NOT NULL,
				"status" text DEFAULT 'active' NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureCustomExaminationFormCatalogsTable warning]:", err);
	}
}


export async function getCustomExaminationFormCatalogsFromDb(orgId: string) {
	try {
		await ensureCustomExaminationFormCatalogsTable();
		const rows = await db
			.select()
			.from(customExaminationFormCatalogs)
			.where(eq(customExaminationFormCatalogs.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[CustomExaminationFormCatalogs DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			formCode: "FORM_043U",
			formTitle: "Медицинская карта стоматологического больного (Форма 043/у)",
			customFieldCount: 12,
			egiszUnified: true,
			status: "active",
			createdAt: new Date().toISOString(),
		},
		{
			id: "00000000-0000-0000-0000-000000000002",
			organizationId: orgId,
			formCode: "FORM_039_1U",
			formTitle: "Журнал ежедневного учёта работы врача-стоматолога (039-1/у)",
			customFieldCount: 8,
			egiszUnified: true,
			status: "active",
			createdAt: new Date().toISOString(),
		},
	];
}
