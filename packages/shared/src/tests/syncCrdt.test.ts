import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	canonicalJsonStringify,
	computePayloadHash,
	createCompositeIdempotencyKey,
	mergeFieldLevelCrdt,
	parseIdempotencyKey,
	verifyPayloadHash,
} from "../sync/index.js";

describe("Sync & CRDT Engine: Canonical Hashing & Idempotency Key", () => {
	test("canonicalJsonStringify produces identical string regardless of object key order", () => {
		const objA = { z: 1, a: "hello", m: { y: 2, b: true } };
		const objB = { a: "hello", m: { b: true, y: 2 }, z: 1 };

		assert.equal(canonicalJsonStringify(objA), canonicalJsonStringify(objB));
		assert.equal(computePayloadHash(objA), computePayloadHash(objB));
	});

	test("computePayloadHash generates 64-char SHA-256 hex string", () => {
		const payload = {
			patientId: "123e4567-e89b-12d3-a456-426614174000",
			amountRub: 1500,
			method: "card",
		};
		const hash = computePayloadHash(payload);
		assert.equal(typeof hash, "string");
		assert.equal(hash.length, 64);
		assert.match(hash, /^[0-9a-f]{64}$/);
	});

	test("composite idempotency key format and payload hash verification", () => {
		const uuid = "e89b12d3-a456-4266-1417-426614174000";
		const payload = { action: "pay", amountRub: 5000 };

		const key = createCompositeIdempotencyKey(uuid, payload);
		assert.ok(key.startsWith(`${uuid}#`));

		const parsed = parseIdempotencyKey(key);
		assert.equal(parsed.uuid, uuid);
		assert.equal(typeof parsed.embeddedHash, "string");

		assert.equal(verifyPayloadHash(payload, key), true);
		assert.equal(verifyPayloadHash({ action: "pay", amountRub: 9999 }, key), false);
	});
});

describe("Sync & CRDT Engine: Field-Level Merging & Conflict Resolution", () => {
	test("Disjoint fields: Doctor updates anamnesis offline while Receptionist updates phone online -> Both preserved", () => {
		const serverPatient = {
			id: "pat-100",
			fullName: "Сидоров Алексей Петрович",
			phone: "+7 (999) 000-00-02", // Updated by receptionist online
			anamnesis: "Без особенностей", // Initial anamnesis
			updatedAt: "2026-08-22T14:30:00.000Z",
		};

		const serverVector = {
			phone: {
				updatedAt: "2026-08-22T14:30:00.000Z",
				version: 2,
				authorId: "receptionist-id",
			},
			anamnesis: {
				updatedAt: "2026-08-22T10:00:00.000Z",
				version: 1,
				authorId: "system",
			},
		};

		// Doctor edited anamnesis offline at 14:35
		const clientPatch = {
			anamnesis: "Аллергия на лидокаин, гипертония 2 ст.",
		};

		const clientVector = {
			anamnesis: {
				updatedAt: "2026-08-22T14:35:00.000Z",
				version: 2,
				authorId: "doctor-id",
			},
		};

		const result = mergeFieldLevelCrdt<{
			id: string;
			fullName: string;
			phone: string;
			anamnesis: string;
			updatedAt: string;
		}>({
			entityKind: "patient",
			entityId: "pat-100",
			serverEntity: serverPatient,
			serverVector,
			clientPatch,
			clientVector,
			clientUpdatedAt: "2026-08-22T14:35:00.000Z",
			serverUpdatedAt: "2026-08-22T14:30:00.000Z",
			authorUserId: "doctor-id",
		});

		// INVARIANT CHECK: Receptionist's phone is preserved AND Doctor's anamnesis is preserved!
		assert.equal(result.mergedEntity.phone, "+7 (999) 000-00-02");
		assert.equal(
			result.mergedEntity.anamnesis,
			"Аллергия на лидокаин, гипертония 2 ст.",
		);
		assert.equal(result.mergedEntity.fullName, "Сидоров Алексей Петрович");
		assert.deepEqual(result.changedFields, ["anamnesis"]);
		assert.equal(result.conflicts[0]?.winner, "client");
	});

	test("Same-field conflict: Newer client timestamp wins over older server timestamp", () => {
		const serverDiary = {
			id: "diary-1",
			complaint: "Боль в зубе 1.6",
			anamnesis: "Старый текст",
			updatedAt: "2026-08-22T12:00:00.000Z",
		};

		const serverVector = {
			complaint: { updatedAt: "2026-08-22T12:00:00.000Z", version: 1 },
		};

		const clientPatch = {
			complaint: "Острая пульсирующая ночная боль в зубе 1.6",
		};

		const clientVector = {
			complaint: { updatedAt: "2026-08-22T13:15:00.000Z", version: 2 },
		};

		const result = mergeFieldLevelCrdt({
			entityKind: "visit_diary",
			entityId: "diary-1",
			serverEntity: serverDiary,
			serverVector,
			clientPatch,
			clientVector,
			clientUpdatedAt: "2026-08-22T13:15:00.000Z",
			serverUpdatedAt: "2026-08-22T12:00:00.000Z",
		});

		assert.equal(
			result.mergedEntity.complaint,
			"Острая пульсирующая ночная боль в зубе 1.6",
		);
		assert.equal(result.hasConflicts, true);
		assert.equal(result.conflicts[0]?.winner, "client");
		assert.equal(result.conflicts[0]?.strategy, "lww");
	});

	test("Same-field conflict: Newer server timestamp wins over older offline patch", () => {
		const serverDiary = {
			id: "diary-1",
			complaint: "Жалоб нет, контрольный осмотр (актуальная запись онлайн)",
			updatedAt: "2026-08-22T15:00:00.000Z",
		};

		const serverVector = {
			complaint: { updatedAt: "2026-08-22T15:00:00.000Z", version: 3 },
		};

		// Stale offline client modification
		const clientPatch = {
			complaint: "Старая жалоба из офлайн-черновика",
		};

		const clientVector = {
			complaint: { updatedAt: "2026-08-22T11:00:00.000Z", version: 2 },
		};

		const result = mergeFieldLevelCrdt({
			entityKind: "visit_diary",
			entityId: "diary-1",
			serverEntity: serverDiary,
			serverVector,
			clientPatch,
			clientVector,
			clientUpdatedAt: "2026-08-22T11:00:00.000Z",
			serverUpdatedAt: "2026-08-22T15:00:00.000Z",
		});

		// Server's newer complaint is kept!
		assert.equal(
			result.mergedEntity.complaint,
			"Жалоб нет, контрольный осмотр (актуальная запись онлайн)",
		);
		assert.equal(result.hasConflicts, true);
		assert.equal(result.conflicts[0]?.winner, "server");
		assert.equal(result.changedFields.length, 0);
	});

	test("New entity creation via CRDT merge initializes full mutation vector", () => {
		const clientPatch = {
			fullName: "Новый Пациент",
			phone: "+79991234567",
			birthDate: "1990-01-01",
		};

		const result = mergeFieldLevelCrdt({
			entityKind: "patient",
			entityId: "new-pat-1",
			serverEntity: null,
			clientPatch,
			clientUpdatedAt: "2026-08-22T16:00:00.000Z",
		});

		assert.equal(result.strategy, "created");
		assert.equal(result.mergedEntity.id, "new-pat-1");
		assert.equal(result.mergedEntity.fullName, "Новый Пациент");
		assert.equal(result.updatedVector.fullName?.version, 1);
		assert.equal(result.updatedVector.phone?.version, 1);
	});
});
