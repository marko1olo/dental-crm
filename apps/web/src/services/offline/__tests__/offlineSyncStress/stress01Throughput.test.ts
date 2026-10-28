import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { enqueueOfflineMutation, getPendingOfflineMutations } from "../../index";
import type { OfflineMutation } from "../../types";
import { setupStressTestEnv } from "./testEnvironment";

describe("STRESS 1: High-throughput outbox enqueueing", () => {
	let env: ReturnType<typeof setupStressTestEnv>;
	beforeEach(() => { env = setupStressTestEnv(); });
	afterEach(() => { env.cleanup(); });

	test("100 rapid mutations across 5 clinical domains sorted chronologically", async () => {
		const totalMutations = 100;
		const domainTypes = [
			"DIARY_043_DRAFT",
			"ODONTOGRAM_STATUS",
			"PRESCRIPTION_107_DRAFT",
			"DOCUMENT_DRAFT",
			"CASH_RECEIPT_DRAFT",
		] as const;

		const baseTime = Date.now();
		const enqueuePromises: Promise<OfflineMutation<any>>[] = [];

		for (let i = 0; i < totalMutations; i++) {
			const entityType = domainTypes[i % domainTypes.length]!;
			const timestamp = new Date(baseTime + i * 10).toISOString();
			enqueuePromises.push(
				enqueueOfflineMutation({
					entityType,
					entityId: `entity-${i}`,
					action: i % 2 === 0 ? "update" : "create",
					payload: { index: i, domain: entityType, description: `Запись ${i}` },
					timestamp,
					organizationId: "org-stress-1",
				}),
			);
		}

		const created = await Promise.all(enqueuePromises);
		assert.strictEqual(created.length, totalMutations);
		const uuidSet = new Set(created.map((m) => m.mutationId));
		assert.strictEqual(uuidSet.size, totalMutations, "All 100 UUIDs must be strictly unique");

		const pending = await getPendingOfflineMutations({ organizationId: "org-stress-1" });
		assert.strictEqual(pending.length, totalMutations);
		for (let i = 0; i < pending.length - 1; i++) {
			assert.ok(pending[i]!.timestampMs <= pending[i + 1]!.timestampMs, "Sorted by timestampMs");
		}
	});
});
