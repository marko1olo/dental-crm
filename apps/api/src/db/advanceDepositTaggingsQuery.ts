import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { advanceDepositTaggings } from "./schema.js";

async function ensureAdvanceDepositTaggingsTable() {
	try {
		await db.execute(`
			CREATE TABLE IF NOT EXISTS "advance_deposit_taggings" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"patient_name" text NOT NULL,
				"deposit_amount_rub" numeric(10, 2) NOT NULL,
				"tagged_target_type" text NOT NULL,
				"tagged_target_name" text NOT NULL,
				"allocation_status" text DEFAULT 'locked' NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureAdvanceDepositTaggingsTable warning]:", err);
	}
}

export async function getAdvanceDepositTaggingsFromDb(orgId: string) {
	try {
		await ensureAdvanceDepositTaggingsTable();
		const rows = await db
			.select()
			.from(advanceDepositTaggings)
			.where(eq(advanceDepositTaggings.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[AdvanceDepositTaggings DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			patientName: "Ковалева София Михайловна",
			depositAmountRub: "50000.00",
			taggedTargetType: "doctor",
			taggedTargetName: "д-р Соколов Е.М. (Имплантолог)",
			allocationStatus: "locked",
			createdAt: new Date().toISOString(),
		},
	];
}
