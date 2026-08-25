import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	canonicalJsonStringify,
	compareVectorClocks,
	computePayloadHash,
	createCompositeIdempotencyKey,
	createVectorClock,
	determineSyncTierMode,
	dominatesVectorClock,
	incrementVectorClock,
	mergeFieldLevelCrdt,
	mergeOdontogramTeethCrdt,
	mergeVectorClocks,
	parseIdempotencyKey,
	parseVectorClock,
	processMeshSyncExchange,
	resolveCashOperationCrdt,
	resolveForm043DiaryCrdt,
	resolveScheduleAppointmentCrdt,
	type MeshSyncExchangeRequest,
	type SyncMutationEnvelope,
	vectorClockToString,
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

describe("Sync & CRDT Engine: Pure Mathematical Vector Clocks", () => {
	test("createVectorClock initializes with node and sequence", () => {
		const clock = createVectorClock("tablet-doctor-1", 5);
		assert.deepEqual(clock, { "tablet-doctor-1": 5 });

		const emptyClock = createVectorClock();
		assert.deepEqual(emptyClock, {});
	});

	test("incrementVectorClock increases counter monotonically", () => {
		let clock = createVectorClock("tablet-1", 1);
		clock = incrementVectorClock(clock, "tablet-1");
		assert.equal(clock["tablet-1"], 2);
		clock = incrementVectorClock(clock, "tablet-1");
		assert.equal(clock["tablet-1"], 3);

		// Incrementing a new node
		clock = incrementVectorClock(clock, "reception-pc");
		assert.equal(clock["reception-pc"], 1);
		assert.equal(clock["tablet-1"], 3);
	});

	test("compareVectorClocks determines causal ordering and concurrency", () => {
		const clockA = { "node-1": 1, "node-2": 2 };
		const clockB = { "node-1": 1, "node-2": 3 };
		const clockC = { "node-1": 2, "node-2": 1 };
		const clockIdentical = { "node-1": 1, "node-2": 2 };

		// clockA < clockB (strictly before)
		assert.equal(compareVectorClocks(clockA, clockB), "before");
		// clockB > clockA (strictly after)
		assert.equal(compareVectorClocks(clockB, clockA), "after");
		// clockA == clockIdentical
		assert.equal(compareVectorClocks(clockA, clockIdentical), "identical");
		// clockB vs clockC (concurrent: node-2 is higher in B, node-1 is higher in C)
		assert.equal(compareVectorClocks(clockB, clockC), "concurrent");
	});

	test("mergeVectorClocks computes pairwise supremum", () => {
		const clockA = { "node-1": 5, "node-2": 2, "node-3": 1 };
		const clockB = { "node-1": 3, "node-2": 7, "node-4": 4 };

		const merged = mergeVectorClocks(clockA, clockB);
		assert.deepEqual(merged, {
			"node-1": 5,
			"node-2": 7,
			"node-3": 1,
			"node-4": 4,
		});
	});

	test("dominatesVectorClock correctly evaluates causality", () => {
		const dominator = { "node-1": 10, "node-2": 5 };
		const dominated = { "node-1": 8, "node-2": 5 };
		const concurrent = { "node-1": 11, "node-2": 3 };

		assert.equal(dominatesVectorClock(dominator, dominated), true);
		assert.equal(dominatesVectorClock(dominated, dominator), false);
		assert.equal(dominatesVectorClock(dominator, concurrent), false);
	});

	test("vectorClockToString and parseVectorClock round-trip", () => {
		const clock = { "rec-1": 12, "tab-2": 4, "server": 88 };
		const str = vectorClockToString(clock);
		assert.equal(str, "rec-1:12,server:88,tab-2:4");

		const parsed = parseVectorClock(str);
		assert.deepEqual(parsed, clock);
	});
});

