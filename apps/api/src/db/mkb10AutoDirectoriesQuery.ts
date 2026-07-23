import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { mkb10AutoDirectories } from "./schema.js";

async function ensureMkb10AutoDirectoriesTable() {
	try {
		await db.execute(`
			CREATE TABLE IF NOT EXISTS "mkb10_auto_directories" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"mkb_code" text NOT NULL,
				"mkb_title" text NOT NULL,
				"bound_template_package" text NOT NULL,
				"auto_updated" boolean DEFAULT true NOT NULL,
				"last_version_date" text DEFAULT '2026-01-01' NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureMkb10AutoDirectoriesTable warning]:", err);
	}
}

export async function getMkb10AutoDirectoriesFromDb(orgId: string) {
	try {
		await ensureMkb10AutoDirectoriesTable();
		const rows = await db
			.select()
			.from(mkb10AutoDirectories)
			.where(eq(mkb10AutoDirectories.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[MKB-10 Auto Directories DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			mkbCode: "K02",
			mkbTitle: "Кариес зубов",
			boundTemplatePackage: "caries-treatment-standard-v3",
			autoUpdated: true,
			lastVersionDate: "2026-01-01",
			createdAt: new Date().toISOString(),
		},
		{
			id: "00000000-0000-0000-0000-000000000002",
			organizationId: orgId,
			mkbCode: "K04",
			mkbTitle: "Болезни пульпы и периапикальных тканей",
			boundTemplatePackage: "pulpitis-endodontics-v2",
			autoUpdated: true,
			lastVersionDate: "2026-01-01",
			createdAt: new Date().toISOString(),
		},
		{
			id: "00000000-0000-0000-0000-000000000003",
			organizationId: orgId,
			mkbCode: "K05",
			mkbTitle: "Гингивит и болезни пародонта",
			boundTemplatePackage: "periodontitis-basic-v2",
			autoUpdated: true,
			lastVersionDate: "2026-01-01",
			createdAt: new Date().toISOString(),
		},
	];
}
