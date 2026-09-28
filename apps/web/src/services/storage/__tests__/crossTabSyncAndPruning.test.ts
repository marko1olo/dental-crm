/**
 * DENTE CRM — Cross-Tab Synchronization & Stale Snapshot Housekeeping Tests
 *
 * Verifies:
 * 1. Instantaneous cross-tab synchronization of visit statuses via BroadcastChannel and storage fallback.
 * 2. Self-echo suppression (sourceTabId prevents originating tab from handling own broadcast).
 * 3. Deduplication across dual transports (BroadcastChannel + localStorage storage event).
 * 4. Patient balance and clinical entity synchronization events.
 * 5. Housekeeping: Automated pruning of offline snapshots older than 30 days in IndexedDB & LocalStorage.
 * 6. Statutory catalog perpetual protection: catalog_804n, catalog_icd10, catalog_templates are NEVER pruned.
 * 7. Uncommitted clinical drafts are NEVER pruned regardless of age (Mandate 8n: Zero Keystroke Loss).
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
	broadcastClinicalEntityChange,
	broadcastCrossTabEvent,
	broadcastPatientBalanceChange,
	broadcastVisitStatusChange,
	getCrossTabInstanceId,
	getCrossTabSyncStatus,
	onAnyCrossTabEvent,
	onCrossTabClinicalEntityChange,
	onCrossTabPatientBalanceChange,
	onCrossTabVisitStatusChange,
	resetCrossTabSyncForTesting,
} from "../crossTabSync";
import {
	cacheClinicalRecord,
	clearAllClinicalCache,
	getCachedClinicalRecord,
	pruneStaleOfflineSnapshots,
} from "../clinicalCacheStorage";
import {
	deleteOfflineDraft,
	loadOfflineDraft,
	resetOfflineDbConnection,
	saveOfflineDraft,
	openOfflineOutboxDb,
	CLINICAL_CACHE_STORE_NAME,
	DRAFTS_STORE_NAME,
} from "../../offline/offlineStorage";

// ─────────────────────────────────────────────────────────────────────────────
// In-Memory Storage & IndexedDB Mock
// ─────────────────────────────────────────────────────────────────────────────

interface MockStoreData {
	keyPath: string;
	indexes: Map<string, string>;
	records: Map<string, unknown>;
}

class MockIDBRequest {
	result: unknown = null;
	error: Error | null = null;
	onsuccess: (() => void) | null = null;
	onerror: (() => void) | null = null;
}

class MockIDBObjectStore {
	constructor(
		private data: MockStoreData,
		private transaction: MockIDBTransaction,
	) {}

	get(key: string): MockIDBRequest {
		const req = new MockIDBRequest();
		queueMicrotask(() => {
			req.result = this.data.records.get(key) ?? null;
			req.onsuccess?.();
		});
		return req;
	}

	put(value: Record<string, unknown>): MockIDBRequest {
		const req = new MockIDBRequest();
		const key = String(value[this.data.keyPath]);
		this.data.records.set(key, JSON.parse(JSON.stringify(value)));
		queueMicrotask(() => {
			req.result = key;
			req.onsuccess?.();
		});
		return req;
	}

	delete(key: string): MockIDBRequest {
		const req = new MockIDBRequest();
		this.data.records.delete(key);
		queueMicrotask(() => {
			req.result = undefined;
			req.onsuccess?.();
		});
		return req;
	}

	getAll(): MockIDBRequest {
		const req = new MockIDBRequest();
		queueMicrotask(() => {
			req.result = Array.from(this.data.records.values()).map((v) =>
				JSON.parse(JSON.stringify(v)),
			);
			req.onsuccess?.();
		});
		return req;
	}

	createIndex(name: string, keyPath: string) {
		this.data.indexes.set(name, keyPath);
	}
}

class MockIDBTransaction {
	oncomplete: (() => void) | null = null;
	onerror: (() => void) | null = null;

	constructor(
		private db: MockIDBDatabase,
		private storeNames: string[],
		public mode: string,
	) {
		queueMicrotask(() => {
			this.oncomplete?.();
		});
	}

	objectStore(name: string): MockIDBObjectStore {
		const storeData = this.db.stores.get(name);
		if (!storeData) throw new Error(`Store not found: ${name}`);
		return new MockIDBObjectStore(storeData, this);
	}
}

class MockIDBDatabase {
	stores = new Map<string, MockStoreData>();
	onversionchange: (() => void) | null = null;
	onclose: (() => void) | null = null;

	get objectStoreNames(): { contains: (n: string) => boolean } {
		return {
			contains: (n: string) => this.stores.has(n),
		};
	}

	createObjectStore(
		name: string,
		options: { keyPath: string },
	): MockIDBObjectStore {
		const storeData: MockStoreData = {
			keyPath: options.keyPath,
			indexes: new Map(),
			records: new Map(),
		};
		this.stores.set(name, storeData);
		return new MockIDBObjectStore(
			storeData,
			new MockIDBTransaction(this, [name], "readwrite"),
		);
	}

	transaction(storeNames: string | string[], mode = "readonly"): MockIDBTransaction {
		const names = Array.isArray(storeNames) ? storeNames : [storeNames];
		return new MockIDBTransaction(this, names, mode);
	}

	close() {
		this.onclose?.();
	}
}

class MockIDBFactory {
	private databases = new Map<string, MockIDBDatabase>();

	open(name: string, version?: number): MockIDBRequest {
		const req = new MockIDBRequest();
		queueMicrotask(() => {
			let db = this.databases.get(name);
			const isNew = !db;
			if (!db) {
				db = new MockIDBDatabase();
				this.databases.set(name, db);
			}

			if (isNew && (req as any).onupgradeneeded) {
				(req as any).result = db;
				(req as any).onupgradeneeded({
					target: req,
					oldVersion: 0,
					newVersion: version ?? 1,
				});
			}

			req.result = db;
			req.onsuccess?.();
		});
		return req;
	}

	deleteDatabase(name: string): MockIDBRequest {
		const req = new MockIDBRequest();
		queueMicrotask(() => {
			this.databases.delete(name);
			req.onsuccess?.();
		});
		return req;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup & Teardown
// ─────────────────────────────────────────────────────────────────────────────

const localStorageMap = new Map<string, string>();
const mockLocalStorage: Storage = {
	get length() {
		return localStorageMap.size;
	},
	clear() {
		localStorageMap.clear();
	},
	getItem(key: string) {
		return localStorageMap.get(key) ?? null;
	},
	key(index: number) {
		return Array.from(localStorageMap.keys())[index] ?? null;
	},
	removeItem(key: string) {
		localStorageMap.delete(key);
	},
	setItem(key: string, value: string) {
		localStorageMap.set(key, String(value));
	},
};

let mockDb = new MockIDBDatabase();
const mockIndexedDb = {
	open: (_name: string, _version?: number) => {
		const req = new MockIDBRequest();
		queueMicrotask(() => {
			if (!mockDb.stores.has("clinical_cache")) {
				mockDb.createObjectStore("clinical_cache", { keyPath: "cacheKey" });
				mockDb.createObjectStore("drafts", { keyPath: "draftKey" });
				mockDb.createObjectStore("mutations", { keyPath: "mutationId" });
				mockDb.createObjectStore("schedules_cache", { keyPath: "scheduleKey" });
			}
			req.result = mockDb;
			req.onsuccess?.();
		});
		return req;
	},
};

const windowEventListeners = new Map<string, Set<(e: any) => void>>();
const mockWindow = {
	localStorage: mockLocalStorage,
	indexedDB: mockIndexedDb,
	addEventListener: (type: string, listener: (e: any) => void) => {
		if (!windowEventListeners.has(type)) {
			windowEventListeners.set(type, new Set());
		}
		windowEventListeners.get(type)!.add(listener);
	},
	removeEventListener: (type: string, listener: (e: any) => void) => {
		windowEventListeners.get(type)?.delete(listener);
	},
	dispatchEvent: (e: any) => {
		const listeners = windowEventListeners.get(e.type);
		if (listeners) {
			for (const l of listeners) {
				try {
					l(e);
				} catch {
					// ignore
				}
			}
		}
		return true;
	},
};

describe("DENTE CRM — Cross-Tab Synchronization & Stale Snapshot Housekeeping", () => {
	beforeEach(() => {
		mockDb = new MockIDBDatabase();
		mockDb.createObjectStore("clinical_cache", { keyPath: "cacheKey" });
		mockDb.createObjectStore("drafts", { keyPath: "draftKey" });
		mockDb.createObjectStore("mutations", { keyPath: "mutationId" });
		mockDb.createObjectStore("schedules_cache", { keyPath: "scheduleKey" });

		localStorageMap.clear();
		windowEventListeners.clear();
		(globalThis as any).window = mockWindow;
		(globalThis as any).localStorage = mockLocalStorage;
		(globalThis as any).indexedDB = mockIndexedDb;
		clearAllClinicalCache();
		resetOfflineDbConnection();
		resetCrossTabSyncForTesting();
	});

	afterEach(() => {
		clearAllClinicalCache();
		resetOfflineDbConnection();
		resetCrossTabSyncForTesting();
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 1. Cross-Tab Synchronization Tests
	// ─────────────────────────────────────────────────────────────────────────

	test("1. Cross-tab visit status change transmits between simulated tabs and suppresses echo", async () => {
		const currentTabId = getCrossTabInstanceId();
		assert.ok(currentTabId.startsWith("tab-"), "Instance ID must be assigned");

		const receivedEvents: any[] = [];
		const unsubscribe = onCrossTabVisitStatusChange((payload) => {
			receivedEvents.push(payload);
		});

		// 1. Broadcast event from current tab
		broadcastVisitStatusChange({
			visitId: "apt-101",
			status: "in_treatment",
			patientId: "pat-202",
			patientName: "Смирнова Елена",
			updatedAt: new Date().toISOString(),
		});

		// Give microtasks time to run
		await new Promise((r) => setTimeout(r, 10));

		// Self-echo suppression: originating tab must NOT receive its own broadcast
		assert.equal(
			receivedEvents.length,
			0,
			"Originating tab must filter out its own broadcast (self-echo suppression)",
		);

		// 2. Simulate broadcast arriving from another open tab
		const storageListeners = windowEventListeners.get("storage");
		assert.ok(storageListeners && storageListeners.size > 0, "Storage listener must be registered");

		const remoteEvent = {
			eventId: "remote-evt-1",
			type: "visit_status_changed",
			sourceTabId: "other-tab-999",
			timestamp: Date.now(),
			payload: {
				visitId: "apt-101",
				status: "in_treatment",
				patientId: "pat-202",
				patientName: "Смирнова Елена",
				updatedAt: new Date().toISOString(),
				sourceTabId: "other-tab-999",
			},
		};

		// Trigger storage event as if written by other tab
		for (const listener of storageListeners) {
			listener({
				key: "dente_crosstab_sync_event_v1",
				newValue: JSON.stringify(remoteEvent),
			});
		}

		assert.equal(receivedEvents.length, 1, "Remote event must be dispatched to listeners");
		assert.equal(receivedEvents[0].visitId, "apt-101");
		assert.equal(receivedEvents[0].status, "in_treatment");
		assert.equal(receivedEvents[0].patientName, "Смирнова Елена");

		// 3. Deduplication: Deliver the exact same event again (simulating dual transport)
		for (const listener of storageListeners) {
			listener({
				key: "dente_crosstab_sync_event_v1",
				newValue: JSON.stringify(remoteEvent),
			});
		}

		assert.equal(
			receivedEvents.length,
			1,
			"Duplicate event delivered via dual transports must be discarded by seenEventIds cache",
		);

		unsubscribe();
	});

	test("2. Patient balance update broadcasts across tabs with zero drift", async () => {
		const receivedBalances: any[] = [];
		const unsubscribe = onCrossTabPatientBalanceChange((payload) => {
			receivedBalances.push(payload);
		});

		const remoteEvent = {
			eventId: "remote-evt-balance-1",
			type: "patient_balance_changed",
			sourceTabId: "reception-tab-12",
			timestamp: Date.now(),
			payload: {
				patientId: "pat-404",
				patientName: "Кузнецов Дмитрий",
				balanceRub: 15000,
				deltaRub: 3500,
				updatedAt: new Date().toISOString(),
				sourceTabId: "reception-tab-12",
			},
		};

		const storageListeners = windowEventListeners.get("storage")!;
		for (const listener of storageListeners) {
			listener({
				key: "dente_crosstab_sync_event_v1",
				newValue: JSON.stringify(remoteEvent),
			});
		}

		assert.equal(receivedBalances.length, 1);
		assert.equal(receivedBalances[0].patientId, "pat-404");
		assert.equal(receivedBalances[0].deltaRub, 3500);
		assert.equal(receivedBalances[0].balanceRub, 15000);

		unsubscribe();
	});

	test("3. Clinical entity updates (visit draft autosave) dispatch correctly", async () => {
		const receivedEntities: any[] = [];
		const unsubscribe = onCrossTabClinicalEntityChange((payload) => {
			receivedEntities.push(payload);
		});

		const remoteEvent = {
			eventId: "remote-evt-draft-1",
			type: "clinical_entity_changed",
			sourceTabId: "doctor-room-3",
			timestamp: Date.now(),
			payload: {
				entityType: "visit_draft",
				entityId: "vis-777",
				patientId: "pat-123",
				updatedAt: new Date().toISOString(),
				sourceTabId: "doctor-room-3",
			},
		};

		const storageListeners = windowEventListeners.get("storage")!;
		for (const listener of storageListeners) {
			listener({
				key: "dente_crosstab_sync_event_v1",
				newValue: JSON.stringify(remoteEvent),
			});
		}

		assert.equal(receivedEntities.length, 1);
		assert.equal(receivedEntities[0].entityType, "visit_draft");
		assert.equal(receivedEntities[0].entityId, "vis-777");

		unsubscribe();
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2. Storage Pruning & Housekeeping Tests
	// ─────────────────────────────────────────────────────────────────────────

	test("4. Background pruning deletes records >30 days while strictly preserving fresh entries and statutory catalogs", async () => {
		const nowMs = Date.now();
		const dayMs = 24 * 60 * 60 * 1000;

		const db = await openOfflineOutboxDb();
		const tx = db.transaction([CLINICAL_CACHE_STORE_NAME], "readwrite");
		const store = tx.objectStore(CLINICAL_CACHE_STORE_NAME);

		// 1. Seed fresh record (5 days old)
		store.put({
			cacheKey: "patient:fresh-1",
			entityKind: "patient",
			entityId: "fresh-1",
			data: { name: "Свежий Пациент" },
			cachedAt: new Date(nowMs - 5 * dayMs).toISOString(),
			cachedAtMs: nowMs - 5 * dayMs,
		});

		// 2. Seed stale record (35 days old)
		store.put({
			cacheKey: "patient:stale-1",
			entityKind: "patient",
			entityId: "stale-1",
			data: { name: "Старый Пациент" },
			cachedAt: new Date(nowMs - 35 * dayMs).toISOString(),
			cachedAtMs: nowMs - 35 * dayMs,
		});

		// 3. Seed statutory reference catalog (45 days old)
		store.put({
			cacheKey: "catalog_804n:canonical",
			entityKind: "catalog_804n",
			entityId: "canonical",
			data: { nomenclature: ["A16.07.002", "A16.07.025"] },
			cachedAt: new Date(nowMs - 45 * dayMs).toISOString(),
			cachedAtMs: nowMs - 45 * dayMs,
		});

		await new Promise((r) => setTimeout(r, 10));

		// Verify all 3 exist before pruning
		const preFresh = await getCachedClinicalRecord("patient", "fresh-1");
		const preStale = await getCachedClinicalRecord("patient", "stale-1");
		const preCatalog = await getCachedClinicalRecord("catalog_804n", "canonical");
		assert.ok(preFresh, "Fresh record must exist before pruning");
		assert.ok(preStale, "Stale record must exist before pruning");
		assert.ok(preCatalog, "Statutory catalog must exist before pruning");

		// Run pruning with standard 30-day threshold
		const report = await pruneStaleOfflineSnapshots(30 * dayMs);

		assert.equal(report.prunedClinicalCacheCount, 1, "Exactly 1 stale record must be pruned");

		// Verify post-conditions
		const postFresh = await getCachedClinicalRecord("patient", "fresh-1");
		const postStale = await getCachedClinicalRecord("patient", "stale-1");
		const postCatalog = await getCachedClinicalRecord("catalog_804n", "canonical");

		assert.ok(postFresh, "Fresh record (< 30 days) MUST be preserved");
		assert.equal(postStale, null, "Stale record (> 30 days) MUST be deleted");
		assert.ok(
			postCatalog,
			"Statutory reference catalog (catalog_804n:canonical) MUST NEVER be pruned even if >30 days!",
		);
	});

	test("5. Mandate 8n Zero Keystroke Loss: Uncommitted dirty drafts are NEVER pruned even if >30 days", async () => {
		const nowMs = Date.now();
		const dayMs = 24 * 60 * 60 * 1000;

		const db = await openOfflineOutboxDb();
		const tx = db.transaction([DRAFTS_STORE_NAME], "readwrite");
		const store = tx.objectStore(DRAFTS_STORE_NAME);

		// Seed uncommitted draft older than 40 days
		store.put({
			draftKey: "vis-uncommitted-99",
			entityType: "visit_draft",
			entityId: "vis-uncommitted-99",
			data: { complaint: "Острая ноющая боль", anamnesis: "Болит 3 дня" },
			isSaved: false, // DIRTY DRAFT
			updatedAt: new Date(nowMs - 40 * dayMs).toISOString(),
			updatedAtMs: nowMs - 40 * dayMs,
		});

		// Seed committed draft older than 40 days
		store.put({
			draftKey: "vis-committed-88",
			entityType: "visit_draft",
			entityId: "vis-committed-88",
			data: { complaint: "Плановый осмотр" },
			isSaved: true, // ALREADY COMMITTED/SYNCED
			updatedAt: new Date(nowMs - 40 * dayMs).toISOString(),
			updatedAtMs: nowMs - 40 * dayMs,
		});

		await new Promise((r) => setTimeout(r, 10));

		const report = await pruneStaleOfflineSnapshots(30 * dayMs);

		assert.equal(
			report.prunedDraftsCount,
			1,
			"Only committed/synced stale drafts may be pruned, uncommitted dirty drafts are protected",
		);

		const uncommittedDraft = await loadOfflineDraft("vis-uncommitted-99");
		assert.ok(
			uncommittedDraft,
			"Uncommitted dirty draft MUST NEVER be deleted by housekeeping (Mandate 8n)",
		);
		assert.equal(
			(uncommittedDraft?.data as any)?.complaint,
			"Острая ноющая боль",
			"Doctor keystrokes must remain intact",
		);

		const committedDraft = await loadOfflineDraft("vis-committed-88");
		assert.equal(committedDraft, null, "Already committed stale draft is cleaned up");
	});
});
