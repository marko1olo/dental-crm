import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { mergeFieldLevelCrdt } from "@dental/shared";

describe("STRESS 8: Field-Level CRDT LWW tie-breaker resolution", () => {
	test("Deterministic tie-breaking when timestamps are EXACTLY identical", () => {
		const identicalTimestamp = "2026-08-24T12:00:00.000Z";
		const serverEntity = { id: "pat-tie-1", diagnosis: "K02.0 Кариес эмали", phone: "+7 (999) 111-22-33" };
		const serverVector = { diagnosis: { updatedAt: identicalTimestamp, version: 1 }, phone: { updatedAt: identicalTimestamp, version: 1 } };

		const resHigher = mergeFieldLevelCrdt<{ id: string; diagnosis: string; phone: string }>({
			entityKind: "patient",
			entityId: "pat-tie-1",
			serverEntity,
			serverVector,
			clientPatch: { diagnosis: "K02.1 Кариес дентина" },
			clientVector: { diagnosis: { updatedAt: identicalTimestamp, version: 1 } },
			clientUpdatedAt: identicalTimestamp,
			clientId: "client-a",
		});

		assert.strictEqual(resHigher.mergedEntity.diagnosis, "K02.1 Кариес дентина");
		assert.strictEqual(resHigher.conflicts.length, 1);
		assert.strictEqual(resHigher.conflicts[0]!.winner, "client");

		const resLower = mergeFieldLevelCrdt<{ id: string; diagnosis: string; phone: string }>({
			entityKind: "patient",
			entityId: "pat-tie-1",
			serverEntity,
			serverVector,
			clientPatch: { diagnosis: "K01.0 Ретенированные зубы" },
			clientVector: { diagnosis: { updatedAt: identicalTimestamp, version: 1 } },
			clientUpdatedAt: identicalTimestamp,
			clientId: "client-b",
		});

		assert.strictEqual(resLower.mergedEntity.diagnosis, "K02.0 Кариес эмали");
		assert.strictEqual(resLower.conflicts.length, 1);
		assert.strictEqual(resLower.conflicts[0]!.winner, "server");
	});
});
