import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LocalOfflineDatabaseManager } from "../hardware/offlineDatabaseEngine.js";

describe("Local Offline Database Engine & Storage Failover (offlineDatabaseEngine.test.ts)", () => {
	it("1. Initializes with sensible defaults for local clinic LAN PostgreSQL 18", () => {
		const mgr = new LocalOfflineDatabaseManager();
		const cfg = mgr.getConfig();

		assert.equal(cfg.engineType, "postgres_native");
		assert.equal(cfg.syncMode, "lan_primary_sync");
		assert.equal(cfg.host, "127.0.0.1");
		assert.equal(cfg.port, 5432);
		assert.equal(cfg.databaseName, "dente_clinic");
		assert.equal(cfg.pendingMutationsCount, 0);
	});

	it("2. Evaluates failover dynamically based on LAN heartbeat and Internet availability", () => {
		const mgr = new LocalOfflineDatabaseManager();

		// Case A: Online + Local PostgreSQL available -> Lan primary sync
		const decOnline = mgr.evaluateFailover(true, true);
		assert.equal(decOnline.activeEngine, "postgres_native");
		assert.equal(decOnline.syncMode, "lan_primary_sync");
		assert.equal(decOnline.offlineQueueActive, false);
		assert.equal(decOnline.connectionString, "postgresql://127.0.0.1:5432/dente_clinic");

		// Case B: No Internet, but Local PostgreSQL is healthy on clinic LAN -> Isolated offline
		const decLanOnly = mgr.evaluateFailover(true, false);
		assert.equal(decLanOnly.activeEngine, "postgres_native");
		assert.equal(decLanOnly.syncMode, "isolated_offline");
		assert.equal(decLanOnly.offlineQueueActive, false);

		// Case C: Local PostgreSQL unreachable -> Embedded SQLite failover
		const decOffline = mgr.evaluateFailover(false, false);
		assert.equal(decOffline.activeEngine, "sqlite_standalone");
		assert.equal(decOffline.syncMode, "isolated_offline");
		assert.equal(decOffline.offlineQueueActive, true);
		assert.equal(decOffline.connectionString, "sqlite://./local_offline_dente.db");
	});

	it("3. Enqueues offline mutations with zero Math.random() and monotonic sequence keys", () => {
		const mgr = new LocalOfflineDatabaseManager();

		const mut1 = mgr.enqueueMutation({
			organizationId: "org-1",
			entityType: "visit",
			entityId: "vis-101",
			action: "create",
			payloadJson: JSON.stringify({ patientId: "pat-1" }),
		});

		const mut2 = mgr.enqueueMutation({
			organizationId: "org-1",
			entityType: "visit",
			entityId: "vis-102",
			action: "update",
			payloadJson: JSON.stringify({ status: "completed" }),
		});

		assert.ok(typeof mut1.id === "string");
		assert.ok(typeof mut2.id === "string");
		assert.notEqual(mut1.id, mut2.id);

		// Format: mut-{timestamp}-{sequence}-{alphanumeric4}
		assert.match(mut1.id, /^mut-\d+-\d+-[a-z0-9]{4}$/);
		assert.match(mut2.id, /^mut-\d+-\d+-[a-z0-9]{4}$/);

		const pending = mgr.getPendingMutations();
		assert.equal(pending.length, 2);
		assert.equal(mgr.getConfig().pendingMutationsCount, 2);

		// Mark first mutation as synced
		mgr.markMutationSynced(mut1.id);
		assert.equal(mgr.getPendingMutations().length, 1);
		assert.equal(mgr.getConfig().pendingMutationsCount, 1);

		// Clear synced
		mgr.clearSynced();
		assert.equal(mgr.getPendingMutations().length, 1);

		// Clear all
		mgr.clearAll();
		assert.equal(mgr.getPendingMutations().length, 0);
	});
});
