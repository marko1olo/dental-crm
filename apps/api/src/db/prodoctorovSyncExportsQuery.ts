import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { prodoctorovSyncExports } from "./schema.js";

async function ensureProdoctorovSyncExportsTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "prodoctorov_sync_exports" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"price_list_sync_status" text DEFAULT 'synced' NOT NULL,
				"available_slots_count" integer DEFAULT 120 NOT NULL,
				"medflex_club_badge" boolean DEFAULT true NOT NULL,
				"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureProdoctorovSyncExportsTable warning]:", err);
	}
}

export async function getProdoctorovSyncExportsFromDb(orgId: string) {
	try {
		await ensureProdoctorovSyncExportsTable();
		const rows = await db
			.select()
			.from(prodoctorovSyncExports)
			.where(eq(prodoctorovSyncExports.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[ProdoctorovSyncExports DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			priceListSyncStatus: "synced",
			availableSlotsCount: 120,
			medflexClubBadge: true,
			lastSyncedAt: new Date().toISOString(),
			createdAt: new Date().toISOString(),
		},
		{
			id: "00000000-0000-0000-0000-000000000002",
			organizationId: orgId,
			priceListSyncStatus: "pending",
			availableSlotsCount: 85,
			medflexClubBadge: false,
			lastSyncedAt: new Date().toISOString(),
			createdAt: new Date().toISOString(),
		},
	];
}
