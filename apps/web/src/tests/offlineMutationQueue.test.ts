/**
 * DENTE CRM — Unit Tests for Offline Mutation Outbox & Network Connectivity Engine
 *
 * Проверка:
 * 1. Отказоустойчивая очередь мутаций в IndexedDB (043/у, одонтограмма, рецепты, документы, чеки)
 * 2. Точность меток времени (ISO 8601 + ms) и валидность UUID v4
 * 3. Сериализация и восстановление черновиков (100% защита от потери данных)
 * 4. Прозрачный fallback на LocalStorage при отказе IndexedDB
 * 5. Детекция состояний сети: «🟢 Онлайн (Облако)», «🟡 Локальная сеть клиники (LAN/Wi-Fi)», «🟠 Автономный офлайн»
 * 6. Измерение задержки RTT и пакетная синхронизация очереди
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, test } from "node:test";
import {
	computePayloadHash,
	createCompositeIdempotencyKey,
} from "@dental/shared";
import { offlineSyncService } from "../services/offline";
import { useOfflineStore } from "../store/offlineStore";
import {
	ConnectivityMode,
	determineNetworkConnectivity,
	INITIAL_NETWORK_STATE,
	isLocalOrLanHostname,
	measureNetworkRtt,
	NETWORK_STATE_LABELS,
} from "../utils/networkConnectivity";
import {
	clearSyncedOfflineMutations,
	deleteOfflineDraft,
	deleteOfflineMutation,
	DRAFTS_STORE_NAME,
	enqueueOfflineMutation,
	generateMutationUuid,
	getOfflineMutationById,
	getOfflineQueueMetrics,
	getPendingOfflineMutations,
	isIndexedDbAvailable,
	listOfflineDrafts,
	loadOfflineDraft,
	LOCAL_STORAGE_DRAFTS_PREFIX,
	LOCAL_STORAGE_MUTATIONS_KEY,
	MUTATIONS_STORE_NAME,
	nowIsoWithMs,
	OFFLINE_DB_NAME,
	OFFLINE_DB_VERSION,
	openOfflineOutboxDb,
	resetOfflineDbConnection,
	saveOfflineDraft,
	updateOfflineMutationStatus,
} from "../utils/offlineMutationQueue";

// ─────────────────────────────────────────────────────────────────────────────
// Mock In-Memory IndexedDB Implementation for Node.js Testing
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
// Test Suite: Offline Mutation Queue (IndexedDB + Outbox)
// ─────────────────────────────────────────────────────────────────────────────

describe("Offline Mutation Queue Engine (IndexedDB Outbox)", () => {
	const originalWindowDesc = Object.getOwnPropertyDescriptor(globalThis, "window");
	let localStorageMap = new Map<string, string>();
	let mockDbHolder: ReturnType<typeof setupMockIndexedDb>;

	beforeEach(() => {
		resetOfflineDbConnection();
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
		if (originalWindowDesc) {
			Object.defineProperty(globalThis, "window", originalWindowDesc);
		} else {
			delete (globalThis as any).window;
		}
	});

	test("1. UUID generation: creates valid RFC 9562 UUIDv7 identifiers", () => {
		const uuid = generateMutationUuid();
		assert.match(
			uuid,
			/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
			"Mutation UUID must conform to RFC 9562 UUIDv7 format",
		);

		const uuid2 = generateMutationUuid();
		assert.notEqual(uuid, uuid2, "Generated UUIDs must be uniquely distinct");
	});


	test("2. Timestamp precision: produces ISO 8601 timestamps with millisecond accuracy", () => {
		const ts = nowIsoWithMs();
		assert.match(
			ts,
			/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
			"Timestamp must have ISO 8601 with 3-digit millisecond precision",
		);
	});

	test("3. Schema Versioning: opens DB and initializes mutations and drafts stores", async () => {
		const db = await openOfflineOutboxDb();
		assert.ok(db, "IndexedDB instance should open successfully");
		assert.strictEqual(db.name, OFFLINE_DB_NAME);
		assert.strictEqual(db.version, OFFLINE_DB_VERSION);
		assert.ok(
			db.objectStoreNames.contains(MUTATIONS_STORE_NAME),
			"mutations store must exist",
		);
		assert.ok(
			db.objectStoreNames.contains(DRAFTS_STORE_NAME),
			"drafts store must exist",
		);
	});

	test("4. Enqueue mutations across all 5 clinical domain types", async () => {
		// 1. DIARY_043_DRAFT (Form 043/u)
		const diaryMutation = await enqueueOfflineMutation({
			entityType: "DIARY_043_DRAFT",
			entityId: "visit-101",
			action: "update",
			payload: {
				anamnesis: "Жалобы на острую боль в 46 зубе при накусывании",
				statusLocalis: "Глубокая кариозная полость на жевательной поверхности",
				diagnosisIcd10: "K04.0",
				diagnosisTooth: "46",
				treatmentDescription: "Экстирпация пульпы, медикаментозная обработка",
			},
			organizationId: "org-alpha",
		});

		assert.ok(diaryMutation.mutationId);
		assert.strictEqual(diaryMutation.entityType, "DIARY_043_DRAFT");
		assert.strictEqual(diaryMutation.status, "pending");
		assert.strictEqual(diaryMutation.retryCount, 0);

		// 2. ODONTOGRAM_STATUS
		const odontogramMutation = await enqueueOfflineMutation({
			entityType: "ODONTOGRAM_STATUS",
			entityId: "patient-202",
			action: "update",
			payload: {
				tooth: 36,
				surface: "occlusal",
				condition: "caries",
				mobility: 0,
			},
			organizationId: "org-alpha",
		});
		assert.strictEqual(odontogramMutation.entityType, "ODONTOGRAM_STATUS");

		// 3. PRESCRIPTION_107_DRAFT (Form 107-1/u)
		const prescriptionMutation = await enqueueOfflineMutation({
			entityType: "PRESCRIPTION_107_DRAFT",
			entityId: "rx-303",
			action: "create",
			payload: {
				inn: "Амоксициллин + Клавулановая кислота",
				dosage: "875мг + 125мг",
				form: "Таблетки",
				signature: "По 1 таб. 2 раза в день во время еды 7 дней",
				validityDays: 15,
			},
			organizationId: "org-alpha",
		});
		assert.strictEqual(prescriptionMutation.entityType, "PRESCRIPTION_107_DRAFT");

		// 4. DOCUMENT_DRAFT
		const documentMutation = await enqueueOfflineMutation({
			entityType: "DOCUMENT_DRAFT",
			entityId: "doc-404",
			action: "create",
			payload: {
				templateKey: "informed_consent_surgery",
				patientName: "Иванов И.И.",
				signedByPatient: true,
			},
			organizationId: "org-alpha",
		});
		assert.strictEqual(documentMutation.entityType, "DOCUMENT_DRAFT");

		// 5. CASH_RECEIPT_DRAFT (54-FZ)
		const cashReceiptMutation = await enqueueOfflineMutation({
			entityType: "CASH_RECEIPT_DRAFT",
			entityId: "receipt-505",
			action: "create",
			payload: {
				calculationSign: "ПОЛНЫЙ РАСЧЕТ",
				totalAmountKopecks: 1250000,
				fiscalTag1214: "4",
				fiscalTag1212: "4",
				paymentMethod: "BANK_CARD",
			},
			organizationId: "org-alpha",
		});
		assert.strictEqual(cashReceiptMutation.entityType, "CASH_RECEIPT_DRAFT");

		// Verify pending list
		const pending = await getPendingOfflineMutations({
			organizationId: "org-alpha",
		});
		assert.strictEqual(pending.length, 5, "All 5 mutations should be pending");
	});

	test("5. Status lifecycle: pending -> syncing -> synced / failed with retry counting", async () => {
		const mutation = await enqueueOfflineMutation({
			entityType: "DIARY_043_DRAFT",
			entityId: "visit-lifecycle-1",
			payload: { test: true },
		});

		// 1. Mark syncing
		await updateOfflineMutationStatus(mutation.mutationId, "syncing");
		let fetched = await getOfflineMutationById(mutation.mutationId);
		assert.strictEqual(fetched?.status, "syncing");

		// 2. Mark failed
		await updateOfflineMutationStatus(
			mutation.mutationId,
			"failed",
			"503 Service Unavailable",
		);
		fetched = await getOfflineMutationById(mutation.mutationId);
		assert.strictEqual(fetched?.status, "failed");
		assert.strictEqual(fetched?.retryCount, 1);
		assert.strictEqual(fetched?.lastError, "503 Service Unavailable");

		// 3. Mark synced
		await updateOfflineMutationStatus(mutation.mutationId, "synced");
		fetched = await getOfflineMutationById(mutation.mutationId);
		assert.strictEqual(fetched?.status, "synced");
		assert.strictEqual(fetched?.lastError, undefined);

		// 4. Clear synced
		const clearedCount = await clearSyncedOfflineMutations();
		assert.strictEqual(clearedCount, 1);

		fetched = await getOfflineMutationById(mutation.mutationId);
		assert.strictEqual(fetched, null, "Synced mutation should be deleted");
	});

	test("6. Draft Persistence & Recovery: saves, loads, and preserves clinical drafts on 100%", async () => {
		const draftKey = "dente_diary_draft_visit-999";
		const diaryData = {
			anamnesis: "Боли в области 1.1 после травмы",
			statusLocalis: "Скол эмали и дентина без вскрытия пульпы",
			diagnosisIcd10: "S02.5",
			diagnosisTooth: "11",
			treatmentDescription: "Прямая композитная реставрация",
		};

		// Save draft
		const saved = await saveOfflineDraft(
			draftKey,
			"DIARY_043_DRAFT",
			"visit-999",
			diaryData,
			"org-1",
		);
		assert.strictEqual(saved.draftKey, draftKey);
		assert.deepEqual(saved.data, diaryData);

		// Load draft (simulating page reload)
		const restored = await loadOfflineDraft<typeof diaryData>(draftKey);
		assert.ok(restored, "Draft must be loaded successfully");
		assert.deepEqual(
			restored.data,
			diaryData,
			"Restored draft must match saved data 100%",
		);

		// List drafts
		const list = await listOfflineDrafts({ entityType: "DIARY_043_DRAFT" });
		assert.ok(list.some((d) => d.draftKey === draftKey));

		// Delete draft
		await deleteOfflineDraft(draftKey);
		const afterDelete = await loadOfflineDraft(draftKey);
		assert.strictEqual(afterDelete, null, "Deleted draft must not exist");
	});

	test("7. Metrics calculation: correctly tallies pending, syncing, failed, and drafts", async () => {
		await enqueueOfflineMutation({
			entityType: "DIARY_043_DRAFT",
			entityId: "v1",
			payload: {},
		});
		const m2 = await enqueueOfflineMutation({
			entityType: "ODONTOGRAM_STATUS",
			entityId: "v2",
			payload: {},
		});
		await updateOfflineMutationStatus(m2.mutationId, "failed", "Network timeout");

		await saveOfflineDraft(
			"draft-m1",
			"DOCUMENT_DRAFT",
			"doc-1",
			{ name: "Согласие" },
		);

		const metrics = await getOfflineQueueMetrics();
		assert.strictEqual(metrics.pendingCount, 1);
		assert.strictEqual(metrics.failedCount, 1);
		assert.strictEqual(metrics.totalDrafts, 1);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite: LocalStorage Fallback Resilience (When IndexedDB is blocked/unavailable)
// ─────────────────────────────────────────────────────────────────────────────

describe("Offline Queue LocalStorage Fallback (IndexedDB blocked / private browsing)", () => {
	const originalWindowDesc = Object.getOwnPropertyDescriptor(globalThis, "window");
	let localStorageMap = new Map<string, string>();

	beforeEach(() => {
		resetOfflineDbConnection();
		localStorageMap.clear();

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

		// Force IndexedDB to be absent
		Object.defineProperty(globalThis, "window", {
			value: {
				indexedDB: undefined,
				localStorage: mockLocalStorage,
			},
			configurable: true,
			writable: true,
		});
	});

	afterEach(() => {
		resetOfflineDbConnection();
		if (originalWindowDesc) {
			Object.defineProperty(globalThis, "window", originalWindowDesc);
		} else {
			delete (globalThis as any).window;
		}
	});

	test("1. Fallback enqueue and retrieval works seamlessly via localStorage", async () => {
		const mutation = await enqueueOfflineMutation({
			entityType: "CASH_RECEIPT_DRAFT",
			entityId: "rec-fallback-1",
			payload: { amount: 5000 },
		});

		assert.ok(mutation.mutationId);
		assert.strictEqual(mutation.entityType, "CASH_RECEIPT_DRAFT");

		const pending = await getPendingOfflineMutations();
		assert.strictEqual(pending.length, 1);
		assert.strictEqual(pending[0]?.entityId, "rec-fallback-1");

		// Status update in localStorage
		await updateOfflineMutationStatus(mutation.mutationId, "synced");
		const cleared = await clearSyncedOfflineMutations();
		assert.strictEqual(cleared, 1);

		const remaining = await getPendingOfflineMutations();
		assert.strictEqual(remaining.length, 0);
	});

	test("2. Fallback draft save and load works seamlessly via localStorage", async () => {
		const draftKey = "fallback_draft_101";
		const data = { notes: "Локальный черновик без IndexedDB" };

		await saveOfflineDraft(draftKey, "DOCUMENT_DRAFT", "doc-101", data);

		const loaded = await loadOfflineDraft<typeof data>(draftKey);
		assert.ok(loaded);
		assert.deepEqual(loaded.data, data);

		await deleteOfflineDraft(draftKey);
		const afterDelete = await loadOfflineDraft(draftKey);
		assert.strictEqual(afterDelete, null);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite: Network Connectivity & Health-Check RTT Monitor
// ─────────────────────────────────────────────────────────────────────────────

describe("Network Connectivity & RTT Monitor", () => {
	const originalWindowDesc = Object.getOwnPropertyDescriptor(globalThis, "window");
	const originalNavigatorDesc = Object.getOwnPropertyDescriptor(globalThis, "navigator");
	const originalFetchDesc = Object.getOwnPropertyDescriptor(globalThis, "fetch");
	let localStorageMap = new Map<string, string>();
	let mockDbHolder: ReturnType<typeof setupMockIndexedDb>;

	beforeEach(() => {
		resetOfflineDbConnection();
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
		if (originalWindowDesc) Object.defineProperty(globalThis, "window", originalWindowDesc);
		else delete (globalThis as any).window;

		if (originalNavigatorDesc) Object.defineProperty(globalThis, "navigator", originalNavigatorDesc);
		else delete (globalThis as any).navigator;

		if (originalFetchDesc) Object.defineProperty(globalThis, "fetch", originalFetchDesc);
		else delete (globalThis as any).fetch;
	});

	test("1. isLocalOrLanHostname: classifies LAN and local addresses correctly", () => {
		// Local / LAN hosts
		assert.strictEqual(isLocalOrLanHostname("localhost"), true);
		assert.strictEqual(isLocalOrLanHostname("127.0.0.1"), true);
		assert.strictEqual(isLocalOrLanHostname("::1"), true);
		assert.strictEqual(isLocalOrLanHostname("192.168.1.50"), true);
		assert.strictEqual(isLocalOrLanHostname("10.10.0.12"), true);
		assert.strictEqual(isLocalOrLanHostname("172.20.1.1"), true);
		assert.strictEqual(isLocalOrLanHostname("clinic.local"), true);
		assert.strictEqual(isLocalOrLanHostname("server.lan"), true);

		// Public Cloud domains
		assert.strictEqual(isLocalOrLanHostname("crm.dente.ru"), false);
		assert.strictEqual(isLocalOrLanHostname("api.cloud-clinic.ru"), false);
		assert.strictEqual(isLocalOrLanHostname("8.8.8.8"), false);
		assert.strictEqual(isLocalOrLanHostname("172.15.0.1"), false); // Outside RFC1918 172.16-31
		assert.strictEqual(isLocalOrLanHostname("172.32.0.1"), false); // Outside RFC1918 172.16-31
	});

	test("2. determineNetworkConnectivity: detects Offline when navigator.onLine is false", async () => {
		Object.defineProperty(globalThis, "navigator", {
			value: { onLine: false },
			configurable: true,
			writable: true,
		});

		const state = await determineNetworkConnectivity();
		assert.strictEqual(state.mode, "offline");
		assert.strictEqual(state.isOnline, false);
		assert.strictEqual(state.label, NETWORK_STATE_LABELS.offline);
		assert.strictEqual(state.badgeClass, "offline");
	});

	test("3. determineNetworkConnectivity: classifies LAN vs Cloud with measured RTT", async () => {
		Object.defineProperty(globalThis, "navigator", {
			value: { onLine: true },
			configurable: true,
			writable: true,
		});

		Object.defineProperty(globalThis, "fetch", {
			value: async () => new Response(null, { status: 200 }),
			configurable: true,
			writable: true,
		});

		// A. Test LAN hostname
		window.location.hostname = "192.168.0.10";
		const lanState = await determineNetworkConnectivity();
		assert.strictEqual(lanState.mode, "lan_online");
		assert.strictEqual(lanState.isOnline, true);
		assert.strictEqual(lanState.isLan, true);
		assert.strictEqual(lanState.label, NETWORK_STATE_LABELS.lan_online);
		assert.strictEqual(lanState.badgeClass, "lan");
		assert.ok(typeof lanState.rttMs === "number" && lanState.rttMs >= 1);

		// B. Test Cloud domain
		window.location.hostname = "crm.dente.ru";
		const cloudState = await determineNetworkConnectivity();
		assert.strictEqual(cloudState.mode, "cloud_online");
		assert.strictEqual(cloudState.isOnline, true);
		assert.strictEqual(cloudState.isLan, false);
		assert.strictEqual(cloudState.label, NETWORK_STATE_LABELS.cloud_online);
		assert.strictEqual(cloudState.badgeClass, "cloud");
	});

	test("4. Zustand useOfflineStore: enqueues, syncs with executor, and tracks metrics", async () => {
		const store = useOfflineStore.getState();

		// Enqueue via store
		await store.enqueue({
			entityType: "DIARY_043_DRAFT",
			entityId: "visit-store-1",
			payload: { anamnesis: "Боль в зубе" },
		});

		await store.refreshQueue();
		const currentPending = useOfflineStore.getState().pendingMutations;
		assert.strictEqual(currentPending.length, 1);

		// Sync via store executor
		let executedMutationId = "";
		const syncResult = await useOfflineStore.getState().syncOutbox(async (mut) => {
			executedMutationId = mut.mutationId;
			return true;
		});

		assert.strictEqual(syncResult.syncedCount, 1);
		assert.strictEqual(syncResult.failedCount, 0);
		assert.strictEqual(executedMutationId, currentPending[0]?.mutationId);

		const remaining = useOfflineStore.getState().pendingMutations;
		assert.strictEqual(remaining.length, 0);
	});

	test("5. Idempotency Key and SHA-256 State Hash Preservation in Outbox", async () => {
		const payload = {
			anamnesis: "Кариес 3.5 контактный пункт",
			diagnosisIcd10: "K02.1",
			tooth: 35,
		};
		const expectedHash = computePayloadHash(payload);

		const mut1 = await enqueueOfflineMutation({
			entityType: "DIARY_043_DRAFT",
			entityId: "visit-idem-1",
			payload,
			organizationId: "org-idem",
		});

		assert.ok(mut1.mutationId);
		assert.strictEqual(mut1.payloadHash, expectedHash);
		assert.strictEqual(
			mut1.idempotencyKey,
			createCompositeIdempotencyKey(mut1.mutationId, payload),
		);

		// Explicit idempotencyKey
		const explicitKey = "custom-idempotency-key-uuid-999";
		const mut2 = await enqueueOfflineMutation({
			idempotencyKey: explicitKey,
			entityType: "ODONTOGRAM_STATUS",
			entityId: "patient-idem-2",
			payload: { tooth: 35, state: "carious" },
			organizationId: "org-idem",
		});

		assert.strictEqual(mut2.idempotencyKey, explicitKey);
		assert.strictEqual(
			mut2.payloadHash,
			computePayloadHash({ tooth: 35, state: "carious" }),
		);

		const fetched = await getOfflineMutationById(mut1.mutationId);
		assert.strictEqual(fetched?.idempotencyKey, mut1.idempotencyKey);
		assert.strictEqual(fetched?.payloadHash, expectedHash);
	});

	test("6. Automatic Queue Drain on isOnline and isLan Network Transitions", async () => {
		const payload1 = { note: "Офлайн запись 1" };
		const payload2 = { note: "Офлайн запись 2 (LAN)" };

		const m1 = await enqueueOfflineMutation({
			entityType: "DIARY_043_DRAFT",
			entityId: "visit-drain-1",
			payload: payload1,
			organizationId: "org-drain",
		});
		const m2 = await enqueueOfflineMutation({
			entityType: "DOCUMENT_DRAFT",
			entityId: "doc-drain-2",
			payload: payload2,
			organizationId: "org-drain",
		});

		const pendingBefore = await getPendingOfflineMutations({ organizationId: "org-drain" });
		assert.strictEqual(pendingBefore.length, 2);

		let receivedBatchCount = 0;
		const mockDrainFetch = async (
			_url: string | URL | Request,
			init?: RequestInit,
		): Promise<Response> => {
			const body = JSON.parse(String(init?.body || "{}"));
			receivedBatchCount = body.mutations?.length || 0;

			return new Response(
				JSON.stringify({
					syncBatchId: body.syncBatchId,
					processedCount: body.mutations.length,
					appliedCount: body.mutations.length,
					duplicateCount: 0,
					mergedCount: 0,
					rejectedCount: 0,
					results: body.mutations.map((m: any) => ({
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

		// Drain on network recovery
		const drainRes = await offlineSyncService.drainOutbox({
			organizationId: "org-drain",
			fetchImpl: mockDrainFetch as unknown as typeof fetch,
		});

		assert.strictEqual(drainRes.appliedCount, 2);
		assert.strictEqual(receivedBatchCount, 2);
		assert.strictEqual(drainRes.failedCount, 0);

		const pendingAfter = await getPendingOfflineMutations({ organizationId: "org-drain" });
		assert.strictEqual(pendingAfter.length, 0);
	});
});

