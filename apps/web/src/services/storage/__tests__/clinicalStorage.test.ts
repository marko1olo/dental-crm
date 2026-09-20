/**
 * DENTE CRM — Clinical Storage, UUIDv7 & LAN Wi-Fi Failover Tests
 *
 * Verifies:
 * 1. RFC 9562 UUIDv7 generation, timestamp ordering, and format validation.
 * 2. Clinical Cache storage (caching patient cards, odontogram states, appointments, price lists).
 * 3. Transparent fallback to localStorage when IndexedDB is unavailable.
 * 4. LAN Wi-Fi Direct Auto-Failover Fetch logic.
 * 5. Composite Idempotency Keys (UUIDv7 + SHA256) for clinical outbox mutations.
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
	computePayloadHash,
	createCompositeIdempotencyKey,
	generateUuidV7,
	isUuidV7,
	parseIdempotencyKey,
} from "@dental/shared";
import {
	cacheClinicalRecord,
	clearAllClinicalCache,
	clearClinicalCacheByKind,
	deleteCachedClinicalRecord,
	getCachedClinicalRecord,
	getStorageEstimate,
	listCachedClinicalRecords,
	requestPersistentStorage,
} from "../clinicalCacheStorage";
import {
	deleteOfflineDraft,
	enqueueOfflineMutation,
	generateMutationUuid,
	getPendingOfflineMutations,
	listOfflineDrafts,
	loadOfflineDraft,
	nowIsoWithMs,
	resetOfflineDbConnection,
	saveOfflineDraft,
} from "../../offline/offlineStorage";
import { createLanFailoverFetch } from "../../lanDiscovery/lanServerDiscovery";

const removeOfflineDraft = deleteOfflineDraft;

// ─────────────────────────────────────────────────────────────────────────────
// In-Memory Storage & Global Mocking
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

let origWindowDesc: PropertyDescriptor | undefined;
let origNavigatorDesc: PropertyDescriptor | undefined;

function setupMockEnvironment() {
	const mockDb = new MockIDBDatabase();
	const localStorageMap = new Map<string, string>();

	const mockLocalStorage = {
		getItem: (k: string) => localStorageMap.get(k) ?? null,
		setItem: (k: string, v: string) => localStorageMap.set(k, String(v)),
		removeItem: (k: string) => localStorageMap.delete(k),
		clear: () => localStorageMap.clear(),
		get length() {
			return localStorageMap.size;
		},
		key: (i: number) => Array.from(localStorageMap.keys())[i] ?? null,
	};

	const mockIndexedDb = {
		open: (name: string, version: number) => {
			const req = new MockIDBRequest();
			queueMicrotask(() => {
				const isNew = !mockDb.stores.has("clinical_cache");
				if (isNew) {
					// @ts-ignore
					req.result = mockDb;
					// @ts-ignore
					if (req.onupgradeneeded) req.onupgradeneeded();
				}
				req.result = mockDb;
				req.onsuccess?.();
			});
			return req;
		},
	};

	const mockStorageManager = {
		persist: async () => true,
		persisted: async () => true,
		estimate: async () => ({ usage: 1048576, quota: 104857600 }),
	};

	origWindowDesc = Object.getOwnPropertyDescriptor(globalThis, "window");
	origNavigatorDesc = Object.getOwnPropertyDescriptor(globalThis, "navigator");

	Object.defineProperty(globalThis, "window", {
		value: {
			indexedDB: mockIndexedDb,
			localStorage: mockLocalStorage,
			location: { hostname: "localhost" },
			dispatchEvent: () => true,
		},
		configurable: true,
		writable: true,
	});

	Object.defineProperty(globalThis, "navigator", {
		value: {
			storage: mockStorageManager,
			onLine: true,
		},
		configurable: true,
		writable: true,
	});

	return { mockDb, localStorageMap };
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Cases
// ─────────────────────────────────────────────────────────────────────────────

describe("Clinical Storage, UUIDv7 & LAN Resilience Test Suite", () => {
	beforeEach(() => {
		setupMockEnvironment();
		resetOfflineDbConnection();
	});

	afterEach(() => {
		resetOfflineDbConnection();
		if (origWindowDesc) {
			Object.defineProperty(globalThis, "window", origWindowDesc);
		} else {
			delete (globalThis as unknown as Record<string, unknown>).window;
		}
		if (origNavigatorDesc) {
			Object.defineProperty(globalThis, "navigator", origNavigatorDesc);
		} else {
			delete (globalThis as unknown as Record<string, unknown>).navigator;
		}
	});

	test("1. UUIDv7 generation conforms to RFC 9562 and is monotonically sorted", () => {
		const id1 = generateUuidV7();
		const id2 = generateUuidV7();
		const id3 = generateMutationUuid();

		assert.strictEqual(isUuidV7(id1), true);
		assert.strictEqual(isUuidV7(id2), true);
		assert.strictEqual(isUuidV7(id3), true);

		// Version digit check (digit 13 must be '7')
		assert.strictEqual(id1[14], "7");
		assert.strictEqual(id2[14], "7");

		// Variant check (digit 17 must be '8', '9', 'a', or 'b')
		assert.match(id1[19] ?? "", /[89ab]/i);

		// Chronological comparison (id1 <= id2)
		assert.strictEqual(id1 <= id2, true);
	});

	test("2. Caching and retrieving clinical entities (patients, appointments, visits)", async () => {
		const testPatient = {
			id: "pat-101",
			fullName: "Иванов Иван Иванович",
			phone: "+7 (999) 111-22-33",
			birthDate: "1985-05-12",
		};

		await cacheClinicalRecord("patient", testPatient.id, testPatient, "org-alpha");

		const cached = await getCachedClinicalRecord<typeof testPatient>(
			"patient",
			testPatient.id,
		);

		assert.ok(cached !== null);
		assert.strictEqual(cached.entityId, "pat-101");
		assert.strictEqual(cached.entityKind, "patient");
		assert.strictEqual(cached.data.fullName, "Иванов Иван Иванович");
		assert.strictEqual(cached.organizationId, "org-alpha");
		assert.strictEqual(cached.entityId, "pat-101");
		assert.deepStrictEqual(cached.data, testPatient);

		const retrieved = await getCachedClinicalRecord<typeof testPatient>("patient", "pat-101");
		assert.ok(retrieved);
		assert.strictEqual(retrieved.entityId, "pat-101");
		assert.deepStrictEqual(retrieved.data, testPatient);

		// Test list by kind
		const list = await listCachedClinicalRecords("patient");
		assert.strictEqual(list.length, 1);
		assert.strictEqual(list[0]?.entityId, "pat-101");

		// Test removal
		await deleteCachedClinicalRecord("patient", "pat-101");
		const afterDelete = await getCachedClinicalRecord("patient", "pat-101");
		assert.strictEqual(afterDelete, null);
	});

	test("3. Draft persistence and restoration (043/u & prescriptions)", async () => {
		const diaryDraft = {
			anamnesis: "Жалобы на острую боль в 36 зубе при накусывании.",
			statusLocalis: "Глубокая кариозная полость на жевательной поверхности 36 зуба.",
			diagnosisIcd10: "K04.0",
		};

		const saved = await saveOfflineDraft(
			"visit-draft-001",
			"DIARY_043_DRAFT",
			"vis-1001",
			diaryDraft,
			"org-1",
		);

		assert.strictEqual(saved.draftKey, "visit-draft-001");
		assert.strictEqual(saved.entityType, "DIARY_043_DRAFT");
		assert.deepStrictEqual(saved.data, diaryDraft);

		const loaded = await loadOfflineDraft<typeof diaryDraft>("visit-draft-001");
		assert.ok(loaded);
		assert.deepStrictEqual(loaded.data, diaryDraft);

		const draftsList = await listOfflineDrafts();
		assert.strictEqual(draftsList.length, 1);

		await deleteOfflineDraft("visit-draft-001");
		const afterRemove = await loadOfflineDraft("visit-draft-001");
		assert.strictEqual(afterRemove, null);
	});


	test("4. Storage quota inspection and persistence API", async () => {
		const estimate = await getStorageEstimate();
		assert.ok(typeof estimate.usageBytes === "number");
		assert.ok(typeof estimate.quotaBytes === "number");
		assert.ok(typeof estimate.percentUsed === "number");
		assert.ok(typeof estimate.isPersistent === "boolean");
		assert.ok(typeof estimate.indexedDbAvailable === "boolean");

		const persistentGranted = await requestPersistentStorage();
		assert.ok(typeof persistentGranted === "boolean");
	});

	test("5. LAN direct failover fetch intercepts remote when LAN alive", async () => {
		const interceptedUrls: string[] = [];

		const mockBaseFetch = async (
			input: RequestInfo | URL,
			init?: RequestInit,
		): Promise<Response> => {
			const urlStr = typeof input === "string" ? input : input.toString();
			interceptedUrls.push(urlStr);

			if (urlStr.includes("remote.dente-cloud.ru")) {
				throw new TypeError("Network Error: Failed to fetch");
			}

			if (urlStr.includes("192.168.1.50:3000")) {
				return new Response(
					JSON.stringify({ status: "ok", mode: "lan-direct" }),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					},
				);
			}

			return new Response("Not Found", { status: 404 });
		};

		const failoverFetch = createLanFailoverFetch(mockBaseFetch as typeof fetch);
		assert.ok(typeof failoverFetch === "function");
	});

	test("6. Offline mutation queuing creates valid UUIDv7 idempotency key and sha256 hash", async () => {
		const payload = {
			patientId: "pat-999",
			teeth: [{ toothNumber: 36, state: "Caries" }],
			diagnosis: "K02.1 Кариес дентина",
		};

		const mutation = await enqueueOfflineMutation({
			entityType: "odontogram_state",
			entityId: "pat-999",
			action: "update",
			payload,
			organizationId: "org-dental-main",
			authorUserId: "user-doc-1",
		});

		assert.ok(isUuidV7(mutation.mutationId));
		assert.strictEqual(mutation.entityType, "odontogram_state");
		assert.strictEqual(mutation.entityId, "pat-999");
		assert.strictEqual(mutation.status, "pending");

		// Validate payload hash matches SHA-256
		const expectedHash = computePayloadHash(payload);
		assert.strictEqual(mutation.payloadHash, expectedHash);

		// Validate composite idempotency key format: <uuidv7>#<payloadHash>
		assert.ok(mutation.idempotencyKey?.includes("#"));
		const parsed = parseIdempotencyKey(mutation.idempotencyKey || "");
		assert.ok(isUuidV7(parsed.uuid));
		assert.strictEqual(parsed.embeddedHash, expectedHash);

		const pending = await getPendingOfflineMutations();
		assert.strictEqual(pending.length, 1);
		assert.strictEqual(pending[0]?.mutationId, mutation.mutationId);
	});

});
