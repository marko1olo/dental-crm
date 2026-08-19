import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createHash, randomUUID } from "node:crypto";
import {
	GENESIS_HASH,
	appendEgiszAuditLog,
	canonicalizeJson,
	computeAuditEntryHash,
	computePayloadSha256,
	verifyAuditLogChain,
} from "./EgiszAuditService.js";

interface TestAuditRow {
	id: string;
	organizationId: string;
	sequenceNumber: number;
	previousHash: string;
	currentHash: string;
	eventType: string;
	entityType: string;
	entityId: string;
	patientId?: string | null | undefined;
	actorUserId?: string | null | undefined;
	payloadJson: unknown;
	payloadSha256: string;
	createdAt: Date;
}

describe("EgiszAuditService — Cryptographic SHA-256 Audit Trail", () => {
	describe("Deterministic JSON Canonicalization & Payload Hash (RFC 8785 subset)", () => {
		it("canonicalizes primitive values correctly", () => {
			assert.equal(canonicalizeJson(null), "null");
			assert.equal(canonicalizeJson(123), "123");
			assert.equal(canonicalizeJson("test"), '"test"');
			assert.equal(canonicalizeJson(true), "true");
			assert.equal(canonicalizeJson(false), "false");
		});

		it("sorts object keys lexicographically regardless of insertion order", () => {
			const obj1 = { zebra: 1, apple: 2, mango: 3 };
			const obj2 = { mango: 3, zebra: 1, apple: 2 };
			const obj3 = { apple: 2, mango: 3, zebra: 1 };

			const canonical1 = canonicalizeJson(obj1);
			const canonical2 = canonicalizeJson(obj2);
			const canonical3 = canonicalizeJson(obj3);

			assert.equal(canonical1, '{"apple":2,"mango":3,"zebra":1}');
			assert.equal(canonical2, '{"apple":2,"mango":3,"zebra":1}');
			assert.equal(canonical3, '{"apple":2,"mango":3,"zebra":1}');

			assert.equal(computePayloadSha256(obj1), computePayloadSha256(obj2));
			assert.equal(computePayloadSha256(obj2), computePayloadSha256(obj3));
		});

		it("recursively canonicalizes nested objects and arrays", () => {
			const nested = {
				z: { delta: 4, beta: 2, alpha: 1 },
				list: [
					{ b: 2, a: 1 },
					{ d: 4, c: 3 },
				],
			};

			const canonical = canonicalizeJson(nested);
			assert.equal(
				canonical,
				'{"list":[{"a":1,"b":2},{"c":3,"d":4}],"z":{"alpha":1,"beta":2,"delta":4}}',
			);
		});

		it("omits undefined properties from canonical json", () => {
			const objWithUndefined = { a: 1, b: undefined, c: "ok" };
			const objClean = { a: 1, c: "ok" };

			assert.equal(
				canonicalizeJson(objWithUndefined),
				canonicalizeJson(objClean),
			);
			assert.equal(
				computePayloadSha256(objWithUndefined),
				computePayloadSha256(objClean),
			);
		});

		it("produces a valid 64-character SHA-256 hex digest for payload", () => {
			const payload = { documentId: "doc-123", amountKopecks: 150000 };
			const hash = computePayloadSha256(payload);

			assert.equal(typeof hash, "string");
			assert.equal(hash.length, 64);
			assert.match(hash, /^[0-9a-f]{64}$/);
		});
	});

	describe("Genesis Hash & Hash Computation Formula", () => {
		it("genesis hash is exactly 64 zero characters", () => {
			assert.equal(
				GENESIS_HASH,
				"0000000000000000000000000000000000000000000000000000000000000000",
			);
			assert.equal(GENESIS_HASH.length, 64);
		});

		it("computeAuditEntryHash adheres to the exact colon-separated SHA-256 contract", () => {
			const params = {
				previousHash: GENESIS_HASH,
				sequenceNumber: 1,
				organizationId: "org-1111-2222",
				eventType: "EGISZ_DOCUMENT_SIGNED",
				entityType: "generated_documents",
				entityId: "doc-5555",
				payloadSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
				timestampIso: "2026-08-18T21:00:00.000Z",
				actorUserId: "user-8888",
			};

			const expectedInput = `${params.previousHash}:${params.sequenceNumber}:${params.organizationId}:${params.eventType}:${params.entityType}:${params.entityId}:${params.payloadSha256}:${params.timestampIso}:${params.actorUserId}`;
			const expectedHash = createHash("sha256")
				.update(expectedInput, "utf8")
				.digest("hex");

			const calculatedHash = computeAuditEntryHash(params);
			assert.equal(calculatedHash, expectedHash);
			assert.equal(calculatedHash.length, 64);
		});

		it("computeAuditEntryHash handles null/undefined actorUserId gracefully with empty string", () => {
			const params = {
				previousHash: GENESIS_HASH,
				sequenceNumber: 1,
				organizationId: "org-1111",
				eventType: "EGISZ_EXPORT_QUEUED",
				entityType: "egisz_outbox",
				entityId: "outbox-9999",
				payloadSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
				timestampIso: "2026-08-18T21:00:00.000Z",
				actorUserId: null,
			};

			const expectedInput = `${params.previousHash}:${params.sequenceNumber}:${params.organizationId}:${params.eventType}:${params.entityType}:${params.entityId}:${params.payloadSha256}:${params.timestampIso}:`;
			const expectedHash = createHash("sha256")
				.update(expectedInput, "utf8")
				.digest("hex");

			const calculatedHash = computeAuditEntryHash(params);
			assert.equal(calculatedHash, expectedHash);
		});
	});

	describe("Sequential Hash Chaining & Chain Verification", () => {
		const orgId = randomUUID();
		const actorId = randomUUID();

		function buildTestChain(count: number, organizationId = orgId): TestAuditRow[] {
			const chain: TestAuditRow[] = [];

			let prevHash = GENESIS_HASH;

			for (let i = 1; i <= count; i++) {
				const id = randomUUID();
				const eventType = `EGISZ_STEP_${i}`;
				const entityType = "generated_documents";
				const entityId = `doc-${i}`;
				const payloadJson = { step: i, action: `action_${i}`, value: i * 100 };
				const payloadSha256 = computePayloadSha256(payloadJson);
				const createdAt = new Date(Date.UTC(2026, 7, 18, 12, i, 0));
				const timestampIso = createdAt.toISOString();

				const currentHash = computeAuditEntryHash({
					previousHash: prevHash,
					sequenceNumber: i,
					organizationId,
					eventType,
					entityType,
					entityId,
					payloadSha256,
					timestampIso,
					actorUserId: actorId,
				});

				chain.push({
					id,
					organizationId,
					sequenceNumber: i,
					previousHash: prevHash,
					currentHash,
					eventType,
					entityType,
					entityId,
					patientId: null,
					actorUserId: actorId,
					payloadJson,
					payloadSha256,
					createdAt,
				});

				prevHash = currentHash;
			}

			return chain;
		}

		it("verifies empty audit log successfully with count 0", () => {
			const result = verifyAuditLogChain([]);
			assert.equal(result.valid, true);
			assert.equal(result.count, 0);
		});

		it("verifies a valid unbroken 5-entry hash chain", () => {
			const chain = buildTestChain(5);
			const result = verifyAuditLogChain(chain);

			assert.equal(result.valid, true);
			assert.equal(result.count, 5);
			assert.equal(result.latestSequenceNumber, 5);
			assert.equal(result.latestHash, chain[4]?.currentHash);
		});

		it("detects tampering when payload is modified", () => {
			const chain = buildTestChain(5);
			const row3 = chain[2];
			assert.ok(row3);
			row3.payloadJson = { step: 3, action: "tampered_action", value: 999999 };

			const result = verifyAuditLogChain(chain);
			assert.equal(result.valid, false);
			assert.equal(result.failedSequenceNumber, 3);
			assert.equal(result.tamperedRowId, row3.id);
			assert.match(result.reason ?? "", /Payload hash mismatch/);
		});

		it("detects tampering when previousHash is modified", () => {
			const chain = buildTestChain(5);
			const row2 = chain[1];
			assert.ok(row2);
			row2.previousHash = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

			const result = verifyAuditLogChain(chain);
			assert.equal(result.valid, false);
			assert.equal(result.failedSequenceNumber, 2);
			assert.equal(result.tamperedRowId, row2.id);
			assert.match(result.reason ?? "", /Previous hash mismatch/);
		});

		it("detects tampering when currentHash is modified", () => {
			const chain = buildTestChain(5);
			const row4 = chain[3];
			assert.ok(row4);
			row4.currentHash = "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";

			const result = verifyAuditLogChain(chain);
			assert.equal(result.valid, false);
			assert.equal(result.failedSequenceNumber, 4);
			assert.equal(result.tamperedRowId, row4.id);
			assert.match(result.reason ?? "", /Current hash mismatch/);
		});

		it("detects sequence number gaps / breaks", () => {
			const chain = buildTestChain(5);
			const row3 = chain[2];
			assert.ok(row3);
			row3.sequenceNumber = 4;

			const result = verifyAuditLogChain(chain);
			assert.equal(result.valid, false);
			assert.equal(result.failedSequenceNumber, 4);
			assert.match(result.reason ?? "", /Sequence break/);
		});

		it("detects genesis block tampering (first record not starting from 64 zeros)", () => {
			const chain = buildTestChain(3);
			const row1 = chain[0];
			assert.ok(row1);
			row1.previousHash = "1111111111111111111111111111111111111111111111111111111111111111";

			const result = verifyAuditLogChain(chain);
			assert.equal(result.valid, false);
			assert.equal(result.failedSequenceNumber, 1);
			assert.match(result.reason ?? "", /Previous hash mismatch/);
		});

		it("detects actorUserId tampering", () => {
			const chain = buildTestChain(4);
			const row2 = chain[1];
			assert.ok(row2);
			row2.actorUserId = "attacker-user-id";

			const result = verifyAuditLogChain(chain);
			assert.equal(result.valid, false);
			assert.equal(result.failedSequenceNumber, 2);
			assert.match(result.reason ?? "", /Current hash mismatch/);
		});
	});

	describe("Multi-Tenant Isolation", () => {
		it("maintains independent hash chains for separate organizations starting at genesis", () => {
			const orgA = randomUUID();
			const orgB = randomUUID();

			const chainA: TestAuditRow[] = [];
			const chainB: TestAuditRow[] = [];

			// Org A chain
			let prevHashA = GENESIS_HASH;
			for (let i = 1; i <= 3; i++) {
				const createdAt = new Date(Date.UTC(2026, 7, 18, 10, i, 0));
				const payload = { org: "A", entry: i };
				const payloadSha256 = computePayloadSha256(payload);
				const currentHash = computeAuditEntryHash({
					previousHash: prevHashA,
					sequenceNumber: i,
					organizationId: orgA,
					eventType: `ORG_A_EVENT_${i}`,
					entityType: "visit",
					entityId: `visit-a-${i}`,
					payloadSha256,
					timestampIso: createdAt.toISOString(),
				});
				chainA.push({
					id: randomUUID(),
					organizationId: orgA,
					sequenceNumber: i,
					previousHash: prevHashA,
					currentHash,
					eventType: `ORG_A_EVENT_${i}`,
					entityType: "visit",
					entityId: `visit-a-${i}`,
					payloadJson: payload,
					payloadSha256,
					createdAt,
				});
				prevHashA = currentHash;
			}

			// Org B chain
			let prevHashB = GENESIS_HASH;
			for (let i = 1; i <= 3; i++) {
				const createdAt = new Date(Date.UTC(2026, 7, 18, 11, i, 0));
				const payload = { org: "B", entry: i };
				const payloadSha256 = computePayloadSha256(payload);
				const currentHash = computeAuditEntryHash({
					previousHash: prevHashB,
					sequenceNumber: i,
					organizationId: orgB,
					eventType: `ORG_B_EVENT_${i}`,
					entityType: "visit",
					entityId: `visit-b-${i}`,
					payloadSha256,
					timestampIso: createdAt.toISOString(),
				});
				chainB.push({
					id: randomUUID(),
					organizationId: orgB,
					sequenceNumber: i,
					previousHash: prevHashB,
					currentHash,
					eventType: `ORG_B_EVENT_${i}`,
					entityType: "visit",
					entityId: `visit-b-${i}`,
					payloadJson: payload,
					payloadSha256,
					createdAt,
				});
				prevHashB = currentHash;
			}

			const firstA = chainA[0];
			const firstB = chainB[0];
			assert.ok(firstA);
			assert.ok(firstB);

			// Both start from GENESIS_HASH
			assert.equal(firstA.previousHash, GENESIS_HASH);
			assert.equal(firstB.previousHash, GENESIS_HASH);

			// Both chains have sequence 1..3
			assert.equal(firstA.sequenceNumber, 1);
			assert.equal(firstB.sequenceNumber, 1);

			// Distinct hashes due to organizationId isolation
			assert.notEqual(firstA.currentHash, firstB.currentHash);

			// Both verify independently
			assert.equal(verifyAuditLogChain(chainA).valid, true);
			assert.equal(verifyAuditLogChain(chainB).valid, true);

			// Cross-tenant mixing fails verification
			const thirdA = chainA[2];
			const secondB = chainB[1];
			assert.ok(thirdA);
			assert.ok(secondB);

			const mixedChain = [firstA, secondB, thirdA];
			const mixedResult = verifyAuditLogChain(mixedChain);
			assert.equal(mixedResult.valid, false);
		});
	});

	describe("appendEgiszAuditLog with Mock Database Transaction", () => {
		it("appends genesis record when no previous records exist", async () => {
			const orgId = randomUUID();
			const fixedDate = new Date("2026-08-18T12:00:00.000Z");

			// biome-ignore lint/suspicious/noExplicitAny: mock
			let insertedValues: any = null;

			const mockTx = {
				select: () => ({
					from: () => ({
						where: () => ({
							orderBy: () => ({
								limit: () => ({
									for: async () => [], // No previous rows -> genesis
								}),
							}),
						}),
					}),
				}),
				insert: () => ({
					// biome-ignore lint/suspicious/noExplicitAny: mock
					values: (vals: any) => {
						insertedValues = vals;
						return {
							returning: async () => [
								{
									id: randomUUID(),
									...vals,
								},
							],
						};
					},
				}),
			};

			// biome-ignore lint/suspicious/noExplicitAny: mock
			const result = await appendEgiszAuditLog(mockTx as any, {
				organizationId: orgId,
				eventType: "EGISZ_EXPORT_QUEUED",
				entityType: "egisz_outbox",
				entityId: "outbox-1",
				payload: { visitId: "vis-1", status: "queued" },
				createdAt: fixedDate,
			});

			assert.equal(result.sequenceNumber, 1);
			assert.equal(result.previousHash, GENESIS_HASH);
			assert.equal(result.organizationId, orgId);
			assert.equal(result.eventType, "EGISZ_EXPORT_QUEUED");
			assert.equal(insertedValues.sequenceNumber, 1);
			assert.equal(insertedValues.previousHash, GENESIS_HASH);
			assert.equal(insertedValues.currentHash, result.currentHash);
		});

		it("chains sequential record to existing last record", async () => {
			const orgId = randomUUID();
			const fixedDate = new Date("2026-08-18T12:05:00.000Z");
			const existingHash = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";

			// biome-ignore lint/suspicious/noExplicitAny: mock
			let insertedValues: any = null;

			const mockTx = {
				select: () => ({
					from: () => ({
						where: () => ({
							orderBy: () => ({
								limit: () => ({
									for: async () => [
										{
											sequenceNumber: 1,
											currentHash: existingHash,
										},
									],
								}),
							}),
						}),
					}),
				}),
				insert: () => ({
					// biome-ignore lint/suspicious/noExplicitAny: mock
					values: (vals: any) => {
						insertedValues = vals;
						return {
							returning: async () => [
								{
									id: randomUUID(),
									...vals,
								},
							],
						};
					},
				}),
			};

			// biome-ignore lint/suspicious/noExplicitAny: mock
			const result = await appendEgiszAuditLog(mockTx as any, {
				organizationId: orgId,
				eventType: "EGISZ_DOCUMENT_DELIVERED",
				entityType: "egisz_outbox",
				entityId: "outbox-1",
				payload: { remdDocumentId: "remd-777", status: "delivered_to_epgu" },
				actorUserId: "doctor-123",
				createdAt: fixedDate,
			});

			assert.equal(result.sequenceNumber, 2);
			assert.equal(result.previousHash, existingHash);
			assert.equal(insertedValues.sequenceNumber, 2);
			assert.equal(insertedValues.previousHash, existingHash);
		});
	});
});