describe("Sync & CRDT Engine: Schedule & Appointment Conflict Resolution", () => {
	test("Clinical status rank progression: in_treatment wins over confirmed", () => {
		const existingApp = {
			id: "app-101",
			patientId: "pat-1",
			status: "confirmed",
			startsAt: "2026-08-25T10:00:00.000Z",
			doctorName: "Д-р Иванов",
		};
		const incomingApp = {
			id: "app-101",
			status: "in_treatment",
			notes: "Пациент сел в кресло 10:05",
		};

		const clockA = { "rec-pc": 2, "doctor-tablet": 1 };
		const clockB = { "rec-pc": 1, "doctor-tablet": 2 }; // concurrent

		const result = resolveScheduleAppointmentCrdt({
			existingAppointment: existingApp,
			incomingAppointment: incomingApp,
			existingClock: clockA,
			incomingClock: clockB,
			incomingUpdatedAt: "2026-08-25T10:05:00.000Z",
			nodeId: "doctor-tablet",
		});

		assert.equal(result.resolvedAppointment.status, "in_treatment");
		assert.equal(result.resolvedAppointment.doctorName, "Д-р Иванов");
		assert.equal(result.resolvedAppointment.notes, "Пациент сел в кресло 10:05");
		assert.equal(result.hasConflict, true);
		assert.equal(result.strategy, "status_priority");
	});

	test("Cancellation LWW: Newer cancellation cancels appointment", () => {
		const existingApp = {
			id: "app-102",
			status: "confirmed",
			startsAt: "2026-08-25T14:00:00.000Z",
			updatedAt: "2026-08-25T09:00:00.000Z",
		};
		const incomingApp = {
			id: "app-102",
			status: "cancelled",
			cancellationReason: "Пациент заболел",
		};

		const result = resolveScheduleAppointmentCrdt({
			existingAppointment: existingApp,
			incomingAppointment: incomingApp,
			existingUpdatedAt: "2026-08-25T09:00:00.000Z",
			incomingUpdatedAt: "2026-08-25T11:00:00.000Z",
			nodeId: "reception-pc",
		});

		assert.equal(result.resolvedAppointment.status, "cancelled");
		assert.equal(result.resolvedAppointment.cancellationReason, "Пациент заболел");
	});
});

describe("Sync & CRDT Engine: Form 043/u Odontogram Surface Map & Medical Diarires", () => {
	test("mergeOdontogramTeethCrdt performs non-destructive per-tooth and per-surface union", () => {
		const teethChairA = [
			{
				toothNumber: 16,
				statusCode: "caries",
				surfaces: ["O"],
				updatedAt: "2026-08-25T10:00:00.000Z",
			},
			{
				toothNumber: 15,
				statusCode: "healthy",
				surfaces: [],
				updatedAt: "2026-08-25T10:00:00.000Z",
			},
		];

		const teethChairB = [
			{
				toothNumber: 16,
				statusCode: "caries",
				surfaces: ["M", "D"],
				updatedAt: "2026-08-25T10:05:00.000Z",
			},
			{
				toothNumber: 48,
				statusCode: "extracted_absent",
				surfaces: [],
				updatedAt: "2026-08-25T10:05:00.000Z",
			},
		];

		const merged = mergeOdontogramTeethCrdt(teethChairA, teethChairB);

		assert.equal(merged.length, 3);
		// Tooth 15 preserved
		assert.equal(merged.find((t) => t.toothNumber === 15)?.statusCode, "healthy");
		// Tooth 48 preserved
		assert.equal(merged.find((t) => t.toothNumber === 48)?.statusCode, "extracted_absent");
		// Tooth 16 surfaces unified -> ["D", "M", "O"]
		const tooth16 = merged.find((t) => t.toothNumber === 16);
		assert.ok(tooth16);
		assert.deepEqual(tooth16.surfaces, ["D", "M", "O"]);
	});

	test("resolveForm043DiaryCrdt merges treatment protocols and scalar fields without data loss", () => {
		const existingDiary = {
			id: "diary-201",
			complaints: "Боль в зубе 1.6",
			statusLocalis: "Глубокая кариозная полость",
			treatmentProtocol: ["Анестезия Ubistesin 1.7ml", "Препарирование полости"],
			prescriptions: ["Нимесулид 100мг"],
		};
		const incomingDiary = {
			id: "diary-201",
			complaints: "Острая ночная боль в зубе 1.6",
			treatmentProtocol: ["Пломбирование Estelite Asteria A3", "Полировка Enhancer"],
			prescriptions: ["Полоскание хлоргексидином 0.05%"],
		};

		const result = resolveForm043DiaryCrdt({
			existingDiary,
			incomingDiary,
			existingUpdatedAt: "2026-08-25T10:00:00.000Z",
			incomingUpdatedAt: "2026-08-25T10:30:00.000Z",
			nodeId: "doctor-tablet-1",
		});

		assert.equal(result.resolvedDiary.complaints, "Острая ночная боль в зубе 1.6");
		assert.equal(result.resolvedDiary.statusLocalis, "Глубокая кариозная полость");
		// All 4 treatment steps preserved
		assert.equal((result.resolvedDiary.treatmentProtocol as string[]).length, 4);
		// Both prescriptions preserved
		assert.equal((result.resolvedDiary.prescriptions as string[]).length, 2);
	});
});

