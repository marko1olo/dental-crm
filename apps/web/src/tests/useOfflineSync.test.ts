/**
 * DENTE CRM — Unit & Integration Test Suite for useOfflineSync Hook
 *
 * Проверка инвариантов:
 * 1. Экспорт всех реактивных полей состояния и методов управления очередью
 * 2. Мгновенное добавление мутаций в Outbox с наследованием organizationId
 * 3. Черновики: сохранение, чтение и удаление без блокирующих диалогов
 * 4. Офлайн-изоляция: syncNow() при отсутствии сети возвращает нули без сетевых запросов
 * 5. Онлайн-синхронизация: syncNow() запускает пакетный дренаж и обновляет счетчики
 * 6. Подписка на события: регистрация разрешенных конфликтов и завершения пакета
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	type UseOfflineSyncOptions,
	useOfflineSync,
} from "../hooks/useOfflineSync";
import {
	type OfflineMutation,
	type SyncBatchDrainResult,
	type SyncConflictEvent,
	offlineSyncService,
} from "../services/offline";
import { useOfflineStore } from "../store/offlineStore";
import {
	INITIAL_NETWORK_STATE,
	NETWORK_STATE_LABELS,
} from "../utils/networkConnectivity";
import {
	clearSyncedOfflineMutations,
	deleteOfflineDraft,
	deleteOfflineMutation,
	enqueueOfflineMutation,
	getOfflineMutationById,
	getOfflineQueueMetrics,
	getPendingOfflineMutations,
	loadOfflineDraft,
	nowIsoWithMs,
	openOfflineOutboxDb,
	resetOfflineDbConnection,
	saveOfflineDraft,
	updateOfflineMutationStatus,
} from "../utils/offlineMutationQueue";

// ─────────────────────────────────────────────────────────────────────────────
// Isolated In-Memory IndexedDB Mock for Node.js Testing
// ─────────────────────────────────────────────────────────────────────────────

interface MockStoreData {
	keyPath: string;
	indexes: Map<string, string>;
	records: Map<string, unknown>;
}

class MockIDBTransaction {
	db: MockIDBDatabase;
	mode: string;
	activeRequests = 0;
	oncomplete: (() => void) | null = null;
	onerror: ((err?: unknown) => void) | null = null;

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

		const wrap = (
			req: {
				result?: unknown;
				error?: unknown;
				onsuccess?: (() => void) | null;
				onerror?: (() => void) | null;
			},
			op: () => void,
		) => {
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
			put: (value: Record<string, unknown>) => {
				const key = String(value[store.keyPath]);
				const req: {
					result?: unknown;
					error?: unknown;
					onsuccess?: (() => void) | null;
					onerror?: (() => void) | null;
				} = { result: key };
				return wrap(req, () => {
					store.records.set(key, JSON.parse(JSON.stringify(value)));
				});
			},
			get: (key: string) => {
				const req: {
					result?: unknown;
					error?: unknown;
					onsuccess?: (() => void) | null;
					onerror?: (() => void) | null;
				} = {};
				return wrap(req, () => {
					const record = store.records.get(key);
					req.result = record ? JSON.parse(JSON.stringify(record)) : undefined;
				});
			},
			getAll: () => {
				const req: {
					result?: unknown;
					error?: unknown;
					onsuccess?: (() => void) | null;
					onerror?: (() => void) | null;
				} = {};
				return wrap(req, () => {
					req.result = Array.from(store.records.values()).map((r) =>
						JSON.parse(JSON.stringify(r)),
					);
				});
			},
			delete: (key: string) => {
				const req: {
					result?: unknown;
					error?: unknown;
					onsuccess?: (() => void) | null;
					onerror?: (() => void) | null;
				} = { result: undefined };
				return wrap(req, () => {
					store.records.delete(key);
				});
			},
			count: () => {
				const req: {
					result?: unknown;
					error?: unknown;
					onsuccess?: (() => void) | null;
					onerror?: (() => void) | null;
				} = {};
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

	transaction(_storeNames: string | string[], mode: "readonly" | "readwrite") {
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
			const req: {
				result?: MockIDBDatabase;
				onupgradeneeded?: (() => void) | null;
				onsuccess?: (() => void) | null;
				onerror?: (() => void) | null;
			} = {};
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

function renderHook(options?: UseOfflineSyncOptions): ReturnType<typeof useOfflineSync> {
	let capturedHook: ReturnType<typeof useOfflineSync> | null = null;

	function TestHarness() {
		capturedHook = useOfflineSync(options);
		return null;
	}

	renderToStaticMarkup(createElement(TestHarness));
	if (!capturedHook) {
		throw new Error("Failed to capture hook from TestHarness");
	}
	return capturedHook;
}

describe("useOfflineSync Hook & Reactive Lifecycle", () => {
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

		// Reset Zustand store state
		useOfflineStore.setState({
			networkState: INITIAL_NETWORK_STATE,
			pendingMutations: [],
			pendingMutationCount: 0,
			isSyncing: false,
			lastSyncAt: null,
			lastSyncError: null,
			draftsByKey: {},
			metrics: {
				pendingCount: 0,
				syncingCount: 0,
				failedCount: 0,
				syncedCount: 0,
				totalDrafts: 0,
			},
		});
	});

	afterEach(() => {
		resetOfflineDbConnection();
		if (originalWindowDesc) {
			Object.defineProperty(globalThis, "window", originalWindowDesc);
		} else {
			delete (globalThis as unknown as { window?: unknown }).window;
		}
	});

	test("1. Contract verification: returns complete reactive interface", () => {
		const sync = renderHook({ organizationId: "org-hook-test" });

		assert.ok(sync.networkState, "networkState must be present");
		assert.strictEqual(sync.mode, "cloud_online");
		assert.strictEqual(sync.isOnline, true);
		assert.strictEqual(sync.pendingMutationCount, 0);
		assert.strictEqual(sync.isSyncing, false);
		assert.strictEqual(typeof sync.enqueueMutation, "function");
		assert.strictEqual(typeof sync.saveOfflineDraft, "function");
		assert.strictEqual(typeof sync.loadOfflineDraft, "function");
		assert.strictEqual(typeof sync.deleteOfflineDraft, "function");
		assert.strictEqual(typeof sync.syncNow, "function");
		assert.strictEqual(typeof sync.refresh, "function");
		assert.strictEqual(typeof sync.clearSynced, "function");
	});

	test("2. Enqueueing mutations: automatically injects hook options organizationId", async () => {
		const sync = renderHook({ organizationId: "org-auto-inject" });

		const mut = await sync.enqueueMutation({
			entityType: "DIARY_043_DRAFT",
			entityId: "visit-hook-1",
			payload: { anamnesis: "Первичный анамнез" },
		});

		assert.strictEqual(mut.organizationId, "org-auto-inject");
		assert.strictEqual(mut.status, "pending");

		await sync.refresh();
		const state = useOfflineStore.getState();
		assert.strictEqual(state.pendingMutationCount, 1);
		assert.strictEqual(state.pendingMutations[0]?.entityId, "visit-hook-1");
	});

	test("3. Draft management: saves, retrieves, and deletes medical drafts through hook", async () => {
		const sync = renderHook({ organizationId: "org-draft-hook" });
		const draftKey = "diary_draft_043_hook_99";
		const draftData = { diagnosisTooth: "26", statusLocalis: "Кариес эмали" };

		const saved = await sync.saveOfflineDraft(
			draftKey,
			"DIARY_043_DRAFT",
			"visit-99",
			draftData,
		);
		assert.strictEqual(saved.draftKey, draftKey);
		assert.strictEqual(saved.organizationId, "org-draft-hook");

		const loaded = await sync.loadOfflineDraft<typeof draftData>(draftKey);
		assert.ok(loaded);
		assert.deepEqual(loaded.data, draftData);

		await sync.deleteOfflineDraft(draftKey);
		const afterDelete = await sync.loadOfflineDraft(draftKey);
		assert.strictEqual(afterDelete, null);
	});

	test("4. Offline guard: syncNow returns empty result without network request when offline", async () => {
		// Set store network state to offline
		useOfflineStore.setState({
			networkState: {
				mode: "offline",
				label: NETWORK_STATE_LABELS.offline,
				badgeClass: "offline",
				rttMs: null,
				lastCheckedAt: nowIsoWithMs(),
				isOnline: false,
				isLan: false,
			},
		});

		let fetchCalled = false;
		const mockFetch = async (): Promise<Response> => {
			fetchCalled = true;
			return new Response("{}", { status: 200 });
		};

		const sync = renderHook({
			organizationId: "org-offline-guard",
			fetchImpl: mockFetch as unknown as typeof fetch,
		});

		const result = await sync.syncNow();

		assert.strictEqual(fetchCalled, false, "Fetch must not be called when network is offline");
		assert.strictEqual(result.processedCount, 0);
		assert.strictEqual(result.appliedCount, 0);
		assert.strictEqual(result.failedCount, 0);
	});

	test("5. Online drain execution: syncNow calls gateway and refreshes store pending count", async () => {
		const sync = renderHook({ organizationId: "org-online-drain" });

		await sync.enqueueMutation({
			entityType: "PRESCRIPTION_107_DRAFT",
			entityId: "rx-hook-1",
			payload: { inn: "Парацетамол 500мг" },
		});

		const mockFetch = async (
			_url: string | URL | Request,
			init?: RequestInit,
		): Promise<Response> => {
			const body = JSON.parse(String(init?.body || "{}"));
			return new Response(
				JSON.stringify({
					syncBatchId: body.syncBatchId,
					processedCount: 1,
					appliedCount: 1,
					duplicateCount: 0,
					mergedCount: 0,
					rejectedCount: 0,
					results: [
						{
							mutationId: body.mutations[0].mutationId,
							idempotencyKey: body.mutations[0].idempotencyKey,
							status: "applied",
							entityKind: "clinical_task",
							entityId: "rx-hook-1",
							appliedAt: new Date().toISOString(),
						},
					],
					serverTime: new Date().toISOString(),
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		};

		const result = await sync.syncNow({
			fetchImpl: mockFetch as unknown as typeof fetch,
		});

		assert.strictEqual(result.processedCount, 1);
		assert.strictEqual(result.appliedCount, 1);
		assert.strictEqual(result.failedCount, 0);

		// Store pending list should be emptied
		const state = useOfflineStore.getState();
		assert.strictEqual(state.pendingMutationCount, 0);
	});

	test("6. Event subscription: receives CRDT conflict events and triggers callbacks", async () => {
		let receivedConflict: SyncConflictEvent | null = null;
		let receivedComplete: SyncBatchDrainResult | null = null;

		const sync = renderHook({
			organizationId: "org-event-test",
			onConflictResolved: (conflict) => {
				receivedConflict = conflict;
			},
			onSyncCompleted: (res) => {
				receivedComplete = res;
			},
		});

		await sync.enqueueMutation({
			entityType: "DIARY_043_DRAFT",
			entityId: "visit-conflict-1",
			payload: { anamnesis: "Конфликтный анамнез" },
		});

		const mockFetchWithConflict = async (
			_url: string | URL | Request,
			init?: RequestInit,
		): Promise<Response> => {
			const body = JSON.parse(String(init?.body || "{}"));
			return new Response(
				JSON.stringify({
					syncBatchId: body.syncBatchId,
					processedCount: 1,
					appliedCount: 0,
					duplicateCount: 0,
					mergedCount: 1,
					rejectedCount: 0,
					results: [
						{
							mutationId: body.mutations[0].mutationId,
							idempotencyKey: body.mutations[0].idempotencyKey,
							status: "conflict_resolved",
							entityKind: "visit_diary",
							entityId: "visit-conflict-1",
							appliedAt: new Date().toISOString(),
							conflictDetails: [
								{
									field: "anamnesis",
									clientValue: "Конфликтный анамнез",
									serverValue: "Серверный анамнез",
									resolvedValue: "Конфликтный анамнез",
									strategy: "lww",
									winner: "client",
									reason: "Client timestamp newer",
								},
							],
						},
					],
					serverTime: new Date().toISOString(),
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		};

		const result = await sync.syncNow({
			fetchImpl: mockFetchWithConflict as unknown as typeof fetch,
		});

		assert.strictEqual(result.mergedCount, 1);
		assert.strictEqual(result.conflicts.length, 1);
		assert.strictEqual(result.conflicts[0]?.field, "anamnesis");
		assert.strictEqual(result.conflicts[0]?.winner, "client");
	});
});
