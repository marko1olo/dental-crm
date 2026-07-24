import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { customCrmTaskTypes } from "./schema.js";

async function ensureCustomCrmTaskTypesTable() {
	try {
		await db.execute(`
			CREATE TABLE IF NOT EXISTS "custom_crm_task_types" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"type_code" text NOT NULL,
				"type_label" text NOT NULL,
				"color_hex" text DEFAULT '#3b82f6' NOT NULL,
				"requires_patient_binding" boolean DEFAULT false NOT NULL,
				"default_sla_hours" integer DEFAULT 24 NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureCustomCrmTaskTypesTable warning]:", err);
	}
}

export async function getCustomCrmTaskTypesFromDb(orgId: string) {
	try {
		await ensureCustomCrmTaskTypesTable();
		const rows = await db
			.select()
			.from(customCrmTaskTypes)
			.where(eq(customCrmTaskTypes.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[CustomCrmTaskTypes DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			typeCode: "POST_OP_CALL",
			typeLabel: "Контрольный звонок после операции",
			colorHex: "#10b981",
			requiresPatientBinding: true,
			defaultSlaHours: 24,
			createdAt: new Date().toISOString(),
		},
		{
			id: "00000000-0000-0000-0000-000000000002",
			organizationId: orgId,
			typeCode: "PREPAYMENT_CHECK",
			typeLabel: "Проверка предоплаты лаборатории",
			colorHex: "#f59e0b",
			requiresPatientBinding: true,
			defaultSlaHours: 48,
			createdAt: new Date().toISOString(),
		},
	];
}
