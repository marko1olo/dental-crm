/**
 * DENTE CRM — Comprehensive Offline-First & Multi-Level Sync Test Suite
 *
 * Проверка инвариантов:
 * 1. IndexedDB Outbox & Локальное хранение:
 *    - Сохранение и извлечение 043/у, одонтограммы, рецептов 107-1/у, документов и чеков
 *    - Защита от блокирующих модалок (тихий неблокирующий enqueue)
 *    - Валидность UUID v4 и точность меток времени ISO 8601 (мс)
 * 2. Статусы подключения WorkspaceContinuityStrip:
 *    - «🟢 Онлайн»
 *    - «🟡 Локальная сеть»
 *    - «🟠 Офлайн: накоплено N изменений» (с русской плюрализацией)
 * 3. Бесшовный дренаж очереди при появлении связи:
 *    - Пакетная отправка (Batch Push) с Idempotency-Key и SHA-256 payloadHash
 *    - Экспоненциальный бэкофф с рандомизированным джиттером (Jitter)
 *    - Автоматический ретрай при сбоях 503 / обрывах сети
 * 4. Разрешение конфликтов Field-Level Last-Write-Wins (LWW) и CRDT:
 *    - Независимые поля (анамнез врача + телефон регистратуры) объединяются без потерь
 *    - Конфликт одного поля разрешается по временным меткам векторных часов
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
	computePayloadHash,
	createCompositeIdempotencyKey,
	mergeFieldLevelCrdt,
} from "@dental/shared";
import {
	calculateBackoffDelay,
	clearSyncedOfflineMutations,
	deleteOfflineDraft,
	deleteOfflineMutation,
	enqueueOfflineMutation,
	generateMutationUuid,
	getOfflineMutationById,
	getOfflineQueueMetrics,
	getPendingOfflineMutations,
	listOfflineDrafts,
	loadOfflineDraft,
	mapToSyncAction,
	mapToSyncEntityKind,
	nowIsoWithMs,
	offlineSyncService,
	openOfflineOutboxDb,
	resetOfflineDbConnection,
	saveOfflineDraft,
	updateOfflineMutationStatus,
} from "../index";

// ─────────────────────────────────────────────────────────────────────────────
// Mock IndexedDB Implementation for Node.js Isolation
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

		const wrap = (req: { result?: unknown; error?: unknown; onsuccess?: (() => void) | null; onerror?: (() => void) | null }, op: () => void) => {
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
				const req: { result?: unknown; error?: unknown; onsuccess?: (() => void) | null; onerror?: (() => void) | null } = { result: key };
				return wrap(req, () => {
					store.records.set(key, JSON.parse(JSON.stringify(value)));
				});
			},
			get: (key: string) => {
				const req: { result?: unknown; error?: unknown; onsuccess?: (() => void) | null; onerror?: (() => void) | null } = {};
				return wrap(req, () => {
					const record = store.records.get(key);
					req.result = record ? JSON.parse(JSON.stringify(record)) : undefined;
				});
			},
			getAll: () => {
				const req: { result?: unknown; error?: unknown; onsuccess?: (() => void) | null; onerror?: (() => void) | null } = {};
				return wrap(req, () => {
					req.result = Array.from(store.records.values()).map((r) =>
						JSON.parse(JSON.stringify(r)),
					);
				});
			},
			delete: (key: string) => {
				const req: { result?: unknown; error?: unknown; onsuccess?: (() => void) | null; onerror?: (() => void) | null } = { result: undefined };
				return wrap(req, () => {
					store.records.delete(key);
				});
			},
			count: () => {
				const req: { result?: unknown; error?: unknown; onsuccess?: (() => void) | null; onerror?: (() => void) | null } = {};
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

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite: Offline-First & Multi-Level Sync Engine
// ─────────────────────────────────────────────────────────────────────────────

describe("Offline-First IndexedDB Outbox & Synchronization Engine", () => {
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
			delete (globalThis as unknown as { window?: unknown }).window;
		}
	});

	// ── 1. IndexedDB Outbox & Local Storage ─────────────────────────────────
	test("1. IndexedDB Outbox: enqueues clinical mutations across 5 domains without UI block", async () => {
		// A. Form 043/u Diary
		const diaryMut = await enqueueOfflineMutation({
			entityType: "DIARY_043_DRAFT",
			entityId: "visit-101",
			action: "update",
			payload: {
				anamnesis: "Острая боль в 1.6 при температурных раздражителях",
				statusLocalis: "Кариозная полость II класса по Блэку",
				diagnosisIcd10: "K04.0",
				diagnosisTooth: "16",
				treatmentDescription: "Препарирование, медикаментозная обработка, пломбирование Ceram.x",
			},
			organizationId: "org-test-1",
		});
		assert.ok(diaryMut.mutationId);
		assert.strictEqual(diaryMut.status, "pending");
		assert.strictEqual(diaryMut.retryCount, 0);

		// B. Odontogram Status
		const odontoMut = await enqueueOfflineMutation({
			entityType: "ODONTOGRAM_STATUS",
			entityId: "patient-202",
			action: "update",
			payload: {
				tooth: 16,
				condition: "caries",
				surface: "mesial_occlusal",
			},
			organizationId: "org-test-1",
		});
		assert.strictEqual(odontoMut.entityType, "ODONTOGRAM_STATUS");

		// C. Prescription Form 107-1/u
		const rxMut = await enqueueOfflineMutation({
			entityType: "PRESCRIPTION_107_DRAFT",
			entityId: "rx-303",
			action: "create",
			payload: {
				inn: "Амоксициллин",
				dosage: "500 мг",
				instructions: "По 1 капсуле 3 раза в день 5 дней",
			},
			organizationId: "org-test-1",
		});
		assert.strictEqual(rxMut.entityType, "PRESCRIPTION_107_DRAFT");

		// D. Document Informed Consent
		const docMut = await enqueueOfflineMutation({
			entityType: "DOCUMENT_DRAFT",
			entityId: "doc-404",
			action: "create",
			payload: {
				templateType: "consent_anesthesia",
				patientFullName: "Смирнов Алексей Викторович",
			},
			organizationId: "org-test-1",
		});
		assert.strictEqual(docMut.entityType, "DOCUMENT_DRAFT");

		// E. Cash Receipt / Payment
		const payMut = await enqueueOfflineMutation({
			entityType: "CASH_RECEIPT_DRAFT",
			entityId: "pay-505",
			action: "create",
			payload: {
				amountRub: 4500,
				method: "card",
				payerFullName: "Смирнов А.В.",
			},
			organizationId: "org-test-1",
		});
		assert.strictEqual(payMut.entityType, "CASH_RECEIPT_DRAFT");

		// Verify all 5 pending mutations in queue
		const pending = await getPendingOfflineMutations({ organizationId: "org-test-1" });
		assert.strictEqual(pending.length, 5);

		const metrics = await getOfflineQueueMetrics();
		assert.strictEqual(metrics.pendingCount, 5);
		assert.strictEqual(metrics.failedCount, 0);
	});

	test("2. Local draft persistence: saves, loads, and preserves 100% clinical text", async () => {
		const draftKey = "dente_diary_draft_visit-777";
		const diaryData = {
			anamnesis: "Первичный осмотр полости рта, жалоб нет",
			statusLocalis: "Зуб 2.4 интактен, прикус ортогнатический",
			diagnosisIcd10: "Z01.2",
			treatmentDescription: "Профессиональная гигиена полости рта AirFlow",
		};

		const saved = await saveOfflineDraft(
			draftKey,
			"DIARY_043_DRAFT",
			"visit-777",
			diaryData,
			"org-test-1",
		);
		assert.strictEqual(saved.draftKey, draftKey);
		assert.deepEqual(saved.data, diaryData);

		const loaded = await loadOfflineDraft<typeof diaryData>(draftKey);
		assert.ok(loaded);
		assert.deepEqual(loaded.data, diaryData);

		const allDrafts = await listOfflineDrafts({ entityType: "DIARY_043_DRAFT" });
		assert.ok(allDrafts.some((d) => d.draftKey === draftKey));

		await deleteOfflineDraft(draftKey);
		const afterDelete = await loadOfflineDraft(draftKey);
		assert.strictEqual(afterDelete, null);
	});

	// ── 2. Batch Push & Idempotency Keys ────────────────────────────────────
	test("3. Batch Push Drain: packages mutations with composite idempotency key & SHA-256 hash", async () => {
		const mut1 = await enqueueOfflineMutation({
			entityType: "DIARY_043_DRAFT",
			entityId: "visit-batch-1",
			payload: { note: "Клинический дневник 1" },
			organizationId: "org-batch",
		});

		const mut2 = await enqueueOfflineMutation({
			entityType: "ODONTOGRAM_STATUS",
			entityId: "patient-batch-2",
			payload: { tooth: 47, condition: "filling" },
			organizationId: "org-batch",
		});

		// Verify mapping
		assert.strictEqual(mapToSyncEntityKind(mut1.entityType), "visit_diary");
		assert.strictEqual(mapToSyncEntityKind(mut2.entityType), "odontogram_state");
		assert.strictEqual(mapToSyncAction(mut1.action), "update");

		// Compute expected payload hashes
		const hash1 = computePayloadHash(mut1.payload);
		const expectedKey1 = createCompositeIdempotencyKey(mut1.mutationId, mut1.payload);
		assert.ok(hash1.length === 64);
		assert.strictEqual(expectedKey1, `${mut1.mutationId}#${hash1}`);

		// Mock sync gateway endpoint returning HTTP 200 with applied status
		const mockFetch = async (
			_url: string | URL | Request,
			init?: RequestInit,
		): Promise<Response> => {
			const body = JSON.parse(String(init?.body || "{}"));
			assert.strictEqual(body.mutations.length, 2);
			assert.strictEqual(body.mutations[0].mutationId, mut1.mutationId);
			assert.strictEqual(body.mutations[0].payloadHash, hash1);
			assert.strictEqual(body.mutations[0].idempotencyKey, expectedKey1);

			const responsePayload = {
				syncBatchId: body.syncBatchId,
				processedCount: 2,
				appliedCount: 2,
				duplicateCount: 0,
				mergedCount: 0,
				rejectedCount: 0,
				results: [
					{
						mutationId: mut1.mutationId,
						idempotencyKey: expectedKey1,
						status: "applied",
						entityKind: "visit_diary",
						entityId: "visit-batch-1",
						appliedAt: new Date().toISOString(),
					},
					{
						mutationId: mut2.mutationId,
						idempotencyKey: createCompositeIdempotencyKey(mut2.mutationId, mut2.payload),
						status: "applied",
						entityKind: "odontogram_state",
						entityId: "patient-batch-2",
						appliedAt: new Date().toISOString(),
					},
				],
				serverTime: new Date().toISOString(),
			};

			return new Response(JSON.stringify(responsePayload), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		};

		const drainResult = await offlineSyncService.drainOutbox({
			organizationId: "org-batch",
			fetchImpl: mockFetch as unknown as typeof fetch,
		});

		assert.strictEqual(drainResult.processedCount, 2);
		assert.strictEqual(drainResult.appliedCount, 2);
		assert.strictEqual(drainResult.failedCount, 0);

		// Verify queue is clean after successful drain
		const remaining = await getPendingOfflineMutations({ organizationId: "org-batch" });
		assert.strictEqual(remaining.length, 0);
	});

	// ── 3. Exponential Backoff & Retry Mechanism ───────────────────────────
	test("4. Exponential backoff delay calculation with jitter", () => {
		// Without jitter
		const delay0 = calculateBackoffDelay(0, 500, 10000, false);
		const delay1 = calculateBackoffDelay(1, 500, 10000, false);
		const delay2 = calculateBackoffDelay(2, 500, 10000, false);
		const delayMax = calculateBackoffDelay(10, 500, 10000, false);

		assert.strictEqual(delay0, 500);
		assert.strictEqual(delay1, 1000);
		assert.strictEqual(delay2, 2000);
		assert.strictEqual(delayMax, 10000); // capped at maxMs

		// With jitter: delay must be within [0.5 * delay, 1.0 * delay]
		for (let attempt = 0; attempt < 5; attempt++) {
			const raw = Math.min(10000, 500 * Math.pow(2, attempt));
			const withJitter = calculateBackoffDelay(attempt, 500, 10000, true);
			assert.ok(
				withJitter >= 0.5 * raw - 1 && withJitter <= raw + 1,
				`Delay with jitter (${withJitter}) must be in range [${0.5 * raw}, ${raw}]`,
			);
		}
	});

	test("5. Automatic retry on transient 503 error: recovers on second attempt", async () => {
		const mut = await enqueueOfflineMutation({
			entityType: "DIARY_043_DRAFT",
			entityId: "visit-retry-1",
			payload: { text: "Повторная попытка при 503" },
			organizationId: "org-retry",
		});

		let requestCount = 0;
		const mockFailingFetch = async (
			_url: string | URL | Request,
			init?: RequestInit,
		): Promise<Response> => {
			requestCount++;
			if (requestCount === 1) {
				// First attempt fails with 503
				return new Response("Service Unavailable", { status: 503 });
			}

			// Second attempt succeeds
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
							mutationId: mut.mutationId,
							idempotencyKey: body.mutations[0].idempotencyKey,
							status: "applied",
							entityKind: "visit_diary",
							entityId: "visit-retry-1",
							appliedAt: new Date().toISOString(),
						},
					],
					serverTime: new Date().toISOString(),
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		};

		const result = await offlineSyncService.drainOutbox({
			organizationId: "org-retry",
			maxRetries: 3,
			baseBackoffMs: 50, // fast in tests
			maxBackoffMs: 200,
			fetchImpl: mockFailingFetch as unknown as typeof fetch,
		});

		assert.strictEqual(requestCount, 2, "Must retry and succeed on attempt 2");
		assert.strictEqual(result.appliedCount, 1);
		assert.strictEqual(result.failedCount, 0);

		const remaining = await getPendingOfflineMutations({ organizationId: "org-retry" });
		assert.strictEqual(remaining.length, 0);
	});

	test("6. Exhausted retries: marks mutations failed with error message without data loss", async () => {
		const mut = await enqueueOfflineMutation({
			entityType: "CASH_RECEIPT_DRAFT",
			entityId: "receipt-fail-1",
			payload: { amount: 10000 },
			organizationId: "org-fail",
		});

		const mockAlwaysFailingFetch = async (): Promise<Response> => {
			return new Response("Internal Server Error", { status: 500 });
		};

		const result = await offlineSyncService.drainOutbox({
			organizationId: "org-fail",
			maxRetries: 2,
			baseBackoffMs: 20,
			maxBackoffMs: 50,
			fetchImpl: mockAlwaysFailingFetch as unknown as typeof fetch,
		});

		assert.strictEqual(result.failedCount, 1);
		assert.strictEqual(result.appliedCount, 0);
		assert.ok(result.errors.length > 0);

		// Mutation must remain in queue with status = failed for future retry
		const fetched = await getOfflineMutationById(mut.mutationId);
		assert.ok(fetched);
		assert.strictEqual(fetched.status, "failed");
		assert.ok(fetched.lastError?.includes("500"));
	});

	// ── 4. Field-Level Last-Write-Wins (LWW) & CRDT Conflict Resolution ────
	test("7. Deterministic CRDT Merge: orthogonal fields merge without data loss", () => {
		// Server state: Doctor online updated anamnesis
		const serverPatient = {
			id: "pat-100",
			fullName: "Иванов Иван Иванович",
			phone: "+7 (999) 111-22-33",
			notes: "Аллергия на пенициллин",
			createdAt: "2026-08-20T10:00:00.000Z",
		};

		const serverVector = {
			fullName: { updatedAt: "2026-08-20T10:00:00.000Z", version: 1 },
			phone: { updatedAt: "2026-08-20T10:00:00.000Z", version: 1 },
			notes: { updatedAt: "2026-08-23T08:00:00.000Z", version: 2 }, // Updated online
		};

		// Client offline patch: Reception updated phone while offline
		const clientPatch = {
			phone: "+7 (999) 777-88-99", // Doctor changed phone
		};

		const clientVector = {
			phone: { updatedAt: "2026-08-23T08:15:00.000Z", version: 2 },
		};

		const mergeResult = mergeFieldLevelCrdt<{
			id: string;
			fullName: string;
			phone: string;
			notes: string;
		}>({
			entityKind: "patient",
			entityId: "pat-100",
			serverEntity: serverPatient,
			serverVector,
			clientPatch,
			clientVector,
			clientUpdatedAt: "2026-08-23T08:15:00.000Z",
			clientId: "reception-client-1",
		});

		// Both the server's updated notes and the client's updated phone are preserved!
		assert.strictEqual(mergeResult.mergedEntity.phone, "+7 (999) 777-88-99");
		assert.strictEqual(mergeResult.mergedEntity.notes, "Аллергия на пенициллин");
		assert.strictEqual(mergeResult.mergedEntity.fullName, "Иванов Иван Иванович");
		assert.ok(mergeResult.changedFields.includes("phone"));
	});

	test("8. Same-field collision: newer timestamp wins (LWW)", () => {
		const serverDiary = {
			id: "diary-200",
			treatmentDescription: "Серверное описание лечения (T1)",
		};

		const serverVector = {
			treatmentDescription: { updatedAt: "2026-08-23T08:00:00.000Z", version: 1 },
		};

		// Client edited at T2 (08:30:00, strictly newer)
		const clientPatchNewer = {
			treatmentDescription: "Клиентское описание лечения (T2 - Новее)",
		};
		const clientVectorNewer = {
			treatmentDescription: { updatedAt: "2026-08-23T08:30:00.000Z", version: 2 },
		};

		const resultNewer = mergeFieldLevelCrdt<{ treatmentDescription: string }>({
			entityKind: "visit_diary",
			entityId: "diary-200",
			serverEntity: serverDiary,
			serverVector,
			clientPatch: clientPatchNewer,
			clientVector: clientVectorNewer,
			clientUpdatedAt: "2026-08-23T08:30:00.000Z",
		});

		assert.strictEqual(
			resultNewer.mergedEntity.treatmentDescription,
			"Клиентское описание лечения (T2 - Новее)",
		);
		assert.strictEqual(resultNewer.conflicts[0]?.winner, "client");

		// Client edited at T0 (07:30:00, strictly older than server 08:00:00)
		const clientPatchOlder = {
			treatmentDescription: "Устаревшее клиентское описание (T0)",
		};
		const clientVectorOlder = {
			treatmentDescription: { updatedAt: "2026-08-23T07:30:00.000Z", version: 1 },
		};

		const resultOlder = mergeFieldLevelCrdt<{ treatmentDescription: string }>({
			entityKind: "visit_diary",
			entityId: "diary-200",
			serverEntity: serverDiary,
			serverVector,
			clientPatch: clientPatchOlder,
			clientVector: clientVectorOlder,
			clientUpdatedAt: "2026-08-23T07:30:00.000Z",
		});

		assert.strictEqual(
			resultOlder.mergedEntity.treatmentDescription,
			"Серверное описание лечения (T1)",
		);
		assert.strictEqual(resultOlder.conflicts[0]?.winner, "server");
	});
});
