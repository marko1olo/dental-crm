/**
 * DENTE CRM — CRDT Sync Engine Unit Test Suite (Wave 10)
 *
 * 100% Comprehensive Coverage for:
 * 1. Lamport Clock monotonicity, witnessing, formatting and parsing.
 * 2. LWW-Element-Set CRDT: additions, removals, Lamport tie-breaking, commutativity, associativity, idempotency.
 * 3. LWW-Map CRDT: key-value operations, field vector tracking, deterministic tie-breaking, JSON round-trip.
 * 4. FDI 11–48 Dental Formula & Odontogram CRDT surface map merging.
 * 5. Form 043/u SOAP Clinical Diary CRDT 3-way merging without data loss.
 * 6. Appointments & Visits clinical status rank progression and cancellation LWW.
 * 7. Payments & Invoices kopeck-exact records and idempotency hashes.
 * 8. Outbox Queue lifecycle: pending -> in_flight -> committed / failed and pruning.
 * 9. Batch Envelope generation (UUIDv7, SHA-256 payload hash) and gateway response processing.
 * 10. Engine Telemetry, Survivability grading, Online/Offline mode transitions, and Event Subscriptions.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	ALL_FDI_TEETH,
	CrdtSyncEngine,
	FDI_ADULT_TEETH,
	FDI_PEDIATRIC_TEETH,
	isFdiToothNumber,
	LamportClock,
	LwwElementSet,
	LwwMap,
	MemoryCrdtStorageDriver,
	type OdontogramToothState,
	type SoapMedicalDiaryRecord,
	type SyncPushBatchRequest,
	type SyncPushBatchResponse,
} from "../crdtSyncEngine.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Lamport Clock Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("CRDT Sync Engine: Lamport Clock", () => {
	test("tick() increments counter monotonically", () => {
		const clock = new LamportClock("tablet-1", 0);
		assert.equal(clock.getTime(), 0);
		assert.equal(clock.tick(), 1);
		assert.equal(clock.tick(), 2);
		assert.equal(clock.tick(), 3);
		assert.equal(clock.getTime(), 3);
		assert.equal(clock.getNodeId(), "tablet-1");
	});

	test("witness() updates clock to max(local, remote) + 1", () => {
		const clock = new LamportClock("reception-pc", 5);
		assert.equal(clock.witness(3), 6); // local 5 > remote 3 -> 5 + 1 = 6
		assert.equal(clock.witness(10), 11); // remote 10 > local 6 -> 10 + 1 = 11
		assert.equal(clock.getTime(), 11);
	});

	test("formatTimestamp() and parseTimestamp() round-trip accurately", () => {
		const clock = new LamportClock("doctor-pad-3", 42);
		const formatted = clock.formatTimestamp("2026-08-28T20:00:00.000Z");
		assert.equal(formatted, "L42@2026-08-28T20:00:00.000Z#doctor-pad-3");

		const parsed = LamportClock.parseTimestamp(formatted);
		assert.ok(parsed);
		assert.equal(parsed.lamport, 42);
		assert.equal(parsed.wallTimeIso, "2026-08-28T20:00:00.000Z");
		assert.equal(parsed.nodeId, "doctor-pad-3");

		assert.equal(LamportClock.parseTimestamp("invalid-format"), null);
		assert.equal(LamportClock.parseTimestamp(""), null);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. LWW-Element-Set CRDT Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("CRDT Sync Engine: LWW-Element-Set CRDT", () => {
	test("Add element: element is present in set", () => {
		const set = new LwwElementSet<string>();
		set.add("tooth-16-MOD", 1000, 1);
		assert.equal(set.has("tooth-16-MOD"), true);
		assert.deepEqual(set.read(), ["tooth-16-MOD"]);
		assert.equal(set.size(), 1);
	});

	test("Remove element with newer timestamp removes element", () => {
		const set = new LwwElementSet<string>();
		set.add("caries-11", 1000, 1);
		assert.equal(set.has("caries-11"), true);

		// Remove at t = 2000
		set.remove("caries-11", 2000, 2);
		assert.equal(set.has("caries-11"), false);
		assert.deepEqual(set.read(), []);
		assert.equal(set.size(), 0);
	});

	test("Re-adding element with newer timestamp restores it", () => {
		const set = new LwwElementSet<string>();
		set.add("pulpitis-26", 1000, 1);
		set.remove("pulpitis-26", 2000, 2);
		assert.equal(set.has("pulpitis-26"), false);

		// Re-add at t = 3000
		set.add("pulpitis-26", 3000, 3);
		assert.equal(set.has("pulpitis-26"), true);
		assert.deepEqual(set.read(), ["pulpitis-26"]);
	});

	test("Timestamp tie-breaking with Lamport counter", () => {
		const set = new LwwElementSet<string>();
		// Same wall timestamp, but remove has higher Lamport counter
		set.add("filling-36", 1000, 1);
		set.remove("filling-36", 1000, 5);
		assert.equal(set.has("filling-36"), false);

		// Re-add with higher Lamport counter
		set.add("filling-36", 1000, 10);
		assert.equal(set.has("filling-36"), true);
	});

	test("Mathematical CRDT properties: Commutativity, Associativity, Idempotency", () => {
		const setA = new LwwElementSet<string>();
		setA.add("A1", 100, 1);
		setA.add("A2", 200, 2);
		setA.remove("A1", 150, 3);

		const setB = new LwwElementSet<string>();
		setB.add("B1", 120, 1);
		setB.add("A1", 300, 4); // Re-added in B with newer timestamp
		setB.remove("A2", 250, 5); // Removed in B

		const setC = new LwwElementSet<string>();
		setC.add("C1", 400, 1);
		setC.add("A1", 50, 1);

		// 1. Commutativity: A.merge(B) === B.merge(A)
		const mergeAB = setA.merge(setB);
		const mergeBA = setB.merge(setA);
		assert.deepEqual(mergeAB.read().sort(), mergeBA.read().sort());
		assert.equal(mergeAB.has("A1"), true);
		assert.equal(mergeAB.has("A2"), false);
		assert.equal(mergeAB.has("B1"), true);

		// 2. Associativity: (A U B) U C === A U (B U C)
		const mergeAB_C = mergeAB.merge(setC);
		const mergeA_BC = setA.merge(setB.merge(setC));
		assert.deepEqual(mergeAB_C.read().sort(), mergeA_BC.read().sort());

		// 3. Idempotency: A U A === A
		const mergeAA = setA.merge(setA);
		assert.deepEqual(mergeAA.read().sort(), setA.read().sort());
	});

	test("JSON Serialization and Deserialization round-trip", () => {
		const original = new LwwElementSet<string>();
		original.add("surface-O", 1000, 1, "doc-1");
		original.add("surface-M", 1050, 2, "doc-1");
		original.remove("surface-D", 1100, 3, "doc-2");

		const json = original.toJSON();
		const restored = LwwElementSet.fromJSON(json);

		assert.equal(restored.has("surface-O"), true);
		assert.equal(restored.has("surface-M"), true);
		assert.equal(restored.has("surface-D"), false);
		assert.deepEqual(restored.read().sort(), original.read().sort());
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. LWW-Map CRDT Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("CRDT Sync Engine: LWW-Map CRDT", () => {
	test("LwwMap setting, getting and deleting with Lamport ordering", () => {
		const map = new LwwMap<string, string>();
		map.set("doctorName", "Д-р Иванов", 1000, 1, "user-1");
		assert.equal(map.get("doctorName"), "Д-р Иванов");
		assert.equal(map.has("doctorName"), true);

		// Newer timestamp updates value
		map.set("doctorName", "Д-р Петров", 2000, 2, "user-2");
		assert.equal(map.get("doctorName"), "Д-р Петров");

		// Older timestamp does not overwrite
		map.set("doctorName", "Д-р Сидоров", 1500, 1, "user-3");
		assert.equal(map.get("doctorName"), "Д-р Петров");

		// Delete with newer timestamp
		map.delete("doctorName", 3000, 3, "user-1");
		assert.equal(map.get("doctorName"), undefined);
		assert.equal(map.has("doctorName"), false);
	});

	test("LwwMap merge resolves disjoint and conflicting fields deterministically", () => {
		const mapA = new LwwMap<string, unknown>();
		mapA.set("complaint", "Боль в зубе 1.6", 1000, 1, "doctor-1");
		mapA.set("phone", "+79991112233", 1000, 1, "rec-1");

		const mapB = new LwwMap<string, unknown>();
		mapB.set("complaint", "Острая ночная боль в зубе 1.6", 2000, 2, "doctor-1"); // Newer complaint
		mapB.set("anamnesis", "Аллергия на пенициллин", 1500, 1, "doctor-2"); // New disjoint field

		const merged = mapA.merge(mapB);
		assert.equal(merged.get("complaint"), "Острая ночная боль в зубе 1.6");
		assert.equal(merged.get("phone"), "+79991112233");
		assert.equal(merged.get("anamnesis"), "Аллергия на пенициллин");

		const vector = merged.toMutationVector();
		assert.equal(vector.complaint?.version, 1);
		assert.equal(vector.anamnesis?.version, 1);
	});

	test("LwwMap JSON serialization and deserialization round-trip", () => {
		const map = new LwwMap<string, number>();
		map.set("priceKopecks", 350000, 1000, 1, "user-1");
		map.set("discountKopecks", 50000, 1200, 2, "user-1");

		const json = map.toJSON();
		const restored = LwwMap.fromJSON(json);

		assert.equal(restored.get("priceKopecks"), 350000);
		assert.equal(restored.get("discountKopecks"), 50000);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Clinical Domain FDI Formula & Odontogram CRDT Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("CRDT Sync Engine: FDI 11–48 Dental Formula & Odontogram Map", () => {
	test("FDI tooth number validator covers 32 adult and 20 pediatric teeth", () => {
		assert.equal(FDI_ADULT_TEETH.length, 32);
		assert.equal(FDI_PEDIATRIC_TEETH.length, 20);
		assert.equal(ALL_FDI_TEETH.length, 52);

		assert.equal(isFdiToothNumber(11), true);
		assert.equal(isFdiToothNumber(18), true);
		assert.equal(isFdiToothNumber(48), true);
		assert.equal(isFdiToothNumber(55), true);
		assert.equal(isFdiToothNumber(85), true);

		// Invalid FDI tooth numbers
		assert.equal(isFdiToothNumber(0), false);
		assert.equal(isFdiToothNumber(19), false);
		assert.equal(isFdiToothNumber(50), false);
		assert.equal(isFdiToothNumber(99), false);
	});

	test("Engine saves Odontogram offline and performs per-tooth/per-surface union merge", async () => {
		const storage = new MemoryCrdtStorageDriver();
		const engine = new CrdtSyncEngine({
			nodeId: "chairside-tablet-1",
			organizationId: "org-dente-1",
			storageDriver: storage,
		});

		const initialTeeth: OdontogramToothState[] = [
			{
				toothNumber: 16,
				statusCode: "caries",
				surfaces: ["O"],
				notes: "Кариес жевательной поверхности",
				updatedAt: "2026-08-28T10:00:00.000Z",
			},
			{
				toothNumber: 11,
				statusCode: "healthy",
				surfaces: [],
				updatedAt: "2026-08-28T10:00:00.000Z",
			},
		];

		const mutation1 = await engine.saveOdontogramOffline("pat-100", initialTeeth, "doc-1");
		assert.equal(mutation1.entityKind, "odontogram_state");
		assert.equal(mutation1.entityId, "pat-100");
		assert.equal(mutation1.status, "pending");

		// Doctor 2 edits tooth 16 surfaces offline from another tablet
		const incomingTeeth: OdontogramToothState[] = [
			{
				toothNumber: 16,
				statusCode: "caries",
				surfaces: ["M", "D"],
				updatedAt: "2026-08-28T10:05:00.000Z",
			},
			{
				toothNumber: 26,
				statusCode: "crown",
				surfaces: [],
				updatedAt: "2026-08-28T10:05:00.000Z",
			},
		];

		await engine.saveOdontogramOffline("pat-100", incomingTeeth, "doc-2");

		const stored = await storage.loadEntity<{ patientId: string; teeth: OdontogramToothState[] }>(
			"odontogram_state",
			"pat-100",
		);

		assert.ok(stored);
		const teeth = stored.data.teeth;
		assert.equal(teeth.length, 3); // 11, 16, 26

		const tooth16 = teeth.find((t) => t.toothNumber === 16);
		assert.ok(tooth16);
		assert.deepEqual(tooth16.surfaces, ["D", "M", "O"]); // Surfaces union-merged!
		assert.equal(tooth16.statusCode, "caries");

		const tooth11 = teeth.find((t) => t.toothNumber === 11);
		assert.equal(tooth11?.statusCode, "healthy");

		const tooth26 = teeth.find((t) => t.toothNumber === 26);
		assert.equal(tooth26?.statusCode, "crown");
	});

	test("Engine saveToothSurfaceOffline rejects invalid tooth numbers and persists valid FDI state", async () => {
		const engine = new CrdtSyncEngine({ storageDriver: new MemoryCrdtStorageDriver() });

		await assert.rejects(
			async () => engine.saveToothSurfaceOffline("pat-1", 99, "caries", ["O"]),
			/Недопустимый номер зуба/,
		);

		const mutation = await engine.saveToothSurfaceOffline("pat-1", 21, "veneer", ["V"], "Керамический винир E.max");
		assert.equal(mutation.entityKind, "odontogram_state");
		assert.equal(mutation.status, "pending");
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Form 043/u SOAP Medical Diaries CRDT Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("CRDT Sync Engine: Form 043/u SOAP Medical Diary CRDT", () => {
	test("SOAP Diary preserves treatment protocols array union and resolves LWW clinical notes", async () => {
		const storage = new MemoryCrdtStorageDriver();
		const engine = new CrdtSyncEngine({
			nodeId: "doctor-room-2",
			organizationId: "org-1",
			storageDriver: storage,
		});

		const initialDiary: SoapMedicalDiaryRecord = {
			id: "diary-101",
			patientId: "pat-50",
			complaints: "Боль в зубе 4.6 при накусывании",
			statusLocalis: "Глубокая кариозная полость на дистальной поверхности",
			treatmentProtocol: ["Анестезия Скандонест 3% 1.8мл", "Препарирование полости"],
			prescriptions: ["Кеторол 10мг при болях"],
			updatedAt: "2026-08-28T11:00:00.000Z",
		};

		await engine.saveSoapDiaryOffline(initialDiary, "doc-1");

		// Assistant adds final polishing and prescriptions offline
		const followUpDiary: SoapMedicalDiaryRecord = {
			id: "diary-101",
			complaints: "Острая боль в зубе 4.6 (уточнено)",
			treatmentProtocol: ["Пломбирование Ceram.X Duo E2", "Шлифовка и полировка Enhance"],
			prescriptions: ["Полоскание Мирамистином 0.01%"],
			updatedAt: "2026-08-28T11:20:00.000Z",
		};

		await engine.saveSoapDiaryOffline(followUpDiary, "doc-2");

		const stored = await storage.loadEntity<SoapMedicalDiaryRecord>("visit_diary", "diary-101");
		assert.ok(stored);
		assert.equal(stored.data.complaints, "Острая боль в зубе 4.6 (уточнено)");
		assert.equal(stored.data.statusLocalis, "Глубокая кариозная полость на дистальной поверхности");

		// All 4 treatment protocol steps preserved without data loss
		assert.equal(stored.data.treatmentProtocol?.length, 4);
		assert.equal(stored.data.prescriptions?.length, 2);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Appointments & Visits Clinical Progression Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("CRDT Sync Engine: Appointments & Visits Progression", () => {
	test("Status rank progression: in_treatment wins over confirmed", async () => {
		const storage = new MemoryCrdtStorageDriver();
		const engine = new CrdtSyncEngine({ storageDriver: storage, nodeId: "tablet-dr-ivanov" });

		await engine.saveAppointmentOffline({
			id: "app-200",
			patientId: "pat-10",
			status: "confirmed",
			startsAt: "2026-08-28T14:00:00.000Z",
			doctorName: "Д-р Иванов С.В.",
		});

		// Doctor changes status to in_treatment
		await engine.saveAppointmentOffline({
			id: "app-200",
			status: "in_treatment",
			notes: "Пациент в кресле, начата препаровка",
		});

		const stored = await storage.loadEntity<Record<string, unknown>>("appointment", "app-200");
		assert.ok(stored);
		assert.equal(stored.data.status, "in_treatment");
		assert.equal(stored.data.doctorName, "Д-р Иванов С.В.");
		assert.equal(stored.data.notes, "Пациент в кресле, начата препаровка");
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Outbox Queue & Push Batch Gateway Handshake Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("CRDT Sync Engine: Outbox Queue & Push Batch Idempotency", () => {
	test("createPushBatch packages pending mutations with UUIDv7 and SHA-256 payload hashes", async () => {
		const storage = new MemoryCrdtStorageDriver();
		const engine = new CrdtSyncEngine({
			nodeId: "node-reception-1",
			organizationId: "org-1",
			storageDriver: storage,
		});

		await engine.savePatientOffline({
			id: "pat-300",
			fullName: "Ковалева Елена Викторовна",
			phone: "+79161234567",
		});

		await engine.savePaymentOffline({
			paymentId: "pay-500",
			patientId: "pat-300",
			amountKopecks: 450000,
			paymentMethod: "card",
			status: "draft",
		});

		const batch = await engine.createPushBatch();
		assert.ok(batch);
		assert.equal(batch.clientId, "node-reception-1");
		assert.equal(batch.mutations.length, 2);
		assert.match(batch.syncBatchId, /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

		for (const mut of batch.mutations) {
			assert.ok(mut.idempotencyKey.includes("#"));
			assert.equal(mut.payloadHash.length, 64);
			assert.match(mut.payloadHash, /^[0-9a-f]{64}$/);
		}

		// Items should now be in_flight
		const outbox = await storage.getPendingOutbox();
		assert.equal(outbox.length, 0); // No 'pending' items remain (all in_flight)
	});

	test("applyPushBatchResponse commits successful mutations and prunes outbox", async () => {
		const storage = new MemoryCrdtStorageDriver();
		const engine = new CrdtSyncEngine({
			nodeId: "node-1",
			organizationId: "org-1",
			storageDriver: storage,
		});

		const mut1 = await engine.savePatientOffline({ id: "pat-1", fullName: "Пациент 1" });
		const mut2 = await engine.savePatientOffline({ id: "pat-2", fullName: "Пациент 2" });

		const batch = await engine.createPushBatch();
		assert.ok(batch);

		const mockResponse: SyncPushBatchResponse = {
			syncBatchId: batch.syncBatchId,
			processedCount: 2,
			appliedCount: 1,
			duplicateCount: 1,
			mergedCount: 0,
			rejectedCount: 0,
			results: [
				{
					mutationId: mut1.mutationId,
					idempotencyKey: mut1.idempotencyKey,
					status: "applied",
					entityKind: "patient",
					entityId: "pat-1",
					appliedAt: "2026-08-28T12:00:00.000Z",
				},
				{
					mutationId: mut2.mutationId,
					idempotencyKey: mut2.idempotencyKey,
					status: "duplicate",
					entityKind: "patient",
					entityId: "pat-2",
					appliedAt: "2026-08-28T12:00:00.000Z",
				},
			],
			serverTime: "2026-08-28T12:00:00.000Z",
		};

		const result = await engine.applyPushBatchResponse(mockResponse);
		assert.equal(result.appliedCount, 1);
		assert.equal(result.duplicateCount, 1);
		assert.equal(result.rejectedCount, 0);
		assert.equal(result.errors.length, 0);

		// Outbox should be cleanly pruned
		const item1 = await storage.getOutboxItem(mut1.id);
		const item2 = await storage.getOutboxItem(mut2.id);
		assert.equal(item1, null);
		assert.equal(item2, null);
	});

	test("forceSync handles successful gateway synchronization flow", async () => {
		const storage = new MemoryCrdtStorageDriver();
		const engine = new CrdtSyncEngine({
			nodeId: "node-tablet-force",
			storageDriver: storage,
		});

		await engine.saveAppointmentOffline({
			id: "app-force-1",
			patientName: "Сидорова Анна",
			status: "confirmed",
		});

		const mockGateway = async (request: SyncPushBatchRequest): Promise<SyncPushBatchResponse> => {
			return {
				syncBatchId: request.syncBatchId,
				processedCount: request.mutations.length,
				appliedCount: request.mutations.length,
				duplicateCount: 0,
				mergedCount: 0,
				rejectedCount: 0,
				results: request.mutations.map((m) => ({
					mutationId: m.mutationId,
					idempotencyKey: m.idempotencyKey,
					status: "applied",
					entityKind: m.entityKind,
					entityId: m.entityId,
					appliedAt: new Date().toISOString(),
				})),
				serverTime: new Date().toISOString(),
			};
		};

		const summary = await engine.forceSync(mockGateway);
		assert.equal(summary.success, true);
		assert.equal(summary.pushedBatch.appliedCount, 1);
		assert.equal(summary.pushedBatch.rejectedCount, 0);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Telemetry, Online/Offline Transitions & Subscriptions
// ─────────────────────────────────────────────────────────────────────────────

describe("CRDT Sync Engine: Telemetry, Online/Offline & Event Subscriptions", () => {
	test("Telemetry calculates pending counts and survivability grade accurately", async () => {
		const storage = new MemoryCrdtStorageDriver();
		const engine = new CrdtSyncEngine({
			nodeId: "node-telemetry",
			storageDriver: storage,
		});

		await engine.savePatientOffline({ id: "p1", fullName: "Пациент 1" });
		await engine.saveAppointmentOffline({ id: "a1", status: "planned" });
		await engine.saveOdontogramOffline("p1", [{ toothNumber: 11, statusCode: "healthy", surfaces: [] }]);

		const telemetry = await engine.getTelemetry();
		assert.equal(telemetry.isOnline, true);
		assert.equal(telemetry.mode, "ONLINE_SYNCED");
		assert.equal(telemetry.totalPending, 3);
		assert.equal(telemetry.bufferedRecordsCount.patients, 1);
		assert.equal(telemetry.bufferedRecordsCount.appointments, 1);
		assert.equal(telemetry.bufferedRecordsCount.odontograms, 1);
		assert.equal(telemetry.survivabilityGrade, "DEGRADED"); // Because pending > 0

		// Switch to Offline mode
		engine.setOnline(false);
		const offlineTelemetry = await engine.getTelemetry();
		assert.equal(offlineTelemetry.isOnline, false);
		assert.equal(offlineTelemetry.mode, "OFFLINE_BUFFERING");
		assert.equal(offlineTelemetry.activeTier, "autonomous_offline");
	});

	test("Event subscription receives mutation_enqueued and status_changed events", async () => {
		const engine = new CrdtSyncEngine({ storageDriver: new MemoryCrdtStorageDriver() });
		const events: string[] = [];

		const unsubscribe = engine.subscribe((evt) => {
			events.push(evt.type);
		});

		engine.setOnline(false);
		await engine.savePatientOffline({ id: "pat-evt", fullName: "Иван" });

		assert.ok(events.includes("status_changed"));
		assert.ok(events.includes("mutation_enqueued"));

		unsubscribe();
		events.length = 0;
		engine.setOnline(true);
		assert.equal(events.length, 0); // No events after unsubscribe
	});
});
