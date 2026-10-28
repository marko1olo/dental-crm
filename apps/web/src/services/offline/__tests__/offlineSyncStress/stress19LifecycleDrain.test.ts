import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
	enqueueOfflineMutation,
	getPendingOfflineMutations,
	offlineSyncService,
} from "../../index";
import { setupStressTestEnv } from "./testEnvironment";

describe("STRESS 19: Browser visibilitychange & focus event handlers", () => {
	let env: ReturnType<typeof setupStressTestEnv>;
	beforeEach(() => { env = setupStressTestEnv(); });
	afterEach(() => { env.cleanup(); });

	test("Trigger automatic immediate outbox drain upon tab focus", async () => {
		const orgId = "org-visibility-test-19";

		await enqueueOfflineMutation({ entityType: "DIARY_043_DRAFT", entityId: "vis-1", payload: { a: 1 }, organizationId: orgId });
		await enqueueOfflineMutation({ entityType: "ODONTOGRAM_STATUS", entityId: "vis-2", payload: { a: 2 }, organizationId: orgId });
		await enqueueOfflineMutation({ entityType: "DOCUMENT_DRAFT", entityId: "vis-3", payload: { a: 3 }, organizationId: orgId });

		let drainExecuted = false;
		const mockGatewayFetch = async (_url: string | URL | Request, init?: RequestInit): Promise<Response> => {
			drainExecuted = true;
			const body = JSON.parse(String(init?.body || "{}"));
			const results = body.mutations.map((m: any) => ({
				mutationId: m.mutationId, idempotencyKey: m.idempotencyKey, status: "applied",
				entityKind: "visit_diary", entityId: "vis", appliedAt: new Date().toISOString(),
			}));
			return new Response(JSON.stringify({
				syncBatchId: body.syncBatchId, processedCount: results.length, appliedCount: results.length,
				results, serverTime: new Date().toISOString(),
			}), { status: 200, headers: { "Content-Type": "application/json" } });
		};

		const documentListeners = new Map<string, Function>();
		const windowListeners = new Map<string, Function>();
		const mockDoc = {
			visibilityState: "visible",
			addEventListener: (event: string, fn: Function) => { documentListeners.set(event, fn); },
			removeEventListener: (event: string) => { documentListeners.delete(event); },
		};

		const prevDoc = (globalThis as any).document;
		(globalThis as any).document = mockDoc;
		const mockWin = {
			...(globalThis as any).window,
			addEventListener: (event: string, fn: Function) => { windowListeners.set(event, fn); },
			removeEventListener: (event: string) => { windowListeners.delete(event); },
		};
		(globalThis as any).window = mockWin;
		const prevFetch = globalThis.fetch;
		globalThis.fetch = mockGatewayFetch as unknown as typeof fetch;

		try {
			offlineSyncService.cleanupBrowserLifecycleListeners();
			offlineSyncService.initBrowserLifecycleListeners();

			assert.ok(documentListeners.has("visibilitychange"));
			assert.ok(windowListeners.has("focus"));
			assert.ok(windowListeners.has("online"));

			mockDoc.visibilityState = "visible";
			const visHandler = documentListeners.get("visibilitychange");
			assert.ok(visHandler);
			visHandler();

			const deadline = Date.now() + 3000;
			while (!drainExecuted && Date.now() < deadline) {
				await new Promise((resolve) => setTimeout(resolve, 50));
			}

			assert.strictEqual(drainExecuted, true);
			const pendingAfter = await getPendingOfflineMutations({ organizationId: orgId });
			assert.strictEqual(pendingAfter.length, 0);
		} finally {
			offlineSyncService.cleanupBrowserLifecycleListeners();
			(globalThis as any).document = prevDoc;
			globalThis.fetch = prevFetch;
		}
	});
});
