import { PGlite } from "@electric-sql/pglite";
import { electricSync } from "@electric-sql/pglite-sync";
import { db } from "../db/client.js";
import { organizations } from "../db/schema.js";

// This module replaces the old custom syncDaemon with ElectricSQL native sync engine.
let isSyncing = false;
let syncPlugin: any = null;

export async function startSyncEngine(pgliteClient: PGlite) {
	if (isSyncing) return;

	const electricUrl = process.env.ELECTRIC_SYNC_URL;
	
	if (!electricUrl) {
		console.log(
			"[SyncEngine] ⚠️ ELECTRIC_SYNC_URL is not defined. Running in Local-Only Isolated Mode.",
		);
		console.log(
			"[SyncEngine] To enable Commercial Global Sync, set ELECTRIC_SYNC_URL (e.g. ws://electric-server:5133).",
		);
		return;
	}

	console.log("[SyncEngine] 🟢 Starting Commercial CRDT Sync via ElectricSQL...");

	try {
		const allOrgs = await db.select({ id: organizations.id }).from(organizations);
		const orgIds = allOrgs.map((o) => o.id);
		
		if (orgIds.length === 0) {
			console.log("[SyncEngine] ⚠️ No local organizations found. Delaying sync until an organization is created.");
			return;
		}
		
		const orgFilterList = orgIds.map((id) => `'${id}'`).join(",");
		const orgWhereClause = `"organization_id" IN (${orgFilterList})`;

		console.log(`[SyncEngine] 🟢 Starting Commercial CRDT Sync for orgs: ${orgIds.join(", ")}`);

		const baseUrl = electricUrl.endsWith("/v1/shape") ? electricUrl : `${electricUrl}/v1/shape`;

		const buildShape = (tableName: string) => ({
			shape: {
				url: baseUrl,
				table: tableName,
				where: orgWhereClause,
			},
			table: tableName,
			primaryKey: ["id"],
		});

		// Initialize the shapes to sync between PGlite and ElectricSQL service
		syncPlugin = await (pgliteClient as any).electric.syncShapesToTables({
			shapes: {
				organizations: buildShape("organizations"),
				patients: buildShape("patients"),
				appointments: buildShape("appointments"),
				visits: buildShape("visits"),
				communication_events: buildShape("communication_events"),
				communication_tasks: buildShape("communication_tasks"),
				inventory_items: buildShape("inventory_items"),
				treatment_plans: buildShape("treatment_plans"),
				payments: buildShape("payments"),
				users: buildShape("users"),
				crm_leads: buildShape("crm_leads"),
			},
			key: "dente-sync",
			onInitialSync: () => {
				console.log("[SyncEngine] ✅ Sync Engine initialized and connected to Global DB.");
			},
			onError: (err: any) => {
				console.error("[SyncEngine] ❌ Sync error:", err.message || err);
			},
		});

		isSyncing = true;
	} catch (err: any) {
		console.error("[SyncEngine] ❌ Failed to start sync engine:", err.message);
	}
}

export async function stopSyncEngine() {
	if (!isSyncing) return;
	console.log("[SyncEngine] 🛑 Stopping Sync Engine...");
	
	if (syncPlugin && typeof syncPlugin.unsubscribe === "function") {
		try {
			syncPlugin.unsubscribe();
		} catch (err: any) {
			console.warn("[SyncEngine] Warning during unsubscribe:", err.message);
		}
		syncPlugin = null;
	}
	isSyncing = false;
}
