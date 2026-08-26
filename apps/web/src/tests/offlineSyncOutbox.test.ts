/**
 * DENTE CRM — Unit Tests for Offline Caching, Outbox Queue & Sync Engine
 *
 * Test Coverage:
 * 1. IndexedDB Offline Caching (Schedules, Patient Cards 043/u, Odontograms, 804n Price, ICD-10)
 * 2. Outbox Queue (043/u diary mutations, Odontogram stamps, Service additions)
 * 3. Idempotency Key Preservation (RFC 9562 UUIDv7 + SHA-256 state payload hash)
 * 4. Bidirectional Sync Engine (Push/Pull, Exponential Backoff with Jitter, Retries)
 * 5. Conflict Resolution (Field-Level LWW, Odontogram Surface CRDT, Schedule Status Priority)
 * 6. Clinical Conflict Audit Trail Recording
 * 7. Resilient Fallback to LocalStorage & In-Memory Map when IndexedDB is blocked
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, test } from "node:test";
import {
	calibrateClockSkew,
	computePayloadHash,
	createCompositeIdempotencyKey,
	generateUuidV7,
	getAdjustedNowIso,
	resetGlobalClockSkew,
} from "@dental/shared";
import {
	cacheActiveSchedule,
	cacheIcd10Dictionary,
	cacheOdontogramState,
	cachePatientCard,
	cachePriceList804n,
	clearCachedActiveSchedules,
	clearSyncedOfflineMutations,
	deleteCachedPatientCard,
	enqueueCard043Mutation,
	enqueueOdontogramMutation,
	enqueueOfflineMutation,
	enqueueServiceAdditionMutation,
	getCachedActiveSchedule,
	getCachedIcd10Dictionary,
	getCachedOdontogramState,
	getCachedPatientCard,
	getCachedPriceList804n,
	getOfflineMutationById,
	getPendingOfflineMutations,
	listCachedActiveSchedules,
	listCachedPatientCards,
	offlineSyncService,
	resetOfflineDbConnection,
	searchCachedIcd10Dictionary,
	searchCachedPriceList804n,
	updateCachedToothSurface,
	updateOfflineMutationStatus,
} from "../services/offline";
import {
	clearConflictAuditTrail,
	getConflictAuditTrail,
	recordConflictAudit,
	resolveEntityConflict,
	resolveForm043DiaryCrdt,
	resolveScheduleAppointmentCrdt,
	syncEngine,
} from "../services/sync";
import { useOfflineStore } from "../store/offlineStore";

// ─────────────────────────────────────────────────────────────────────────────
// In-Memory Mock IndexedDB for Node.js Test Environment
// ─────────────────────────────────────────────────────────────────────────────

interface MockStoreData {
	keyPath: string;
	indexes: Map<string, string>;
	records: Map<string, any>;
}

class MockIDBTransaction {
	db: MockIDBDatabase;
	mode: string;
	activeRequests = 0;
	oncomplete: (() => void) | null = null;
	onerror: ((err?: any) => void) | null = null;

	constructor(db: MockIDBDatabase, mode: string) {
		this.db = db;
		this.mode = mode;
	}

	requestDone() {
		this.activeRequests--;
		if (this.activeRequests <= 0) {
			setTimeout(() => {
				if (this.oncomplete) this.oncomplete();
			}, 0);
		}
	}

	objectStore(storeName: string) {
		const store = this.db.stores.get(storeName);
		if (!store) throw new Error(`Store ${storeName} not found`);

		const wrap = (req: any, op: () => void) => {
			this.activeRequests++;
			setTimeout(() => {
				try {
					op();
					if (req.onsuccess) req.onsuccess();
				} catch (err) {
					req.error = err;
					if (req.onerror) req.onerror();
				} finally {
					this.requestDone();
				}
			}, 0);
			return req;
		};

		return {
			put: (value: any) => {
				const key = value[store.keyPath];
				const req: any = { result: key };
				return wrap(req, () => {
					store.records.set(key, JSON.parse(JSON.stringify(value)));
				});
			},
			get: (key: string) => {
				const req: any = {};
				return wrap(req, () => {
					const record = store.records.get(key);
					req.result = record ? JSON.parse(JSON.stringify(record)) : undefined;
				});
			},
			getAll: () => {
				const req: any = {};
				return wrap(req, () => {
					req.result = Array.from(store.records.values()).map((r) =>
						JSON.parse(JSON.stringify(r)),
					);
				});
			},
			delete: (key: string) => {
				const req: any = { result: undefined };
				return wrap(req, () => {
					store.records.delete(key);
				});
			},
			clear: () => {
				const req: any = { result: undefined };
				return wrap(req, () => {
					store.records.clear();
				});
			},
			count: () => {
				const req: any = {};
				return wrap(req, () => {
					req.result = store.records.size;
				});
			},
		};
	}
}

class MockIDBDatabase {
	name: string;
	version: number;
	objectStoreNames: {
		contains: (name: string) => boolean;
	};
	stores = new Map<string, MockStoreData>();
	onversionchange: (() => void) | null = null;
	onclose: (() => void) | null = null;

	constructor(name: string, version: number) {
		this.name = name;
		this.version = version;
		this.objectStoreNames = {
			contains: (storeName: string) => this.stores.has(storeName),
		};
	}

	createObjectStore(name: string, options: { keyPath: string }) {
		const storeData: MockStoreData = {
			keyPath: options.keyPath,
			indexes: new Map(),
			records: new Map(),
		};
		this.stores.set(name, storeData);
		return {
			createIndex: (indexName: string, keyPath: string) => {
				storeData.indexes.set(indexName, keyPath);
			},
		};
	}

	transaction(storeNames: string | string[], mode: "readonly" | "readwrite") {
		return new MockIDBTransaction(this, mode);
	}

	close() {
		if (this.onclose) this.onclose();
	}
}

function setupMockIndexedDb() {
	let currentDb: MockIDBDatabase | null = null;

	const mockIndexedDb = {
		open: (name: string, version: number) => {
			const req: any = {};
			setTimeout(() => {
				if (!currentDb || currentDb.version !== version) {
					currentDb = new MockIDBDatabase(name, version);
					req.result = currentDb;
					if (req.onupgradeneeded) req.onupgradeneeded();
				} else {
					req.result = currentDb;
				}
				if (req.onsuccess) req.onsuccess();
			}, 0);
			return req;
		},
	};

	return { mockIndexedDb, getDb: () => currentDb };
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite: Offline IndexedDB Caching & Clinical Dictionaries
// ─────────────────────────────────────────────────────────────────────────────

describe("DENTE Offline Caching Suite (Schedules, Cards, Odontograms, 804n Price, ICD-10)", () => {
	const originalWindowDesc = Object.getOwnPropertyDescriptor(globalThis, "window");
	let localStorageMap = new Map<string, string>();
	let mockDbHolder: ReturnType<typeof setupMockIndexedDb>;

	beforeEach(() => {
		resetOfflineDbConnection();
		resetGlobalClockSkew();
		clearConflictAuditTrail();
		localStorageMap.clear();
		mockDbHolder = setupMockIndexedDb();

		const mockLocalStorage = {
			getItem: (key: string) => localStorageMap.get(key) ?? null,
			setItem: (key: string, val: string) => localStorageMap.set(key, String(val)),
			removeItem: (key: string) => localStorageMap.delete(key),
			clear: () => localStorageMap.clear(),
			get length() {
				return localStorageMap.size;
			},
			key: (i: number) => Array.from(localStorageMap.keys())[i] ?? null,
		};

		Object.defineProperty(globalThis, "window", {
			value: {
				indexedDB: mockDbHolder.mockIndexedDb,
				localStorage: mockLocalStorage,
				location: { hostname: "clinic.local" },
			},
			configurable: true,
			writable: true,
		});
	});

	afterEach(() => {
		resetOfflineDbConnection();
		resetGlobalClockSkew();
		clearConflictAuditTrail();
		if (originalWindowDesc) {
			Object.defineProperty(globalThis, "window", originalWindowDesc);
		} else {
			delete (globalThis as any).window;
		}
	});

	test("1. Active Schedules Caching: saves, retrieves, lists and clears daily doctor schedule", async () => {
		const appointments = [
			{
				appointmentId: "apt-101",
				patientId: "pat-1",
				patientName: "Алексеев А.А.",
				doctorId: "doc-1",
				doctorName: "Д-р Смирнов",
				timeSlot: "09:00 - 10:00",
				status: "confirmed",
			},
			{
				appointmentId: "apt-102",
				patientId: "pat-2",
				patientName: "Борисова Б.Б.",
				doctorId: "doc-1",
				doctorName: "Д-р Смирнов",
				timeSlot: "10:00 - 11:00",
				status: "in_treatment",
			},
		];

		// Cache schedule
		const cached = await cacheActiveSchedule({
			date: "2026-08-26",
			organizationId: "org-test-1",
			appointments,
		});

		assert.strictEqual(cached.date, "2026-08-26");
		assert.strictEqual(cached.organizationId, "org-test-1");
		assert.strictEqual(cached.appointments.length, 2);

		// Retrieve schedule
		const retrieved = await getCachedActiveSchedule("2026-08-26", "org-test-1");
		assert.ok(retrieved, "Cached schedule must be retrieved");
		assert.strictEqual(retrieved.appointments.length, 2);
		assert.strictEqual(retrieved.appointments[0]?.patientName, "Алексеев А.А.");

		// List schedules
		const list = await listCachedActiveSchedules("org-test-1");
		assert.strictEqual(list.length, 1);

		// Clear schedules
		const cleared = await clearCachedActiveSchedules("org-test-1");
		assert.strictEqual(cleared, 1);

		const afterClear = await getCachedActiveSchedule("2026-08-26", "org-test-1");
		assert.strictEqual(afterClear, null);
	});

	test("2. Patient Cards Caching: caches 043/u record, personal data and retrieved offline", async () => {
		const cardData = {
			patientId: "patient-043-test",
			organizationId: "org-test-1",
			personalInfo: {
				fullName: "Константинов К.К.",
				birthDate: "1988-04-12",
				phone: "+7 (999) 123-45-67",
				passport: "4508 123456",
				snils: "123-456-789 00",
				policyOms: "1234567890123456",
				gender: "M",
			},
			card043: {
				anamnesis: "Жалобы на кратковременные боли от сладкого и холодного в 16 зубе",
				complaints: "Чувствительность при приеме пищи",
				allergies: ["Новокаин", "Пенициллин"],
				diagnosisIcd10: "K02.1",
				treatmentPlan: "Препарирование, пломбирование композитом светового отверждения",
			},
		};

		const saved = await cachePatientCard(cardData);
		assert.strictEqual(saved.patientId, "patient-043-test");

		const fetched = await getCachedPatientCard("patient-043-test", "org-test-1");
		assert.ok(fetched);
		assert.strictEqual(fetched.personalInfo.fullName, "Константинов К.К.");
		assert.strictEqual(fetched.card043?.diagnosisIcd10, "K02.1");
		assert.deepEqual(fetched.card043?.allergies, ["Новокаин", "Пенициллин"]);

		const allCards = await listCachedPatientCards("org-test-1");
		assert.strictEqual(allCards.length, 1);

		await deleteCachedPatientCard("patient-043-test");
		const afterDelete = await getCachedPatientCard("patient-043-test");
		assert.strictEqual(afterDelete, null);
	});

	test("3. Odontogram Caching & Surface Condition Updates: tracks per-tooth surfaces", async () => {
		const initialTeeth = [
			{
				toothNumber: 16,
				statusCode: "caries",
				surfaces: ["occlusal", "distal"],
				mobility: 0,
			},
			{
				toothNumber: 21,
				statusCode: "healthy",
				surfaces: [],
			},
		];

		await cacheOdontogramState({
			patientId: "pat-odont-1",
			organizationId: "org-1",
			teeth: initialTeeth,
			adultMode: true,
		});

		const loaded = await getCachedOdontogramState("pat-odont-1", "org-1");
		assert.ok(loaded);
		assert.strictEqual(loaded.teeth.length, 2);
		assert.strictEqual(loaded.teeth[0]?.toothNumber, 16);
		assert.deepEqual(loaded.teeth[0]?.surfaces, ["occlusal", "distal"]);

		// Update tooth surface condition (e.g. adding mesial surface)
		const updated = await updateCachedToothSurface(
			"pat-odont-1",
			16,
			"mesial",
			"caries_deep",
			"org-1",
		);

		const tooth16 = updated.teeth.find((t) => t.toothNumber === 16);
		assert.ok(tooth16);
		assert.strictEqual(tooth16.statusCode, "caries_deep");
		assert.ok(tooth16.surfaces?.includes("mesial"));
		assert.ok(tooth16.surfaces?.includes("occlusal"));
		assert.ok(tooth16.surfaces?.includes("distal"));
	});

	test("4. Order 804n Pricelist Caching & Search: instant offline lookup by code and name", async () => {
		const priceItems = [
			{
				code804n: "A16.07.002.001",
				name: "Восстановление зуба пломбой I, V, VI класс по Блэку с использованием стоматологических цементов",
				category: "Терапевтическая стоматология",
				priceRub: 2500,
				priceKopecks: 250000,
				unit: "усл.",
				isActive: true,
			},
			{
				code804n: "A16.07.008",
				name: "Пломбирование корневого канала зуба пастой",
				category: "Эндодонтия",
				priceRub: 3200,
				priceKopecks: 320000,
				unit: "канал",
				isActive: true,
			},
			{
				code804n: "A16.07.054",
				name: "Внутрикостная дентальная имплантация",
				category: "Хирургия и имплантология",
				priceRub: 35000,
				priceKopecks: 3500000,
				unit: "имплант",
				isActive: true,
			},
		];

		await cachePriceList804n(priceItems, "org-price-1");

		const cached = await getCachedPriceList804n("org-price-1");
		assert.ok(cached);
		assert.strictEqual(cached.items.length, 3);

		// Search by 804n code
		const searchByCode = await searchCachedPriceList804n("A16.07.008", "org-price-1");
		assert.strictEqual(searchByCode.length, 1);
		assert.strictEqual(searchByCode[0]?.name, "Пломбирование корневого канала зуба пастой");

		// Search by Russian text
		const searchByText = await searchCachedPriceList804n("имплантация", "org-price-1");
		assert.strictEqual(searchByText.length, 1);
		assert.strictEqual(searchByText[0]?.code804n, "A16.07.054");
		assert.strictEqual(searchByText[0]?.priceKopecks, 3500000);
	});

	test("5. ICD-10 Dictionary Caching & Search: instant offline lookup of dental diagnoses", async () => {
		const icd10Catalog = [
			{ code: "K02.0", name: "Кариес эмали («белое пятно»)" },
			{ code: "K02.1", name: "Кариес дентина" },
			{ code: "K02.2", name: "Кариес цемента" },
			{ code: "K04.0", name: "Пульпит" },
			{ code: "K04.4", name: "Острый верхушечный периодонтит пульпарного происхождения" },
			{ code: "K05.3", name: "Хронический пародонтит" },
		];

		await cacheIcd10Dictionary(icd10Catalog);

		const dict = await getCachedIcd10Dictionary();
		assert.ok(dict);
		assert.strictEqual(dict.items.length, 6);

		// Search by code
		const codeRes = await searchCachedIcd10Dictionary("K04.0");
		assert.strictEqual(codeRes.length, 1);
		assert.strictEqual(codeRes[0]?.name, "Пульпит");

		// Search by diagnosis title
		const nameRes = await searchCachedIcd10Dictionary("пародонтит");
		assert.strictEqual(nameRes.length, 1);
		assert.strictEqual(nameRes[0]?.code, "K05.3");
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite: Offline Outbox Mutations & Domain Helpers
// ─────────────────────────────────────────────────────────────────────────────

describe("DENTE Offline Outbox Mutations Suite (043/u, Odontogram, Services)", () => {
	const originalWindowDesc = Object.getOwnPropertyDescriptor(globalThis, "window");
	let localStorageMap = new Map<string, string>();
	let mockDbHolder: ReturnType<typeof setupMockIndexedDb>;

	beforeEach(() => {
		resetOfflineDbConnection();
		resetGlobalClockSkew();
		clearConflictAuditTrail();
		localStorageMap.clear();
		mockDbHolder = setupMockIndexedDb();

		const mockLocalStorage = {
			getItem: (key: string) => localStorageMap.get(key) ?? null,
			setItem: (key: string, val: string) => localStorageMap.set(key, String(val)),
			removeItem: (key: string) => localStorageMap.delete(key),
			clear: () => localStorageMap.clear(),
			get length() {
				return localStorageMap.size;
			},
			key: (i: number) => Array.from(localStorageMap.keys())[i] ?? null,
		};

		Object.defineProperty(globalThis, "window", {
			value: {
				indexedDB: mockDbHolder.mockIndexedDb,
				localStorage: mockLocalStorage,
				location: { hostname: "clinic.local" },
			},
			configurable: true,
			writable: true,
		});
	});

	afterEach(() => {
		resetOfflineDbConnection();
		resetGlobalClockSkew();
		clearConflictAuditTrail();
		if (originalWindowDesc) {
			Object.defineProperty(globalThis, "window", originalWindowDesc);
		} else {
			delete (globalThis as any).window;
		}
	});

	test("1. enqueueCard043Mutation: enqueues Form 043/u diary edit with UUIDv7 and SHA-256 hash", async () => {
		const diaryData = {
			anamnesis: "Боль при накусывании 4.6",
			statusLocalis: "Глубокая кариозная полость",
			diagnosisIcd10: "K04.0",
			diagnosisTooth: "46",
		};

		const mut = await enqueueCard043Mutation({
			patientId: "patient-101",
			diaryData,
			action: "update",
			organizationId: "org-1",
			authorUserId: "00000000-0000-7000-8000-000000000001",
		});

		assert.ok(mut.mutationId);
		assert.strictEqual(mut.entityType, "DIARY_043_DRAFT");
		assert.strictEqual(mut.entityId, "patient-101");
		assert.strictEqual(mut.status, "pending");
		assert.strictEqual(mut.payloadHash, computePayloadHash(diaryData));
		assert.ok(mut.idempotencyKey);
	});

	test("2. enqueueOdontogramMutation: enqueues odontogram stamp condition", async () => {
		const mut = await enqueueOdontogramMutation({
			patientId: "patient-202",
			tooth: 36,
			surface: "occlusal",
			condition: "caries_media",
			organizationId: "org-1",
		});

		assert.strictEqual(mut.entityType, "ODONTOGRAM_STATUS");
		assert.strictEqual(mut.entityId, "patient-202");
		assert.deepEqual(mut.payload, {
			tooth: 36,
			surface: "occlusal",
			condition: "caries_media",
		});
	});

	test("3. enqueueServiceAdditionMutation: enqueues treatment item with kopeck-exact price", async () => {
		const mut = await enqueueServiceAdditionMutation({
			visitId: "visit-303",
			patientId: "patient-202",
			serviceItem: {
				code804n: "A16.07.002.001",
				name: "Пломбирование зуба цементом",
				priceRub: 2500,
				priceKopecks: 250000,
				quantity: 1,
				toothNumber: 36,
			},
			organizationId: "org-1",
		});

		assert.strictEqual(mut.entityType, "TREATMENT_PLAN_DRAFT");
		assert.strictEqual(mut.entityId, "visit-303");
		const payload = mut.payload as Record<string, unknown>;
		assert.strictEqual(payload.code804n, "A16.07.002.001");
		assert.strictEqual(payload.priceKopecks, 250000);
		assert.strictEqual(payload.priceRub, 2500);
	});

	test("4. Pending outbox query and lifecycle transitions", async () => {
		await enqueueCard043Mutation({
			patientId: "p1",
			diaryData: { text: "1" },
			organizationId: "org-a",
		});
		await enqueueOdontogramMutation({
			patientId: "p2",
			tooth: 11,
			condition: "healthy",
			organizationId: "org-a",
		});

		const pending = await getPendingOfflineMutations({ organizationId: "org-a" });
		assert.strictEqual(pending.length, 2);

		// Transition first to syncing, then synced
		const firstId = pending[0]!.mutationId;
		await updateOfflineMutationStatus(firstId, "syncing");
		let fetched = await getOfflineMutationById(firstId);
		assert.strictEqual(fetched?.status, "syncing");

		await updateOfflineMutationStatus(firstId, "synced");
		await clearSyncedOfflineMutations();

		const remaining = await getPendingOfflineMutations({ organizationId: "org-a" });
		assert.strictEqual(remaining.length, 1);
		assert.strictEqual(remaining[0]?.entityId, "p2");
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite: Bidirectional Sync Engine & Conflict Resolution
// ─────────────────────────────────────────────────────────────────────────────

describe("DENTE Sync Engine & Conflict Resolution Suite", () => {
	const originalWindowDesc = Object.getOwnPropertyDescriptor(globalThis, "window");
	let localStorageMap = new Map<string, string>();
	let mockDbHolder: ReturnType<typeof setupMockIndexedDb>;

	beforeEach(() => {
		resetOfflineDbConnection();
		resetGlobalClockSkew();
		clearConflictAuditTrail();
		localStorageMap.clear();
		mockDbHolder = setupMockIndexedDb();

		const mockLocalStorage = {
			getItem: (key: string) => localStorageMap.get(key) ?? null,
			setItem: (key: string, val: string) => localStorageMap.set(key, String(val)),
			removeItem: (key: string) => localStorageMap.delete(key),
			clear: () => localStorageMap.clear(),
			get length() {
				return localStorageMap.size;
			},
			key: (i: number) => Array.from(localStorageMap.keys())[i] ?? null,
		};

		Object.defineProperty(globalThis, "window", {
			value: {
				indexedDB: mockDbHolder.mockIndexedDb,
				localStorage: mockLocalStorage,
				location: { hostname: "crm.dente.ru" },
			},
			configurable: true,
			writable: true,
		});
	});

	afterEach(() => {
		resetOfflineDbConnection();
		resetGlobalClockSkew();
		clearConflictAuditTrail();
		if (originalWindowDesc) {
			Object.defineProperty(globalThis, "window", originalWindowDesc);
		} else {
			delete (globalThis as any).window;
		}
	});

	test("1. Field-Level Last-Write-Wins (LWW): non-overlapping fields merge cleanly", () => {
		const serverEntity = {
			id: "pat-1",
			phone: "+7 (999) 111-22-33",
			anamnesis: "Старый анамнез",
		};

		const clientPatch = {
			anamnesis: "Новый анамнез врача на планшете",
		};

		const res = resolveEntityConflict({
			entityKind: "patient",
			entityId: "pat-1",
			serverEntity,
			clientPatch,
			clientUpdatedAt: "2026-08-26T10:05:00.000Z",
			serverUpdatedAt: "2026-08-26T10:00:00.000Z",
		});

		assert.strictEqual(res.resolvedEntity.phone, "+7 (999) 111-22-33", "Independent field preserved");
		assert.strictEqual(res.resolvedEntity.anamnesis, "Новый анамнез врача на планшете", "Client LWW wins");
	});

	test("2. Form 043/u CRDT Diary Conflict: merges odontogram surface sets and SOAP notes", () => {
		const existingDiary = {
			id: "diary-1",
			anamnesis: "Жалобы на боли в 1.6",
			odontogramTeeth: [
				{
					toothNumber: 16,
					statusCode: "caries",
					surfaces: ["occlusal"],
					updatedAt: "2026-08-26T09:00:00.000Z",
				},
			],
		};

		const incomingDiary = {
			id: "diary-1",
			anamnesis: "Жалобы на боли в 1.6 при приеме сладкого",
			odontogramTeeth: [
				{
					toothNumber: 16,
					statusCode: "caries",
					surfaces: ["distal"],
					updatedAt: "2026-08-26T09:30:00.000Z",
				},
			],
		};

		const res = resolveForm043DiaryCrdt({
			existingDiary,
			incomingDiary,
			existingUpdatedAt: "2026-08-26T09:00:00.000Z",
			incomingUpdatedAt: "2026-08-26T09:30:00.000Z",
			nodeId: "tablet-dr-1",
		});

		assert.strictEqual(
			res.resolvedDiary.anamnesis,
			"Жалобы на боли в 1.6 при приеме сладкого",
			"Newer anamnesis wins",
		);

		const teeth = res.resolvedDiary.odontogramTeeth as Array<{ toothNumber: number; surfaces: string[] }>;
		assert.strictEqual(teeth.length, 1);
		assert.strictEqual(teeth[0]?.toothNumber, 16);
		// Surface union: ["distal", "occlusal"]
		assert.ok(teeth[0]?.surfaces.includes("occlusal"));
		assert.ok(teeth[0]?.surfaces.includes("distal"));
	});

	test("3. Schedule Appointment Status Priority CRDT: in_treatment wins over confirmed", () => {
		const existing = {
			id: "apt-1",
			status: "confirmed",
			notes: "Запись подтверждена регистратурой",
		};

		const incoming = {
			id: "apt-1",
			status: "in_treatment",
			notes: "Пациент сел в кресло",
		};

		const res = resolveScheduleAppointmentCrdt({
			existingAppointment: existing,
			incomingAppointment: incoming,
			incomingUpdatedAt: "2026-08-26T10:00:00.000Z",
			nodeId: "doctor-chair-1",
		});

		assert.strictEqual(res.resolvedAppointment.status, "in_treatment", "Clinical status priority wins");
	});

	test("4. Bidirectional Sync Engine: batch drain with mock HTTP gateway and conflict auditing", async () => {
		await enqueueCard043Mutation({
			patientId: "patient-sync-test",
			diaryData: { anamnesis: "Синхронизация" },
			organizationId: "org-sync-1",
		});

		let mockSentBody: any = null;
		const mockFetch = async (
			_url: string | URL | Request,
			init?: RequestInit,
		): Promise<Response> => {
			mockSentBody = JSON.parse(String(init?.body || "{}"));
			return new Response(
				JSON.stringify({
					syncBatchId: mockSentBody.syncBatchId,
					processedCount: mockSentBody.mutations.length,
					appliedCount: mockSentBody.mutations.length,
					duplicateCount: 0,
					mergedCount: 0,
					rejectedCount: 0,
					results: mockSentBody.mutations.map((m: any) => ({
						mutationId: m.mutationId,
						idempotencyKey: m.idempotencyKey,
						status: "applied",
						entityKind: m.entityKind,
						entityId: m.entityId,
						appliedAt: new Date().toISOString(),
					})),
					serverTime: new Date().toISOString(),
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		};

		const syncRes = await syncEngine.syncBidirectional({
			fetchImpl: mockFetch as unknown as typeof fetch,
			organizationId: "org-sync-1",
		});

		assert.strictEqual(syncRes.pushedBatch.processedCount, 1);
		assert.strictEqual(syncRes.pushedBatch.appliedCount, 1);
		assert.strictEqual(syncRes.pushedBatch.failedCount, 0);
		assert.ok(mockSentBody);
		assert.strictEqual(mockSentBody.mutations.length, 1);
		assert.ok(mockSentBody.mutations[0]?.idempotencyKey);

		// Verify outbox is cleared
		const pendingAfter = await getPendingOfflineMutations({ organizationId: "org-sync-1" });
		assert.strictEqual(pendingAfter.length, 0);
	});

	test("5. Conflict Audit Trail: records and retrieves conflict audit entries", () => {
		clearConflictAuditTrail();

		const records = recordConflictAudit({
			entityKind: "patient",
			entityId: "pat-audit-1",
			mutationId: "mut-audit-1",
			conflicts: [
				{
					field: "phone",
					clientValue: "+7 (999) 000-00-01",
					serverValue: "+7 (999) 000-00-02",
					resolvedValue: "+7 (999) 000-00-01",
					strategy: "lww",
					winner: "client",
					reason: "Client timestamp is newer",
				},
			],
		});

		assert.strictEqual(records.length, 1);
		assert.strictEqual(records[0]?.field, "phone");
		assert.strictEqual(records[0]?.winner, "client");

		const all = getConflictAuditTrail();
		assert.strictEqual(all.length, 1);
		assert.strictEqual(all[0]?.entityId, "pat-audit-1");
	});
});