describe("Sync & CRDT Engine: Cash Operations & Idempotent Journal", () => {
	test("resolveCashOperationCrdt detects duplicate payments and upgrades fiscal status", () => {
		const existingPayment = {
			paymentId: "pay-101",
			patientId: "pat-50",
			amountKopecks: 150000,
			paymentMethod: "card" as const,
			status: "draft" as const,
			idempotencyKey: "pay-101#hash123",
			createdAt: "2026-08-25T10:00:00.000Z",
		};

		const incomingFiscalizedPayment = {
			paymentId: "pay-101",
			patientId: "pat-50",
			amountKopecks: 150000,
			paymentMethod: "card" as const,
			status: "fiscalized" as const,
			fiscalDocNumber: "ФД #004521",
			idempotencyKey: "pay-101#hash123",
			createdAt: "2026-08-25T10:00:00.000Z",
		};

		const result = resolveCashOperationCrdt({
			existingPayment,
			incomingPayment: incomingFiscalizedPayment,
			nodeId: "kkt-cash-pc",
		});

		assert.equal(result.isDuplicate, true);
		assert.equal(result.resolvedPayment.status, "fiscalized");
		assert.equal(result.resolvedPayment.fiscalDocNumber, "ФД #004521");
		assert.equal(result.resolvedPayment.amountKopecks, 150000);
	});
});

describe("Sync & CRDT Engine: LAN Wi-Fi Mesh Node & Peer Exchange", () => {
	test("determineSyncTierMode accurately selects 3-tier routing", () => {
		assert.equal(
			determineSyncTierMode({
				hasCloudInternet: true,
				hasLanMicroserver: true,
				hasLocalMeshPeers: true,
			}),
			"cloud_postgresql",
		);

		assert.equal(
			determineSyncTierMode({
				hasCloudInternet: false,
				hasLanMicroserver: true,
				hasLocalMeshPeers: false,
			}),
			"lan_local_mesh",
		);

		assert.equal(
			determineSyncTierMode({
				hasCloudInternet: false,
				hasLanMicroserver: false,
				hasLocalMeshPeers: true,
			}),
			"lan_local_mesh",
		);

		assert.equal(
			determineSyncTierMode({
				hasCloudInternet: false,
				hasLanMicroserver: false,
				hasLocalMeshPeers: false,
			}),
			"autonomous_offline",
		);
	});

	test("processMeshSyncExchange reconciles peer mutations and returns unseen mutations", () => {
		const localMutations: SyncMutationEnvelope[] = [
			{
				mutationId: "mut-local-1",
				idempotencyKey: "key-local-1",
				payloadHash: "hash-local-1-00000000",
				entityKind: "patient",
				entityId: "pat-1",
				action: "update",
				payload: { name: "Пациент 1" },
				updatedAt: "2026-08-25T10:00:00.000Z",
			},
		];

		const request: MeshSyncExchangeRequest = {
			exchangeId: "ex-99",
			senderNodeId: "doctor-tablet-2",
			senderRole: "doctor_tablet",
			senderVectorClock: { "doctor-tablet-2": 3 },
			mutations: [
				{
					mutationId: "mut-incoming-2",
					idempotencyKey: "key-incoming-2",
					payloadHash: "hash-incoming-2-00000000",
					entityKind: "visit_diary",
					entityId: "diary-2",
					action: "create",
					payload: { complaint: "Жалобы" },
					updatedAt: "2026-08-25T10:05:00.000Z",
				},
			],
			sentAt: "2026-08-25T10:05:00.000Z",
		};

		const localClock = { "reception-pc": 5 };
		const response = processMeshSyncExchange(
			localMutations,
			request,
			localClock,
			"reception-pc",
		);

		assert.equal(response.appliedMutationsCount, 1);
		assert.equal(response.results[0]?.mutationId, "mut-incoming-2");
		assert.equal(response.results[0]?.status, "applied");
		// Receiver returns local mutations that the sender does not have
		assert.equal(response.returnMutations.length, 1);
		assert.equal(response.returnMutations[0]?.mutationId, "mut-local-1");
		// Vector clock merged and incremented
		assert.equal(response.responderVectorClock["doctor-tablet-2"], 3);
		assert.equal(response.responderVectorClock["reception-pc"], 6);
	});
});

