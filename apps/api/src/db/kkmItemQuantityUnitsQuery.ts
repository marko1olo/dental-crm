import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { kkmItemQuantityUnits } from "./schema.js";

async function ensureKkmItemQuantityUnitsTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "kkm_item_quantity_units" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"service_code" text NOT NULL,
				"service_title" text NOT NULL,
				"quantity_unit_code" integer DEFAULT 0 NOT NULL,
				"quantity_unit_label" text DEFAULT 'шт' NOT NULL,
				"item_payment_type" text DEFAULT 'full_payment' NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureKkmItemQuantityUnitsTable warning]:", err);
	}
}

export async function getKkmItemQuantityUnitsFromDb(orgId: string) {
	try {
		await ensureKkmItemQuantityUnitsTable();
		const rows = await db
			.select()
			.from(kkmItemQuantityUnits)
			.where(eq(kkmItemQuantityUnits.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[KkmItemQuantityUnits DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			serviceCode: "A16.07.017",
			serviceTitle: "Установка имплантата Straumann Roxolid",
			quantityUnitCode: 0,
			quantityUnitLabel: "шт",
			itemPaymentType: "full_payment",
			createdAt: new Date().toISOString(),
		},
	];
}
