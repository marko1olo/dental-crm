import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
	enqueueOfflineMutation,
	getPendingOfflineMutations,
	offlineSyncService,
} from "../../index";
import { discoverLocalClinicServer } from "../../../lanDiscovery/lanServerDiscovery";
import { setupStressTestEnv } from "./testEnvironment";

describe("STRESS 11: Multi-Cabinet Clinic Wi-Fi Mesh & LAN Microserver Sync", () => {
	let env: ReturnType<typeof setupStressTestEnv>;
	beforeEach(() => { env = setupStressTestEnv(); });
	afterEach(() => { env.cleanup(); });

	test("WAN outage failover to LAN microserver over Wi-Fi without dropped mutations", async () => {
		const orgId = "org-mesh-clinic";
		const mutations = [
			{ entityType: "DIARY_043_DRAFT", entityId: "visit-101", payload: { anamnesis: "Лечение 16", doctorName: "Д-р Смирнов" } },
			{ entityType: "ODONTOGRAM_STATUS", entityId: "visit-102", payload: { toothNumber: 48, state: "extracted_absent" } },
			{ entityType: "DOCUMENT_DRAFT", entityId: "visit-201", payload: { patientFullName: "Соколова М.П.", serviceName: "КТ" } },
			{ entityType: "DOCUMENT_DRAFT", entityId: "ct-scan-301", payload: { studyInstanceUid: "1.2.392.101", modality: "CT" } },
		] as const;

		for (const m of mutations) {
			await enqueueOfflineMutation({ ...m, organizationId: orgId });
		}
		const pendingBefore = await getPendingOfflineMutations({ organizationId: orgId });
		assert.strictEqual(pendingBefore.length, 4);

		const mockNetworkFetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
			const urlStr = String(url);
			if (urlStr.includes("/api/health/discovery") && (urlStr.includes("dente-server.local:4100") || urlStr.includes("192.168.1.100:4100"))) {
				return new Response(JSON.stringify({
					serverName: "LAN Microserver", serverId: "lan-01", apiPort: 4100,
					hostname: "dente-server.local", lanAddresses: ["192.168.1.100"], status: "online", version: "0.1.0",
				}), { status: 200, headers: { "Content-Type": "application/json" } });
			}

			if (urlStr.includes("dente-server.local:4100") || urlStr.includes("192.168.1.100:4100")) {
				const body = JSON.parse(String(init?.body || "{}"));
				const results = (body.mutations || []).map((m: any) => ({
					mutationId: m.mutationId, idempotencyKey: m.idempotencyKey, status: "applied",
					entityKind: "clinical_record", entityId: "mesh-entity", appliedAt: new Date().toISOString(),
				}));
				return new Response(JSON.stringify({
					syncBatchId: body.syncBatchId, processedCount: results.length, appliedCount: results.length,
					results, serverTime: new Date().toISOString(),
				}), { status: 200, headers: { "Content-Type": "application/json" } });
			}
			throw new TypeError("Failed to fetch: WAN Cloud Gateway unreachable");
		};

		const origFetch = globalThis.fetch;
		globalThis.fetch = mockNetworkFetch as unknown as typeof fetch;
		try {
			const discovered = await discoverLocalClinicServer({ forceRefresh: true, additionalCandidates: ["http://dente-server.local:4100"] });
			assert.ok(discovered);
			assert.strictEqual(discovered?.hostname, "dente-server.local");

			const lanDrain = await offlineSyncService.drainOutbox({
				organizationId: orgId, batchSize: 50, fetchImpl: mockNetworkFetch as unknown as typeof fetch,
				gatewayUrl: `${discovered.baseUrl}/api/sync/gateway/drain`,
			});
			assert.strictEqual(lanDrain.processedCount, 4);
			assert.strictEqual(lanDrain.appliedCount, 4);

			const pendingAfter = await getPendingOfflineMutations({ organizationId: orgId });
			assert.strictEqual(pendingAfter.length, 0);
		} finally {
			globalThis.fetch = origFetch;
		}
	});
});
