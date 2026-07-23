import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { cancellationReasonsTwoLevel } from "./schema.js";

async function ensureCancellationReasonsTwoLevelTable() {
	try {
		await db.execute(`
			CREATE TABLE IF NOT EXISTS "cancellation_reasons_two_level" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"category" text NOT NULL,
				"reason_code" text NOT NULL,
				"reason_title" text NOT NULL,
				"requires_note" boolean DEFAULT false NOT NULL,
				"is_active" boolean DEFAULT true NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureCancellationReasonsTwoLevelTable warning]:", err);
	}
}

export async function getCancellationReasonsTwoLevelFromDb(orgId: string) {
	try {
		await ensureCancellationReasonsTwoLevelTable();
		const rows = await db
			.select()
			.from(cancellationReasonsTwoLevel)
			.where(eq(cancellationReasonsTwoLevel.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[CancellationReasonsTwoLevel DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			category: "clinic",
			reasonCode: "DOCTOR_ILLNESS",
			reasonTitle: "Болезнь или экстренное отсутствие врача",
			requiresNote: true,
			isActive: true,
			createdAt: new Date().toISOString(),
		},
		{
			id: "00000000-0000-0000-0000-000000000002",
			organizationId: orgId,
			category: "patient",
			reasonCode: "PATIENT_CHANGE_PLANS",
			reasonTitle: "Отмена по инициативе пациента (изменение планов)",
			requiresNote: false,
			isActive: true,
			createdAt: new Date().toISOString(),
		},
	];
}
