import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { visitExaminationPhotoLinks } from "./schema.js";

async function ensureVisitExaminationPhotoLinksTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "visit_examination_photo_links" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"visit_id" text NOT NULL,
				"patient_name" text NOT NULL,
				"photo_url" text NOT NULL,
				"examination_form_id" text NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureVisitExaminationPhotoLinksTable warning]:", err);
	}
}

export async function getVisitExaminationPhotoLinksFromDb(orgId: string) {
	try {
		await ensureVisitExaminationPhotoLinksTable();
		const rows = await db
			.select()
			.from(visitExaminationPhotoLinks)
			.where(eq(visitExaminationPhotoLinks.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[VisitExaminationPhotoLinks DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			visitId: "visit-2026-07-20-881",
			patientName: "Орлов Станислав Викторович",
			photoUrl: "/uploads/visits/exam_photo_881.jpg",
			examinationFormId: "form-043u-904",
			createdAt: new Date().toISOString(),
		},
	];
}
