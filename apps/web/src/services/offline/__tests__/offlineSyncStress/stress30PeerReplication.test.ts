import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { enqueueOfflineMutation, getPendingOfflineMutations, lanMeshReplicationService } from "../../index";
import { setupStressTestEnv } from "./testEnvironment";

describe("STRESS 30: Multi-Workstation Wi-Fi Mesh discovery & P2P replication", () => {
	let env: ReturnType<typeof setupStressTestEnv>;
	beforeEach(() => { env = setupStressTestEnv(); });
	afterEach(() => { env.cleanup(); });

	test("Peer-to-peer replication between doctor tablet and reception PC without internet", async () => {
		const orgId = "org-mesh-p2p-30";

		lanMeshReplicationService.configure({
			nodeRole: "doctor_tablet",
			nodeName: "Планшет Стоматолога 1",
			organizationId: orgId,
		});

		const receptionPeer = {
			nodeId: "reception-pc-01",
			role: "reception_workstation" as const,
			name: "ПК Ресепшн",
			baseUrl: "http://192.168.1.50:4100",
			ipAddresses: ["192.168.1.50"],
			port: 4100,
			lastSeenIso: new Date().toISOString(),
			status: "online" as const,
			organizationId: orgId,
		};
		lanMeshReplicationService.registerPeerNode(receptionPeer);
		assert.strictEqual(lanMeshReplicationService.getKnownPeers().length, 1);

		for (let i = 1; i <= 5; i++) {
			await enqueueOfflineMutation({
				entityType: i % 2 === 0 ? "DIARY_043_DRAFT" : "ODONTOGRAM_STATUS",
				entityId: `pat-mesh-30-${i}`,
				action: "update",
				payload: { anamnesis: `Запись #${i}`, toothNumber: 15 + i },
				organizationId: orgId,
			});
		}

		assert.strictEqual((await getPendingOfflineMutations({ organizationId: orgId })).length, 5);

		const mockPeerFetch = async (_url: string | URL | Request, init?: RequestInit) => {
			const req = JSON.parse(String(init?.body || "{}"));
			const results = (req.mutations || []).map((m: any) => ({
				mutationId: m.mutationId, idempotencyKey: m.idempotencyKey, status: "applied",
				entityKind: m.entityKind, entityId: m.entityId, appliedAt: new Date().toISOString(),
			}));

			return new Response(JSON.stringify({
				exchangeId: req.exchangeId, responderNodeId: "reception-pc-01",
				responderVectorClock: { "reception-pc-01": 10, [req.senderNodeId]: 5 },
				processedMutationsCount: results.length, appliedMutationsCount: results.length,
				returnMutations: [], results, responderTime: new Date().toISOString(),
			}), { status: 200, headers: { "Content-Type": "application/json" } });
		};

		const replicationRes = await lanMeshReplicationService.replicateWithPeer(receptionPeer, {
			fetchImpl: mockPeerFetch as unknown as typeof fetch,
		});

		assert.ok(replicationRes);
		assert.strictEqual(replicationRes.appliedMutationsCount, 5);
		assert.strictEqual(lanMeshReplicationService.getVectorClock()["reception-pc-01"], 10);
		assert.strictEqual((await getPendingOfflineMutations({ organizationId: orgId })).length, 0);
	});
});
