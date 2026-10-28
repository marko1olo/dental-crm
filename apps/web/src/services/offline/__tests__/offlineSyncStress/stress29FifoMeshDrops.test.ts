import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { enqueueOfflineMutation, getPendingOfflineMutations, offlineSyncService } from "../../index";
import { setupStressTestEnv } from "./testEnvironment";

describe("STRESS 29: 50 concurrent offline mutations FIFO order", () => {
	let env: ReturnType<typeof setupStressTestEnv>;
	beforeEach(() => { env = setupStressTestEnv(); });
	afterEach(() => { env.cleanup(); });

	test("Strict FIFO order and 0% data loss under chaotic Wi-Fi packet drops", async () => {
		const orgId = "org-chaotic-wifi-29";
		const domainTypes = ["visit", "odontogram", "payment", "appointment", "patient"] as const;
		const totalMutations = 50;

		for (let i = 1; i <= totalMutations; i++) {
			const domain = domainTypes[(i - 1) % domainTypes.length]!;
			await enqueueOfflineMutation({
				entityType: domain,
				entityId: `entity_${domain}_29_${i}`,
				action: "create",
				payload: { seqIndex: i, domain },
				organizationId: orgId,
			});
		}

		let attemptCounter = 0;
		const serverReceivedSeqOrder: number[] = [];

		const chaoticWifiFetchImpl = async (_url: string | URL | Request, init?: RequestInit) => {
			attemptCounter++;
			const body = JSON.parse(String(init?.body || "{}")) as { mutations: Array<{ mutationId: string; payload: { seqIndex: number } }> };

			if (attemptCounter === 1) throw new TypeError("Wi-Fi packet dropped");
			if (attemptCounter === 2) return new Response(JSON.stringify({ error: "HTTP 503" }), { status: 503 });
			if (attemptCounter === 3) return new Response(JSON.stringify({ error: "HTTP 429" }), { status: 429 });

			const results = body.mutations.map((m) => {
				serverReceivedSeqOrder.push(m.payload.seqIndex);
				return { mutationId: m.mutationId, status: "applied", entityKind: "visit", entityId: m.mutationId, action: "create", appliedAt: new Date().toISOString() };
			});

			return new Response(JSON.stringify({ batchId: `wifi_batch_${attemptCounter}`, results }), { status: 200, headers: { "Content-Type": "application/json" } });
		};

		const drainResult = await offlineSyncService.drainOutbox({
			batchSize: 10, maxRetries: 4, baseBackoffMs: 20, maxBackoffMs: 100, jitter: false,
			organizationId: orgId, fetchImpl: chaoticWifiFetchImpl as unknown as typeof fetch,
		});

		assert.strictEqual(drainResult.appliedCount, totalMutations);
		assert.strictEqual(serverReceivedSeqOrder.length, totalMutations);
		for (let i = 0; i < totalMutations; i++) {
			assert.strictEqual(serverReceivedSeqOrder[i], i + 1);
		}

		const remaining = await getPendingOfflineMutations({ organizationId: orgId });
		assert.strictEqual(remaining.length, 0);
	});
});
