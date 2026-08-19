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

interface TestRow {
	id: string;
	organizationId: string;
	sequenceNumber: number;
	previousHash: string;
	currentHash: string;
	eventType: string;
	entityType: string;
	entityId: string;
	patientId?: string | null;
	actorUserId?: string | null;
	payloadJson: unknown;
	payloadSha256: string;
	createdAt: Date;
}

describe("EgiszAuditService — Adversarial & Stress Challenge", () => {
	// =========================================================================
	// 1. EXTREME PAYLOAD CHALLENGES
	// =========================================================================
	describe("1. Extreme Payloads & Data Types", () => {
		it("handles 100 levels of nested objects deterministically", () => {
			let deepObj: Record<string, unknown> = { leaf: "value_at_depth_100" };
			for (let i = 99; i >= 1; i--) {
				deepObj = { [`level_${i.toString().padStart(3, "0")}`]: deepObj };
			}

			const canonical1 = canonicalizeJson(deepObj);
			const hash1 = computePayloadSha256(deepObj);

			// Reconstruct with shuffled key insertion
			let deepObjReordered: Record<string, unknown> = { leaf: "value_at_depth_100" };
			for (let i = 99; i >= 1; i--) {
				const container: Record<string, unknown> = {};
				container[`level_${i.toString().padStart(3, "0")}`] = deepObjReordered;
				deepObjReordered = container;
			}

			const canonical2 = canonicalizeJson(deepObjReordered);
			const hash2 = computePayloadSha256(deepObjReordered);

			assert.equal(canonical1, canonical2);
			assert.equal(hash1, hash2);
			assert.equal(hash1.length, 64);
		});

		it("handles wide objects (1,000 keys) with randomized insertion order and guarantees identical hash", () => {
			const keys: string[] = [];
			for (let i = 0; i < 1000; i++) {
				keys.push(`key_${randomUUID()}_${i}`);
			}

			const objA: Record<string, unknown> = {};
			for (const k of keys) {
				objA[k] = { val: k, num: 42 };
			}

			// Reverse order
			const objB: Record<string, unknown> = {};
			for (const k of [...keys].reverse()) {
				objB[k] = { val: k, num: 42 };
			}

			// Random shuffle order
			const shuffledKeys = [...keys].sort(() => Math.random() - 0.5);
			const objC: Record<string, unknown> = {};
			for (const k of shuffledKeys) {
				objC[k] = { val: k, num: 42 };
			}

			const canonicalA = canonicalizeJson(objA);
			const canonicalB = canonicalizeJson(objB);
			const canonicalC = canonicalizeJson(objC);

			assert.equal(canonicalA, canonicalB);
			assert.equal(canonicalB, canonicalC);

			const hashA = computePayloadSha256(objA);
			const hashB = computePayloadSha256(objB);
			const hashC = computePayloadSha256(objC);

			assert.equal(hashA, hashB);
			assert.equal(hashB, hashC);
		});

		it("handles unicode strings: Cyrillic medical records, typography, quotes, and symbols", () => {
			const payload = {
				diagnosis: "Хронический глубокий кариес зуба 1.6 (К02.1), острый пульпит зуба 2.4 (К04.0)",
				anamnesis: "Пациент жалуется на ноющие боли от температурных раздражителей (t° > 40°C), «прострелы» в висок.",
				doctorNotes: "Проведена анестезия Sol. Ubistesini 4% — 1.7 ml. Препарирование кариозной полости №16.",
				surfaceTable: {
					"16": ["V", "O", "M"],
					"24": ["D", "L"],
				},
				priceKopecks: 1250000,
			};

			const hash = computePayloadSha256(payload);
			assert.equal(typeof hash, "string");
			assert.equal(hash.length, 64);

			// Round-trip stability
			const hash2 = computePayloadSha256(JSON.parse(JSON.stringify(payload)));
			assert.equal(hash, hash2);
		});

		it("handles emojis, multi-byte UTF-8, ZWJ sequences, skin tones, and surrogate pairs", () => {
			const emojiPayload = {
				tooth: "🦷",
				syringe: "💉",
				doctorMan: "👨‍⚕️",
				doctorWomanDark: "👩🏿‍⚕️",
				flagRu: "🇷🇺",
				specialMath: "∑∏∆√∞≠≤≥",
				surrogates: "\uD83D\uDE00\uD83D\uDC68\u200D\u2695\uFE0F",
				nullByteInside: "zero\u0000byte",
				controlChars: "line1\r\nline2\t\b\f\\\"end",
			};

			const canonical = canonicalizeJson(emojiPayload);
			const hash = computePayloadSha256(emojiPayload);

			assert.ok(canonical.includes("🦷"));
			assert.ok(canonical.includes("👨‍⚕️"));
			assert.equal(hash.length, 64);

			// Determinism check
			const parsed = JSON.parse(JSON.stringify(emojiPayload));
			assert.equal(computePayloadSha256(parsed), hash);
		});

		it("handles IEEE 754 floating point numbers and numeric precision extremes", () => {
			const floatsPayload = {
				floatPrecision: 0.1 + 0.2, // 0.30000000000000004
				maxSafeInt: Number.MAX_SAFE_INTEGER,
				minSafeInt: Number.MIN_SAFE_INTEGER,
				tinyFloat: 1e-15,
				largeFloat: 1.23456789e12,
				zero: 0,
				negativeZero: -0,
			};

			const canonical = canonicalizeJson(floatsPayload);
			const hash = computePayloadSha256(floatsPayload);

			assert.equal(hash.length, 64);
			assert.equal(canonicalizeJson(floatsPayload), canonical);
		});

		it("strictly preserves array element order while sorting object keys", () => {
			// Array order matters! [2, 1] !== [1, 2]
			const arr1 = [{ z: 9, a: 1 }, { y: 8, b: 2 }];
			const arr2 = [{ y: 8, b: 2 }, { z: 9, a: 1 }];

			const canonicalArr1 = canonicalizeJson(arr1);
			const canonicalArr2 = canonicalizeJson(arr2);

			assert.equal(canonicalArr1, '[{"a":1,"z":9},{"b":2,"y":8}]');
			assert.equal(canonicalArr2, '[{"b":2,"y":8},{"a":1,"z":9}]');
			assert.notEqual(canonicalArr1, canonicalArr2);
			assert.notEqual(computePayloadSha256(arr1), computePayloadSha256(arr2));

			// Array of strings order matters
			const strArr1 = ["zebra", "apple", "banana"];
			const strArr2 = ["apple", "banana", "zebra"];
			assert.notEqual(canonicalizeJson(strArr1), canonicalizeJson(strArr2));
		});

		it("handles shared object references (DAG / diamond graph) without duplicating or corrupting", () => {
			const sharedChild = { sharedProp: "hello", count: 42 };
			const dag = {
				ref1: sharedChild,
				ref2: sharedChild,
				other: 100,
			};

			const canonical = canonicalizeJson(dag);
			assert.equal(
				canonical,
				'{"other":100,"ref1":{"count":42,"sharedProp":"hello"},"ref2":{"count":42,"sharedProp":"hello"}}',
			);
			assert.equal(computePayloadSha256(dag).length, 64);
		});
	});

	// =========================================================================
	// 2. ADVERSARIAL TAMPERING & INTEGRITY CHALLENGES
	// =========================================================================
	describe("2. Adversarial Tampering Scenarios", () => {
		function createValidChain(length: number, orgId: string): TestRow[] {
			const chain: TestRow[] = [];
			let prevHash = GENESIS_HASH;

			for (let seq = 1; seq <= length; seq++) {
				const id = randomUUID();
				const eventType = "PATIENT_RECORD_VIEWED";
				const entityType = "patient";
				const entityId = `pat-${seq}`;
				const actorUserId = `doc-${seq % 3}`;
				const payloadJson = {
					patientId: entityId,
					action: "READ_MEDICAL_HISTORY",
					accessCount: seq,
				};
				const payloadSha256 = computePayloadSha256(payloadJson);
				const createdAt = new Date(Date.UTC(2026, 7, 18, 14, seq, 0));
				const timestampIso = createdAt.toISOString();

				const currentHash = computeAuditEntryHash({
					previousHash: prevHash,
					sequenceNumber: seq,
					organizationId: orgId,
					eventType,
					entityType,
					entityId,
					payloadSha256,
					timestampIso,
					actorUserId,
				});

				chain.push({
					id,
					organizationId: orgId,
					sequenceNumber: seq,
					previousHash: prevHash,
					currentHash,
					eventType,
					entityType,
					entityId,
					actorUserId,
					payloadJson,
					payloadSha256,
					createdAt,
				});

				prevHash = currentHash;
			}

			return chain;
		}

		it("detects single-byte payload tampering (1 bit / 1 char change)", () => {
			const orgId = randomUUID();
			const chain = createValidChain(10, orgId);

			// Tamper record at index 5: change a single char in payloadJson
			const target = chain[5];
			assert.ok(target);
			target.payloadJson = {
				patientId: target.entityId,
				action: "READ_MEDICAL_HISTORY",
				accessCount: 6000000, // modified
			};

			const result = verifyAuditLogChain(chain);
			assert.equal(result.valid, false);
			assert.equal(result.failedSequenceNumber, 6);
			assert.equal(result.tamperedRowId, target.id);
			assert.match(result.reason ?? "", /Payload hash mismatch/);
		});

		it("detects payload tampering if an attacker updates payloadSha256 but cannot rewrite currentHash", () => {
			const orgId = randomUUID();
			const chain = createValidChain(5, orgId);

			// Attacker modifies payload and ALSO updates payloadSha256 column
			const target = chain[2];
			assert.ok(target);
			target.payloadJson = { tampered: true };
			target.payloadSha256 = computePayloadSha256(target.payloadJson);

			// But target.currentHash was computed over the old payloadSha256!
			const result = verifyAuditLogChain(chain);
			assert.equal(result.valid, false);
			assert.equal(result.failedSequenceNumber, 3);
			assert.equal(result.tamperedRowId, target.id);
			assert.match(result.reason ?? "", /Current hash mismatch/);
		});

		it("detects timestamp tampering (1 millisecond drift)", () => {
			const orgId = randomUUID();
			const chain = createValidChain(5, orgId);

			const target = chain[3];
			assert.ok(target);
			// Drift timestamp by 1 millisecond
			target.createdAt = new Date(target.createdAt.getTime() + 1);

			const result = verifyAuditLogChain(chain);
			assert.equal(result.valid, false);
			assert.equal(result.failedSequenceNumber, 4);
			assert.equal(result.tamperedRowId, target.id);
			assert.match(result.reason ?? "", /Current hash mismatch/);
		});

		it("detects sequence number skipping (e.g. seq 1, 2, 4, 5)", () => {
			const orgId = randomUUID();
			const chain = createValidChain(5, orgId);

			// Skip sequence 3 by removing it
			chain.splice(2, 1);

			const result = verifyAuditLogChain(chain);
			assert.equal(result.valid, false);
			assert.equal(result.failedSequenceNumber, 4);
			assert.match(result.reason ?? "", /Sequence break/);
		});

		it("detects out-of-order sequence numbers (e.g. seq 1, 3, 2)", () => {
			const orgId = randomUUID();
			const chain = createValidChain(3, orgId);

			// Swap elements at 1 and 2
			const temp = chain[1];
			const target = chain[2];
			assert.ok(temp && target);
			chain[1] = target;
			chain[2] = temp;

			const result = verifyAuditLogChain(chain);
			assert.equal(result.valid, false);
			assert.match(result.reason ?? "", /Sequence break/);
		});

		it("detects duplicate sequence numbers", () => {
			const orgId = randomUUID();
			const chain = createValidChain(4, orgId);

			// Duplicate row 2 into position 3
			const clone = { ...chain[1] } as TestRow;
			chain[2] = clone;

			const result = verifyAuditLogChain(chain);
			assert.equal(result.valid, false);
			assert.match(result.reason ?? "", /Sequence break/);
		});

		it("detects fake genesis block with non-zero previousHash", () => {
			const orgId = randomUUID();
			const chain = createValidChain(3, orgId);

			const genesis = chain[0];
			assert.ok(genesis);
			genesis.previousHash = "0000000000000000000000000000000000000000000000000000000000000001";

			const result = verifyAuditLogChain(chain);
			assert.equal(result.valid, false);
			assert.equal(result.failedSequenceNumber, 1);
			assert.match(result.reason ?? "", /Previous hash mismatch/);
		});

		it("detects cross-tenant replay attack: injecting valid row from Org A into Org B", () => {
			const orgA = randomUUID();
			const orgB = randomUUID();

			const chainA = createValidChain(3, orgA);
			const chainB = createValidChain(3, orgB);

			const rowA2 = chainA[1];
			assert.ok(rowA2);

			// Attacker attempts to replace Org B's seq 2 with Org A's seq 2
			chainB[1] = {
				...rowA2,
				id: randomUUID(),
			};

			const result = verifyAuditLogChain(chainB);
			assert.equal(result.valid, false);
			assert.ok(result.reason);
		});

		it("detects entityType and entityId tampering", () => {
			const orgId = randomUUID();
			const chain = createValidChain(4, orgId);

			const row = chain[2];
			assert.ok(row);
			row.entityId = "hacked-entity-id";

			const result = verifyAuditLogChain(chain);
			assert.equal(result.valid, false);
			assert.equal(result.failedSequenceNumber, 3);
			assert.match(result.reason ?? "", /Current hash mismatch/);
		});

		it("detects eventType tampering", () => {
			const orgId = randomUUID();
			const chain = createValidChain(4, orgId);

			const row = chain[1];
			assert.ok(row);
			row.eventType = "UNAUTHORIZED_ADMIN_GRANT";

			const result = verifyAuditLogChain(chain);
			assert.equal(result.valid, false);
			assert.equal(result.failedSequenceNumber, 2);
			assert.match(result.reason ?? "", /Current hash mismatch/);
		});
	});

	// =========================================================================
	// 3. EMPIRICAL VULNERABILITY & EDGE-CASE DEMONSTRATIONS
	// =========================================================================
	describe("3. Edge-Case Findings & Vulnerability Evidence", () => {
		it("demonstrates Date object flattening to empty object ({}) in canonicalizeJson", () => {
			const date1 = new Date("2026-01-01T00:00:00.000Z");
			const date2 = new Date("2026-12-31T23:59:59.999Z");

			const payload1 = { timestamp: date1, action: "SIGN" };
			const payload2 = { timestamp: date2, action: "SIGN" };

			// Because canonicalizeJson treats Date as plain object with 0 enumerable keys,
			// both payloads serialize to identical string '{"action":"SIGN","timestamp":{}}'
			const canonical1 = canonicalizeJson(payload1);
			const canonical2 = canonicalizeJson(payload2);

			assert.equal(canonical1, '{"action":"SIGN","timestamp":{}}');
			assert.equal(canonical1, canonical2);
			assert.equal(computePayloadSha256(payload1), computePayloadSha256(payload2));
		});

		it("demonstrates array undefined hole / invalid JSON syntax behavior", () => {
			// Array with undefined produces [1,,4] due to [undefined].join(',')
			const arrWithUndef = [1, undefined, 4];
			const canonical = canonicalizeJson(arrWithUndef);

			assert.equal(canonical, "[1,,4]");

			// Array containing only undefined collides with empty array []
			const arrOnlyUndef = [undefined];
			const emptyArr: unknown[] = [];
			assert.equal(canonicalizeJson(arrOnlyUndef), "[]");
			assert.equal(canonicalizeJson(emptyArr), "[]");
			assert.equal(computePayloadSha256(arrOnlyUndef), computePayloadSha256(emptyArr));
		});

		it("demonstrates unescaped colon delimiter collision in computeAuditEntryHash", () => {
			const orgId = "org-1";
			const prevHash = GENESIS_HASH;
			const timestampIso = "2026-08-18T12:00:00.000Z";
			const payloadSha256 = computePayloadSha256({ test: 1 });

			// Case A: eventType = "EGISZ:EXPORT", entityType = "DOC", entityId = "123"
			const hashA = computeAuditEntryHash({
				previousHash: prevHash,
				sequenceNumber: 1,
				organizationId: orgId,
				eventType: "EGISZ:EXPORT",
				entityType: "DOC",
				entityId: "123",
				payloadSha256,
				timestampIso,
				actorUserId: "user-1",
			});

			// Case B: eventType = "EGISZ", entityType = "EXPORT:DOC", entityId = "123"
			const hashB = computeAuditEntryHash({
				previousHash: prevHash,
				sequenceNumber: 1,
				organizationId: orgId,
				eventType: "EGISZ",
				entityType: "EXPORT:DOC",
				entityId: "123",
				payloadSha256,
				timestampIso,
				actorUserId: "user-1",
			});

			// Both produce the same dataToHash because of unescaped colon delimiter
			assert.equal(hashA, hashB);
		});
	});
});
