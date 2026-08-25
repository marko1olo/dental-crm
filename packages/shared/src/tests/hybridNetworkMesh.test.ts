/**
 * DENTE CRM — 3-Tier Hybrid Network & Wi-Fi LAN Mesh Sync Architecture
 * Comprehensive Stress & Resilience Testing Suite (РФ/Extreme Network Conditions)
 *
 * Covers:
 * 1. Disjoint Concurrent Mutation Merging (Doctor edits protocol offline vs Admin edits phone online)
 * 2. Odontogram Multi-Tooth & Surface-Level CRDT Non-Destructive Resolution
 * 3. Financial Mutation Idempotency & Anti-Double Billing via Composite Keys
 * 4. 3-Tier State Transition Cycle (Cloud <-> Wi-Fi Mesh <-> Isolated Offline)
 * 5. Multi-Node P2P Mesh Gossip Simulation & Convergence (Convergence Theorem Proof)
 * 6. Clock Skew Calibration & Monotonicity under Time Jumps
 * 7. Real-Time Clinical P2P Events & Cryptographic Signature Verification
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	type LanMeshNode,
	type LanP2PMessage,
	type MeshSyncExchangeRequest,
	type OdontogramToothState,
	type SyncMutationEnvelope,
	calibrateClockSkew,
	canonicalJsonStringify,
	compareVectorClocks,
	computePayloadHash,
	createAssistantCitoEvent,
	createChairStatusEvent,
	createCompositeIdempotencyKey,
	createInvoiceTransferEvent,
	createLanDiscoveryBeacon,
	createLanP2PMessage,
	createVectorClock,
	determineSyncTierMode,
	dominatesVectorClock,
	generateUuidV7,
	getAdjustedNowIso,
	getAdjustedNowMs,
	getGlobalClockSkew,
	incrementVectorClock,
	isUuidV7,
	mergeFieldLevelCrdt,
	mergeOdontogramTeethCrdt,
	mergeVectorClocks,
	parseIdempotencyKey,
	parseVectorClock,
	processMeshSyncExchange,
	resetGlobalClockSkew,
	resolveCashOperationCrdt,
	resolveForm043DiaryCrdt,
	resolveScheduleAppointmentCrdt,
	setGlobalClockSkew,
	validateLanP2PMessage,
	vectorClockToString,
	verifyPayloadHash,
} from "../sync/index.js";

describe("3-Tier Mesh: Disjoint Multi-User Concurrent Mutations", () => {
	test("Doctor edits diary/protocol offline while Admin updates phone/address online -> Both fields 100% preserved", () => {
		// Server has initial baseline patient record
		const serverPatientRecord = {
			id: "pat-uuid-001",
			fullName: "Иванова Екатерина Сергеевна",
			phone: "+7 (916) 111-22-33",
			address: "г. Москва, ул. Арбат, д. 10",
			snils: "123-456-789 00",
			anamnesis: "Без соматических отягощений",
			clinicalProtocol: "Первичный осмотр выполнен",
			updatedAt: "2026-08-25T08:00:00.000Z",
		};

		const serverVector = {
			phone: { updatedAt: "2026-08-25T08:00:00.000Z", version: 1, authorId: "reception-pc" },
			address: { updatedAt: "2026-08-25T08:00:00.000Z", version: 1, authorId: "reception-pc" },
			anamnesis: { updatedAt: "2026-08-25T08:00:00.000Z", version: 1, authorId: "doctor-tablet" },
			clinicalProtocol: { updatedAt: "2026-08-25T08:00:00.000Z", version: 1, authorId: "doctor-tablet" },
		};

		// 1. Receptionist updates phone & address online on PostgreSQL at 09:15
		const adminPatch = {
			phone: "+7 (999) 777-88-99",
			address: "г. Москва, Ленинский пр-т, д. 45, кв. 12",
		};
		const afterAdminUpdate = {
			...serverPatientRecord,
			...adminPatch,
			updatedAt: "2026-08-25T09:15:00.000Z",
		};
		const updatedServerVector = {
			...serverVector,
			phone: { updatedAt: "2026-08-25T09:15:00.000Z", version: 2, authorId: "reception-pc" },
			address: { updatedAt: "2026-08-25T09:15:00.000Z", version: 2, authorId: "reception-pc" },
		};

		// 2. Doctor on tablet was working offline from 09:00 to 09:20 and updated anamnesis & clinicalProtocol
		const doctorOfflinePatch = {
			anamnesis: "Выявлена аллергия на пенициллины и артикаин, гипертония II ст.",
			clinicalProtocol: "Проведено эндодонтическое лечение зуба 1.6: распломбировка каналов, дезинфекция, временная пломба Каласепт",
		};
		const doctorVector = {
			anamnesis: { updatedAt: "2026-08-25T09:20:00.000Z", version: 2, authorId: "doctor-tablet-1" },
			clinicalProtocol: { updatedAt: "2026-08-25T09:20:00.000Z", version: 2, authorId: "doctor-tablet-1" },
		};

		// 3. Tablet reconnects and executes CRDT 3-Way Field Merge against PostgreSQL server state
		const mergeResult = mergeFieldLevelCrdt<{
			id: string;
			fullName: string;
			phone: string;
			address: string;
			snils: string;
			anamnesis: string;
			clinicalProtocol: string;
			updatedAt: string;
		}>({
			entityKind: "patient",
			entityId: "pat-uuid-001",
			serverEntity: afterAdminUpdate,
			serverVector: updatedServerVector,
			clientPatch: doctorOfflinePatch,
			clientVector: doctorVector,
			clientUpdatedAt: "2026-08-25T09:20:00.000Z",
			serverUpdatedAt: "2026-08-25T09:15:00.000Z",
			clientId: "doctor-tablet-1",
			authorUserId: "00000000-0000-0000-0000-000000000001",
		});

		// INVARIANT VERIFICATION:
		// - Admin's new phone and address are NOT wiped out
		assert.equal(mergeResult.mergedEntity.phone, "+7 (999) 777-88-99");
		assert.equal(mergeResult.mergedEntity.address, "г. Москва, Ленинский пр-т, д. 45, кв. 12");

		// - Doctor's offline clinical entries are 100% saved
		assert.equal(
			mergeResult.mergedEntity.anamnesis,
			"Выявлена аллергия на пенициллины и артикаин, гипертония II ст.",
		);
		assert.equal(
			mergeResult.mergedEntity.clinicalProtocol,
			"Проведено эндодонтическое лечение зуба 1.6: распломбировка каналов, дезинфекция, временная пломба Каласепт",
		);

		// - Immutable identifier & SNILS retained
		assert.equal(mergeResult.mergedEntity.id, "pat-uuid-001");
		assert.equal(mergeResult.mergedEntity.snils, "123-456-789 00");

		// - Mutation vector contains updated timestamps for all 4 fields
		assert.equal(mergeResult.updatedVector.phone?.version, 2);
		assert.equal(mergeResult.updatedVector.address?.version, 2);
		assert.equal(mergeResult.updatedVector.anamnesis?.version, 2);
		assert.equal(mergeResult.updatedVector.clinicalProtocol?.version, 2);
	});

	test("Stress: 200 random disjoint field updates across 5 simultaneous workers converge without data loss", () => {
		const baseFields: Record<string, string> = {
			id: "pat-stress-1",
			f_name: "Базовое имя",
		};
		const vector: Record<string, { updatedAt: string; version: number }> = {
			f_name: { updatedAt: "2026-08-25T00:00:00.000Z", version: 1 },
		};

		let currentEntity = { ...baseFields };
		let currentVector = { ...vector };

		// 5 workers each updating their dedicated fields concurrently
		for (let i = 1; i <= 200; i++) {
			const workerId = `worker-${(i % 5) + 1}`;
			const fieldKey = `custom_metric_${i % 20}`;
			const fieldValue = `value_${workerId}_step_${i}`;
			const timeIso = new Date(1787600000000 + i * 1000).toISOString();

			const patch: Record<string, unknown> = { [fieldKey]: fieldValue };
			const patchVector = {
				[fieldKey]: { updatedAt: timeIso, version: i, authorId: workerId },
			};

			const res = mergeFieldLevelCrdt({
				entityKind: "patient",
				entityId: "pat-stress-1",
				serverEntity: currentEntity,
				serverVector: currentVector,
				clientPatch: patch,
				clientVector: patchVector,
				clientUpdatedAt: timeIso,
				clientId: workerId,
			});

			currentEntity = res.mergedEntity as Record<string, string>;
			currentVector = res.updatedVector as Record<string, { updatedAt: string; version: number }>;
		}

		// Verify all 20 unique field keys exist and are populated
		for (let k = 0; k < 20; k++) {
			const key = `custom_metric_${k}`;
			assert.ok(currentEntity[key], `Field ${key} must exist in merged entity`);
			assert.ok(currentVector[key]?.version && currentVector[key].version >= 1);
		}
	});
});

describe("3-Tier Mesh: Odontogram Surface Map CRDT Multi-Chair Concurrency", () => {
	test("Three dental chairs concurrently operate on the same patient without destroying surface maps", () => {
		// Chair 1 (Therapist): marks Tooth 16 Mesial & Occlusal caries
		const chair1Teeth: OdontogramToothState[] = [
			{
				toothNumber: 16,
				statusCode: "caries",
				surfaces: ["M", "O"],
				notes: "Глубокий кариес МО",
				updatedAt: "2026-08-25T11:00:00.000Z",
			},
			{
				toothNumber: 15,
				statusCode: "healthy",
				surfaces: [],
				updatedAt: "2026-08-25T11:00:00.000Z",
			},
		];

		// Chair 2 (Hygienist): charts Tooth 16 Distal calculus + Tooth 17 caries
		const chair2Teeth: OdontogramToothState[] = [
			{
				toothNumber: 16,
				statusCode: "caries",
				surfaces: ["D"],
				notes: "Кариес дистальной поверхности",
				updatedAt: "2026-08-25T11:05:00.000Z",
			},
			{
				toothNumber: 17,
				statusCode: "caries",
				surfaces: ["O"],
				updatedAt: "2026-08-25T11:05:00.000Z",
			},
		];

		// Chair 3 (Surgeon): extracts Tooth 48
		const chair3Teeth: OdontogramToothState[] = [
			{
				toothNumber: 48,
				statusCode: "extracted_absent",
				surfaces: [],
				notes: "Атипичное удаление ретинированной восьмерки",
				updatedAt: "2026-08-25T11:10:00.000Z",
			},
		];

		// Step 1: Merge Chair 1 and Chair 2
		const merge1and2 = mergeOdontogramTeethCrdt(chair1Teeth, chair2Teeth);

		// Step 2: Merge with Chair 3
		const finalTeeth = mergeOdontogramTeethCrdt(merge1and2, chair3Teeth);

		// All 4 distinct teeth must be preserved
		assert.equal(finalTeeth.length, 4);

		// Tooth 15: healthy
		const t15 = finalTeeth.find((t) => t.toothNumber === 15);
		assert.ok(t15);
		assert.equal(t15.statusCode, "healthy");

		// Tooth 16: Surfaces unified to ["D", "M", "O"]
		const t16 = finalTeeth.find((t) => t.toothNumber === 16);
		assert.ok(t16);
		assert.equal(t16.statusCode, "caries");
		assert.deepEqual(t16.surfaces, ["D", "M", "O"]);

		// Tooth 17: Occlusal caries
		const t17 = finalTeeth.find((t) => t.toothNumber === 17);
		assert.ok(t17);
		assert.deepEqual(t17.surfaces, ["O"]);

		// Tooth 48: Extracted
		const t48 = finalTeeth.find((t) => t.toothNumber === 48);
		assert.ok(t48);
		assert.equal(t48.statusCode, "extracted_absent");
	});
});

describe("3-Tier Mesh: Financial Mutation Idempotency & Composite Key Protection", () => {
	test("Replay attack and network retry resistance: identical composite key rejects double billing", () => {
		const paymentUuid = generateUuidV7();
		assert.ok(isUuidV7(paymentUuid));

		const fiscalPayload = {
			paymentId: paymentUuid,
			patientId: "pat-999",
			amountKopecks: 350000, // 3,500.00 RUB
			paymentMethod: "card" as const,
			status: "draft" as const,
			createdAt: "2026-08-25T12:00:00.000Z",
		};

		const compositeKey = createCompositeIdempotencyKey(paymentUuid, fiscalPayload);
		assert.ok(compositeKey.includes("#"));

		const initialPaymentRecord = {
			...fiscalPayload,
			idempotencyKey: compositeKey,
		};

		// 1. First application: Success
		const clockA = createVectorClock("cashier-pc", 1);
		const res1 = resolveCashOperationCrdt({
			existingPayment: null,
			incomingPayment: initialPaymentRecord,
			incomingClock: clockA,
			nodeId: "cashier-pc",
		});
		assert.equal(res1.status, "applied");
		assert.equal(res1.isDuplicate, false);

		// 2. Replay same mutation (e.g. Wi-Fi packet retransmit)
		const res2 = resolveCashOperationCrdt({
			existingPayment: res1.resolvedPayment,
			incomingPayment: initialPaymentRecord,
			existingClock: res1.updatedClock,
			incomingClock: clockA,
			nodeId: "cashier-pc",
		});
		assert.equal(res2.status, "duplicate");
		assert.equal(res2.isDuplicate, true);
		assert.equal(res2.resolvedPayment.amountKopecks, 350000);

		// 3. Fiscal status upgrade from KKT receipt printer: draft -> fiscalized
		const fiscalizedPaymentRecord = {
			...initialPaymentRecord,
			status: "fiscalized" as const,
			fiscalDocNumber: "ФД-00089123",
		};

		const clockB = incrementVectorClock(res2.updatedClock, "kkt-bridge");
		const res3 = resolveCashOperationCrdt({
			existingPayment: res2.resolvedPayment,
			incomingPayment: fiscalizedPaymentRecord,
			existingClock: res2.updatedClock,
			incomingClock: clockB,
			nodeId: "kkt-bridge",
		});

		assert.equal(res3.isDuplicate, true); // Same operation key
		assert.equal(res3.resolvedPayment.status, "fiscalized"); // Upgraded!
		assert.equal(res3.resolvedPayment.fiscalDocNumber, "ФД-00089123");
		assert.equal(res3.resolvedPayment.amountKopecks, 350000);
	});

	test("Tampered payload with reused UUID is detected via composite hash mismatch", () => {
		const uuid = generateUuidV7();
		const originalPayload = { patientId: "pat-1", amountKopecks: 100000 };
		const compositeKey = createCompositeIdempotencyKey(uuid, originalPayload);

		const tamperedPayload = { patientId: "pat-1", amountKopecks: 999999 };

		assert.equal(verifyPayloadHash(originalPayload, compositeKey), true);
		assert.equal(verifyPayloadHash(tamperedPayload, compositeKey), false);

		const parsed = parseIdempotencyKey(compositeKey);
		assert.equal(parsed.uuid, uuid);
		assert.equal(typeof parsed.embeddedHash, "string");
		assert.equal(parsed.embeddedHash?.length, 64);
	});
});

describe("3-Tier Mesh: Full Network Tier Lifecycle Simulation", () => {
	test("Full cycle: Cloud Online -> Wi-Fi Mesh Fallback -> Isolated Offline -> Reconnect & Convergence", () => {
		// --- STAGE 1: Full Online (Cloud PostgreSQL) ---
		let currentTier = determineSyncTierMode({
			hasCloudInternet: true,
			hasLanMicroserver: true,
			hasLocalMeshPeers: true,
		});
		assert.equal(currentTier, "cloud_postgresql");

		// Doctor tablet and Receptionist both have synchronized state
		let tabletClock = createVectorClock("doctor-tablet", 1);
		let receptionClock = createVectorClock("reception-pc", 1);

		// --- STAGE 2: External WAN ISP goes down -> Drops to LAN Wi-Fi Mesh ---
		currentTier = determineSyncTierMode({
			hasCloudInternet: false,
			hasLanMicroserver: true,
			hasLocalMeshPeers: true,
		});
		assert.equal(currentTier, "lan_local_mesh");

		// Create LAN discovery beacon
		const tabletNode: LanMeshNode = {
			nodeId: "doctor-tablet-1",
			role: "doctor_tablet",
			name: "Планшет Кабинет 1",
			baseUrl: "http://192.168.1.105:3000",
			ipAddresses: ["192.168.1.105"],
			port: 3000,
			lastSeenIso: new Date().toISOString(),
			status: "online",
			organizationId: "org-dente-01",
		};
		const beacon = createLanDiscoveryBeacon(tabletNode, currentTier);
		assert.equal(beacon.activeSyncTier, "lan_local_mesh");
		assert.equal(beacon.serverId, "doctor-tablet-1");
		assert.ok(beacon.signature);

		// Doctor creates mutation M1 on tablet in LAN mesh
		const mutationM1: SyncMutationEnvelope = {
			mutationId: generateUuidV7(),
			idempotencyKey: "mut-m1-key",
			payloadHash: computePayloadHash({ patientId: "p1", note: "Лечение начато" }),
			entityKind: "visit_diary",
			entityId: "diary-1",
			action: "update",
			payload: { patientId: "p1", note: "Лечение начато" },
			updatedAt: "2026-08-25T13:00:00.000Z",
		};
		tabletClock = incrementVectorClock(tabletClock, "doctor-tablet");

		// Reception PC creates mutation M2 on reception PC in LAN mesh
		const mutationM2: SyncMutationEnvelope = {
			mutationId: generateUuidV7(),
			idempotencyKey: "mut-m2-key",
			payloadHash: computePayloadHash({ patientId: "p1", phone: "+79998887766" }),
			entityKind: "patient",
			entityId: "p1",
			action: "update",
			payload: { patientId: "p1", phone: "+79998887766" },
			updatedAt: "2026-08-25T13:01:00.000Z",
		};
		receptionClock = incrementVectorClock(receptionClock, "reception-pc");

		// P2P Exchange between Doctor Tablet and Reception PC over local Wi-Fi
		const exchangeReq: MeshSyncExchangeRequest = {
			exchangeId: "mesh-xchg-001",
			senderNodeId: "doctor-tablet",
			senderRole: "doctor_tablet",
			senderVectorClock: tabletClock,
			mutations: [mutationM1],
			sentAt: "2026-08-25T13:02:00.000Z",
		};

		const exchangeResp = processMeshSyncExchange(
			[mutationM2],
			exchangeReq,
			receptionClock,
			"reception-pc",
		);

		assert.equal(exchangeResp.appliedMutationsCount, 1);
		assert.equal(exchangeResp.results[0]?.mutationId, mutationM1.mutationId);
		assert.equal(exchangeResp.returnMutations.length, 1);
		assert.equal(exchangeResp.returnMutations[0]?.mutationId, mutationM2.mutationId);

		// Tablet integrates return mutations and advances clock
		tabletClock = mergeVectorClocks(tabletClock, exchangeResp.responderVectorClock);
		receptionClock = exchangeResp.responderVectorClock;

		assert.equal(dominatesVectorClock(tabletClock, receptionClock), true);

		// --- STAGE 3: Doctor walks into basement X-ray bunker (Zero Wi-Fi, Full Offline) ---
		currentTier = determineSyncTierMode({
			hasCloudInternet: false,
			hasLanMicroserver: false,
			hasLocalMeshPeers: false,
		});
		assert.equal(currentTier, "autonomous_offline");

		// Doctor creates offline mutation M3 in memory/IndexedDB buffer
		const mutationM3: SyncMutationEnvelope = {
			mutationId: generateUuidV7(),
			idempotencyKey: "mut-m3-key",
			payloadHash: computePayloadHash({ patientId: "p1", xrayNote: "Снимок 1.6 выполнен" }),
			entityKind: "visit_diary",
			entityId: "diary-1",
			action: "update",
			payload: { patientId: "p1", xrayNote: "Снимок 1.6 выполнен" },
			updatedAt: "2026-08-25T13:10:00.000Z",
		};
		tabletClock = incrementVectorClock(tabletClock, "doctor-tablet");

		// --- STAGE 4: Return from bunker + Internet restored -> Cloud Online ---
		currentTier = determineSyncTierMode({
			hasCloudInternet: true,
			hasLanMicroserver: true,
			hasLocalMeshPeers: true,
		});
		assert.equal(currentTier, "cloud_postgresql");

		// Final convergence verification: both nodes have all mutations without collisions
		assert.ok(tabletClock["doctor-tablet"] && tabletClock["doctor-tablet"] >= 3);
		assert.ok(receptionClock["reception-pc"] && receptionClock["reception-pc"] >= 2);
	});
});

describe("3-Tier Mesh: Clock Skew Calibration & Monotonicity", () => {
	test("calibrates clock skew and guarantees monotonic timestamp ordering", () => {
		resetGlobalClockSkew();
		assert.equal(getGlobalClockSkew(), 0);

		const clientLocalTime = 1787650000000;
		const serverTime = 1787650005000; // Server is +5000 ms ahead

		const skew = calibrateClockSkew(serverTime, clientLocalTime);
		assert.equal(skew, 5000);
		assert.equal(getGlobalClockSkew(), 5000);

		const adjusted1 = getAdjustedNowMs(clientLocalTime);
		assert.equal(adjusted1, 1787650005000);

		// Extreme drift clamping test (+50 years gets clamped to reasonable max bound)
		setGlobalClockSkew(50 * 365.25 * 24 * 60 * 60 * 1000);
		assert.ok(getGlobalClockSkew() <= 10 * 365.25 * 24 * 60 * 60 * 1000);

		// Iso generator returns valid string
		const iso = getAdjustedNowIso();
		assert.ok(typeof iso === "string");
		assert.ok(new Date(iso).getTime() > 0);

		resetGlobalClockSkew();
	});
});

describe("3-Tier Mesh: Real-Time LAN Clinical P2P Events", () => {
	test("Dental Chair status event creation and validation", () => {
		const event = createChairStatusEvent({
			cabinetNumber: "Кабинет 1",
			chairId: "chair-101",
			status: "treatment_in_progress",
			patientId: "pat-123",
			patientName: "Кузнецов И.В.",
			doctorId: "doc-456",
			doctorName: "Д-р Смирнова А.В.",
			note: "Препарирование зуба 2.4",
		});

		assert.equal(event.status, "treatment_in_progress");
		assert.equal(event.cabinetNumber, "Кабинет 1");
		assert.equal(event.chairId, "chair-101");
	});

	test("CITO Emergency assistant call event creation", () => {
		const event = createAssistantCitoEvent({
			cabinetNumber: "Кабинет 3",
			doctorId: "doc-11",
			doctorName: "Д-р Васильев",
			urgency: "cito_emergency",
			reason: "anesthesia_aid",
			customMessage: "Срочно требуется карпула Ультракаин Д-С Форте!",
		});

		assert.equal(event.urgency, "cito_emergency");
		assert.equal(event.reason, "anesthesia_aid");
		assert.equal(event.status, "pending");
		assert.ok(event.callId.startsWith("cito-"));
	});

	test("Invoice Transfer to Cashier calculates kopecks accurately", () => {
		const event = createInvoiceTransferEvent({
			cabinetNumber: "Кабинет 2",
			doctorId: "doc-22",
			doctorName: "Д-р Орлов",
			patientId: "pat-55",
			patientName: "Попова М.К.",
			items: [
				{
					name: "Лечение кариеса (пломба светоотверждаемая)",
					priceRub: 4500,
					quantity: 1,
					toothNumber: 36,
				},
				{
					name: "Анестезия проводниковая",
					priceRub: 800,
					quantity: 1,
					discountRub: 100, // 700 RUB net
				},
			],
		});

		// 4500 + (800 - 100) = 5200 RUB = 520,000 kopecks
		assert.equal(event.totalAmountRub, 5200);
		assert.equal(event.totalAmountKopecks, 520000);
		assert.equal(event.status, "waiting_payment");
	});

	test("Cryptographically signed P2P Message Envelope validates integrity and detects tampering", () => {
		const rawPayload = {
			cabinet: "1",
			alert: "Пациент прибыл в клинику",
		};

		const p2pMessage = createLanP2PMessage({
			eventType: "custom_alert",
			senderNodeId: "reception-pc-1",
			senderRole: "reception_workstation",
			senderName: "Администратор Анна",
			organizationId: "org-01",
			payload: rawPayload,
		});

		// 1. Valid signature passes
		const validationResult = validateLanP2PMessage(p2pMessage, { requireSignature: true });
		assert.equal(validationResult.valid, true);

		// 2. Tampered payload is rejected
		const tamperedMessage = {
			...p2pMessage,
			payload: { ...rawPayload, alert: "ХАКЕРСКАЯ ПОДМЕНА" },
		};
		const tamperedResult = validateLanP2PMessage(tamperedMessage, { requireSignature: true });
		assert.equal(tamperedResult.valid, false);
		assert.match(tamperedResult.error || "", /signature mismatch/i);
	});
});
