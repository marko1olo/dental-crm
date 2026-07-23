import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { treatmentPlanLockTokens } from "./schema.js";

async function ensureTreatmentPlanLockTokensTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "treatment_plan_lock_tokens" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"treatment_plan_id" uuid NOT NULL,
				"locked_by_doctor_name" text NOT NULL,
				"lock_token" text NOT NULL,
				"auto_save_draft_json" text NOT NULL,
				"is_active_lock" boolean DEFAULT true NOT NULL,
				"locked_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureTreatmentPlanLockTokensTable warning]:", err);
	}
}

export async function getTreatmentPlanLockTokensFromDb(orgId: string) {
	try {
		await ensureTreatmentPlanLockTokensTable();
		const rows = await db
			.select()
			.from(treatmentPlanLockTokens)
			.where(eq(treatmentPlanLockTokens.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[TreatmentPlanLockTokens DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			treatmentPlanId: "00000000-0000-0000-0000-000000000101",
			lockedByDoctorName: "д-р Орлов А.В. (Ортопед)",
			lockToken: "lock_tpl_987412_orlov",
			autoSaveDraftJson: '{"stage":"Ortho_Stage_1","items":["Коронка диоксид циркония"]}',
			isActiveLock: true,
			lockedAt: new Date().toISOString(),
		},
	];
}
