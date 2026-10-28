import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
	enqueueOfflineMutation,
	getPendingOfflineMutations,
	lanMeshReplicationService,
	offlineSyncService,
} from "../../index";
import { setupStressTestEnv } from "./testEnvironment";

describe("STRESS 31: 3-Tier Seamless Network Transition", () => {
	let env: ReturnType<typeof setupStressTestEnv>;
	beforeEach(() => { env = setupStressTestEnv(); });
	afterEach(() => { env.cleanup(); });

	test("Autonomous Offline -> LAN Local Mesh -> Cloud PostgreSQL", async () => {
		const orgId = "org-3tier-31";

		lanMeshReplicationService.setSyncTier("autonomous_offline");
		assert.strictEqual(lanMeshReplicationService.getActiveTier(), "autonomous_offline");

		await enqueueOfflineMutation({ entityType: "patient", entityId: "pat-field-1", action: "create", payload: { fullName: "Полевой" }, organizationId: orgId });
		await enqueueOfflineMutation({ entityType: "DIARY_043_DRAFT", entityId: "pat-field-1", action: "update", payload: { complaints: "Осмотр" }, organizationId: orgId });

		assert.strictEqual((await getPendingOfflineMutations({ organizationId: orgId })).length, 2);

		const localServer = {
			serverName: "DENTE Local", serverId: "clinic-lan-box-1", baseUrl: "http://192.168.1.100:4100", apiPort: 4100,
			hostname: "clinic.local", lanAddresses: ["192.168.1.100"], version: "0.1.0", status: "online" as const, latencyMs: 2, discoveredAt: new Date().toISOString(),
		};

		const tierAfterLan = lanMeshReplicationService.evaluateNetworkTier({ isOnline: false, isCloudReachable: false, lanServer: localServer });
		assert.strictEqual(tierAfterLan, "lan_local_mesh");

		const tierAfterCloud = lanMeshReplicationService.evaluateNetworkTier({ isOnline: true, isCloudReachable: true, lanServer: localServer });
		assert.strictEqual(tierAfterCloud, "cloud_postgresql");

		const mockCloudDrain = async (_url: string | URL | Request, init?: RequestInit) => {
			const body = JSON.parse(String(init?.body || "{}"));
			const results = body.mutations.map((m: any) => ({
				mutationId: m.mutationId, idempotencyKey: m.idempotencyKey, status: "applied",
				entityKind: m.entityKind, entityId: m.entityId, appliedAt: new Date().toISOString(),
			}));
			return new Response(JSON.stringify({ syncBatchId: body.syncBatchId, processedCount: results.length, appliedCount: results.length, results }), { status: 200, headers: { "Content-Type": "application/json" } });
		};

		const drainRes = await offlineSyncService.drainOutbox({ organizationId: orgId, fetchImpl: mockCloudDrain as unknown as typeof fetch });
		assert.strictEqual(drainRes.appliedCount, 2);
		assert.strictEqual((await getPendingOfflineMutations({ organizationId: orgId })).length, 0);
	});
});
