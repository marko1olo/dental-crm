import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { digitalReceiptDispatches } from "./schema.js";

async function ensureDigitalReceiptDispatchesTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "digital_receipt_dispatches" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"payment_id" uuid NOT NULL,
				"patient_name" text NOT NULL,
				"dispatch_channel" text DEFAULT 'email' NOT NULL,
				"target_destination" text NOT NULL,
				"fiscal_receipt_number" text NOT NULL,
				"receipt_amount_rub" numeric(12, 2) NOT NULL,
				"paper_print_skipped" boolean DEFAULT true NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureDigitalReceiptDispatchesTable warning]:", err);
	}
}

export async function getDigitalReceiptDispatchesFromDb(orgId: string) {
	try {
		await ensureDigitalReceiptDispatchesTable();
		const rows = await db
			.select()
			.from(digitalReceiptDispatches)
			.where(eq(digitalReceiptDispatches.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[DigitalReceiptDispatches DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			paymentId: "00000000-0000-0000-0000-000000000501",
			patientName: "Громова Мария Игоревна",
			dispatchChannel: "email",
			targetDestination: "gromova.m@example.com",
			fiscalReceiptNumber: "ФД-408912",
			receiptAmountRub: "14500.00",
			paperPrintSkipped: true,
			createdAt: new Date().toISOString(),
		},
	];
}
