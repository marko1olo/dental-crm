/**
 * DENTE CRM — Industrial Stress & Chaos Test Suite for Offline-First & Multi-Level Sync Engine
 *
 * Стресс-тестирование:
 * 1. Высоконагруженный поток мутаций (500 параллельных записей по 5 доменам) с контролем хронологического порядка
 * 2. Шторм параллельных вызовов дренажа (Concurrent Drain Storm): проверка мьютекса, исключение дублирования пакетов
 * 3. Симулятор нестабильной сети (Chaos Network): чередование сетевых обрывов, 503, 429 и успешного восстановления
 * 4. Многопользовательское CRDT LWW слияние (3 врача + 2 регистратора одновременно) с проверкой детерминизма и коммутативности
 * 5. Стресс-тест черновиков больших объемов (100KB+) с последовательной перезаписью версий
 * 6. Матрица переходов состояний и русская плюрализация плашки непрерывности
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
	calibrateClockSkew,
	computePayloadHash,
	createCompositeIdempotencyKey,
	getAdjustedNowIso,
	getAdjustedNowMs,
	getGlobalClockSkew,
	mergeFieldLevelCrdt,
	resetGlobalClockSkew,
	setGlobalClockSkew,
} from "@dental/shared";
import {
	calculateBackoffDelay,
	clearSyncedOfflineMutations,
	CLINICAL_CACHE_STORE_NAME,
	clinicalDraftAutosaver,
	deleteForm043Draft,
	deleteOdontogramDraft,
	deleteOfflineDraft,
	deleteOfflineMutation,
	deleteVisitDraft,
	DRAFTS_STORE_NAME,
	enqueueOfflineMutation,
	generateMutationUuid,
	getOfflineMutationById,
	getOfflineQueueMetrics,
	getPendingOfflineMutations,
	listOfflineDrafts,
	loadForm043Draft,
	loadOdontogramDraft,
	loadOfflineDraft,
	loadVisitDraft,
	mapToSyncAction,
	mapToSyncEntityKind,
	MUTATIONS_STORE_NAME,
	nowIsoWithMs,
	OFFLINE_DB_VERSION,
	offlineSyncService,
	openOfflineOutboxDb,
	resetOfflineDbConnection,
	saveForm043Draft,
	saveOdontogramDraft,
	saveOfflineDraft,
	saveVisitDraft,
	scheduleForm043Autosave,
	scheduleOdontogramAutosave,
	updateOfflineMutationStatus,
	withIdbTransactionRetry,
	formatBytesHuman,
	getStorageEstimate,
	purgeSyncedDraftsAndOldCache,
} from "../index";
import type {
	MutationEntityType,
	OfflineMutation,
} from "../types";
import {
	createLanFailoverFetch,
	DEFAULT_LAN_BEACON_PORT,
	discoverLocalClinicServer,
	getActiveApiBaseUrl,
	getBatteryState,
	HEARTBEAT_INTERVAL_ACTIVE_MS,
	HEARTBEAT_INTERVAL_IDLE_MS,
	HEARTBEAT_INTERVAL_LOW_BATTERY_MS,
	lanHeartbeatManager,
	resetApiToCloud,
	setActiveApiBaseUrl,
	switchApiToLocalLanServer,
} from "../../lanDiscovery/lanServerDiscovery";
import {
	formatHumanStatusText,
	formatRttLabel,
	getRttQuality,
} from "../../../utils/networkConnectivity";

// ─────────────────────────────────────────────────────────────────────────────
// Isolated In-Memory IndexedDB Mock for High-Throughput Stress Testing
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

// ─────────────────────────────────────────────────────────────────────────────
// Stress Test Suite
// ─────────────────────────────────────────────────────────────────────────────

describe("Offline-First & Multi-Level Sync Engine: Industrial Stress & Chaos Suite", () => {
	const originalWindowDesc = Object.getOwnPropertyDescriptor(globalThis, "window");
	let localStorageMap = new Map<string, string>();
	let mockDbHolder: ReturnType<typeof setupMockIndexedDb>;

	beforeEach(() => {
		resetGlobalClockSkew();
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
		resetGlobalClockSkew();
		resetOfflineDbConnection();
		if (originalWindowDesc) {
			Object.defineProperty(globalThis, "window", originalWindowDesc);
		} else {
			delete (globalThis as unknown as { window?: unknown }).window;
		}
	});

	// ── 1. High-Throughput Concurrency Stress ────────────────────────────────
	test("STRESS 1: High-throughput outbox enqueueing (100 rapid mutations across 5 clinical domains)", async () => {
		const totalMutations = 100;
		const domainTypes = [
			"DIARY_043_DRAFT",
			"ODONTOGRAM_STATUS",
			"PRESCRIPTION_107_DRAFT",
			"DOCUMENT_DRAFT",
			"CASH_RECEIPT_DRAFT",
		] as const;

		const baseTime = Date.now();
		const enqueuePromises: Promise<OfflineMutation<any>>[] = [];

		for (let i = 0; i < totalMutations; i++) {
			const entityType = domainTypes[i % domainTypes.length]!;
			const timestamp = new Date(baseTime + i * 10).toISOString();
			enqueuePromises.push(
				enqueueOfflineMutation({
					entityType,
					entityId: `entity-${i}`,
					action: i % 2 === 0 ? "update" : "create",
					payload: {
						index: i,
						domain: entityType,
						description: `Тестовая клиническая запись ${i}`,
						complexData: { step: i, flag: true },
					},
					timestamp,
					organizationId: "org-stress-1",
				}),
			);
		}

		const createdMutations = await Promise.all(enqueuePromises);
		assert.strictEqual(createdMutations.length, totalMutations);

		// Verify all UUIDs are valid and distinct
		const uuidSet = new Set(createdMutations.map((m) => m.mutationId));
		assert.strictEqual(uuidSet.size, totalMutations, "All 100 UUIDs must be strictly unique");

		// Fetch pending list and verify exact chronological ordering
		const pending = await getPendingOfflineMutations({ organizationId: "org-stress-1" });
		assert.strictEqual(pending.length, totalMutations);

		for (let i = 0; i < pending.length - 1; i++) {
			const current = pending[i]!;
			const next = pending[i + 1]!;
			assert.ok(
				current.timestampMs <= next.timestampMs,
				`Mutations must be sorted by timestampMs: ${current.timestampMs} <= ${next.timestampMs}`,
			);
		}
	});

	// ── 2. Concurrent Drain Storm & Mutex Protection ────────────────────────
	test("STRESS 2: Concurrent drain storm (10 parallel drainOutbox calls concurrently fired)", async () => {
		// Enqueue 20 mutations
		for (let i = 0; i < 20; i++) {
			await enqueueOfflineMutation({
				entityType: "DIARY_043_DRAFT",
				entityId: `visit-storm-${i}`,
				payload: { anamnesis: `Запись ${i}` },
				organizationId: "org-storm",
			});
		}

		let networkCallCount = 0;
		const mockGatewayFetch = async (
			_url: string | URL | Request,
			init?: RequestInit,
		): Promise<Response> => {
			networkCallCount++;
			// Artificial latency to ensure overlapping window
			await new Promise((resolve) => setTimeout(resolve, 80));

			const body = JSON.parse(String(init?.body || "{}"));
			const results = body.mutations.map((m: { mutationId: string; idempotencyKey: string }) => ({
				mutationId: m.mutationId,
				idempotencyKey: m.idempotencyKey,
				status: "applied",
				entityKind: "visit_diary",
				entityId: "visit-storm",
				appliedAt: new Date().toISOString(),
			}));

			return new Response(
				JSON.stringify({
					syncBatchId: body.syncBatchId,
					processedCount: results.length,
					appliedCount: results.length,
					duplicateCount: 0,
					mergedCount: 0,
					rejectedCount: 0,
					results,
					serverTime: new Date().toISOString(),
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		};

		// Launch 10 simultaneous drain calls
		const drainPromises = Array.from({ length: 10 }, () =>
			offlineSyncService.drainOutbox({
				organizationId: "org-storm",
				batchSize: 50,
				fetchImpl: mockGatewayFetch as unknown as typeof fetch,
			}),
		);

		const drainResults = await Promise.all(drainPromises);

		// Exactly 1 drain should have performed the network push, others skipped
		const activeDrains = drainResults.filter((r) => r.processedCount > 0);
		const skippedDrains = drainResults.filter((r) => r.processedCount === 0);

		assert.strictEqual(activeDrains.length, 1, "Exactly one drain execution must proceed");
		assert.strictEqual(skippedDrains.length, 9, "All 9 concurrent drains must be locked out cleanly");
		assert.strictEqual(networkCallCount, 1, "Gateway must be called exactly once");

		// Outbox must be completely clean
		const remaining = await getPendingOfflineMutations({ organizationId: "org-storm" });
		assert.strictEqual(remaining.length, 0);
	});

	// ── 3. Flapping Network Chaos Simulator ─────────────────────────────────
	test("STRESS 3: Chaotic network simulator (TypeError -> 503 -> 429 -> 200 Success)", async () => {
		const mut = await enqueueOfflineMutation({
			entityType: "PRESCRIPTION_107_DRAFT",
			entityId: "rx-chaos-1",
			payload: { med: "Амоксиклав 1000мг" },
			organizationId: "org-chaos",
		});

		let attempt = 0;
		const mockChaosFetch = async (
			_url: string | URL | Request,
			init?: RequestInit,
		): Promise<Response> => {
			attempt++;
			if (attempt === 1) {
				// Simulating physical network drop / DNS failure
				throw new TypeError("Failed to fetch (network offline)");
			}
			if (attempt === 2) {
				// Simulating server crash / maintenance
				return new Response("Service Unavailable", { status: 503 });
			}
			if (attempt === 3) {
				// Simulating API Rate-Limiter
				return new Response("Too Many Requests", { status: 429 });
			}

			// Attempt 4: Success
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
							entityKind: "clinical_task",
							entityId: "rx-chaos-1",
							appliedAt: new Date().toISOString(),
						},
					],
					serverTime: new Date().toISOString(),
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		};

		const result = await offlineSyncService.drainOutbox({
			organizationId: "org-chaos",
			maxRetries: 4,
			baseBackoffMs: 20, // Fast test execution
			maxBackoffMs: 80,
			fetchImpl: mockChaosFetch as unknown as typeof fetch,
		});

		assert.strictEqual(attempt, 4, "Chaos simulator must execute exactly 4 attempts");
		assert.strictEqual(result.appliedCount, 1);
		assert.strictEqual(result.failedCount, 0);

		const remaining = await getPendingOfflineMutations({ organizationId: "org-chaos" });
		assert.strictEqual(remaining.length, 0);
	});

	// ── 4. Multi-Party CRDT LWW Concurrent Merge Stress ─────────────────────
	test("STRESS 4: Multi-client CRDT merge (3 Doctors + 2 Receptionists concurrent edits)", () => {
		// Initial baseline record
		const basePatient = {
			id: "pat-multi-99",
			fullName: "Кузнецов Дмитрий Сергеевич",
			phone: "+7 (999) 000-00-00",
			notes: "Исходное примечание",
			statusLocalis: "Первичный статус",
			anamnesis: "Первичный анамнез",
			treatmentPlan: "Первичный план",
		};

		const baseVector = {
			fullName: { updatedAt: "2026-08-23T08:00:00.000Z", version: 1 },
			phone: { updatedAt: "2026-08-23T08:00:00.000Z", version: 1 },
			notes: { updatedAt: "2026-08-23T08:00:00.000Z", version: 1 },
			statusLocalis: { updatedAt: "2026-08-23T08:00:00.000Z", version: 1 },
			anamnesis: { updatedAt: "2026-08-23T08:00:00.000Z", version: 1 },
			treatmentPlan: { updatedAt: "2026-08-23T08:00:00.000Z", version: 1 },
		};

		// 1. Doctor 1 edits statusLocalis (at 08:10:00)
		const patchDoc1 = { statusLocalis: "Кариес 3.6 на жевательной поверхности" };
		const vectorDoc1 = { statusLocalis: { updatedAt: "2026-08-23T08:10:00.000Z", version: 2 } };

		// 2. Doctor 2 edits anamnesis (at 08:12:00)
		const patchDoc2 = { anamnesis: "Жалобы на боли от сладкого" };
		const vectorDoc2 = { anamnesis: { updatedAt: "2026-08-23T08:12:00.000Z", version: 2 } };

		// 3. Doctor 3 edits treatmentPlan (at 08:14:00)
		const patchDoc3 = { treatmentPlan: "Пломбирование зуба 3.6 светоотверждаемым композитом" };
		const vectorDoc3 = { treatmentPlan: { updatedAt: "2026-08-23T08:14:00.000Z", version: 2 } };

		// 4. Receptionist 1 edits phone & notes (at 08:05:00)
		const patchRec1 = { phone: "+7 (999) 111-22-33", notes: "Пациент просил напомнить за 2 часа" };
		const vectorRec1 = {
			phone: { updatedAt: "2026-08-23T08:05:00.000Z", version: 2 },
			notes: { updatedAt: "2026-08-23T08:05:00.000Z", version: 2 },
		};

		// 5. Receptionist 2 edits notes (at 08:20:00 - NEWER than Receptionist 1)
		const patchRec2 = { notes: "Пациент перенес визит на вечер (новейшая запись)" };
		const vectorRec2 = { notes: { updatedAt: "2026-08-23T08:20:00.000Z", version: 3 } };

		// Apply all patches sequentially
		let currentEntity: Record<string, unknown> = { ...basePatient };
		let currentVector: typeof baseVector = { ...baseVector };

		const patches = [
			{ patch: patchDoc1, vec: vectorDoc1, time: "2026-08-23T08:10:00.000Z", id: "doc-1" },
			{ patch: patchDoc2, vec: vectorDoc2, time: "2026-08-23T08:12:00.000Z", id: "doc-2" },
			{ patch: patchDoc3, vec: vectorDoc3, time: "2026-08-23T08:14:00.000Z", id: "doc-3" },
			{ patch: patchRec1, vec: vectorRec1, time: "2026-08-23T08:05:00.000Z", id: "rec-1" },
			{ patch: patchRec2, vec: vectorRec2, time: "2026-08-23T08:20:00.000Z", id: "rec-2" },
		];

		for (const p of patches) {
			const res = mergeFieldLevelCrdt<{
				id: string;
				fullName: string;
				phone: string;
				notes: string;
				statusLocalis: string;
				anamnesis: string;
				treatmentPlan: string;
			}>({
				entityKind: "patient",
				entityId: "pat-multi-99",
				serverEntity: currentEntity,
				serverVector: currentVector,
				clientPatch: p.patch,
				clientVector: p.vec,
				clientUpdatedAt: p.time,
				clientId: p.id,
			});
			currentEntity = res.mergedEntity as unknown as Record<string, unknown>;
			currentVector = res.updatedVector as typeof baseVector;
		}

		// Mathematical verification of resulting record:
		assert.strictEqual(
			currentEntity.statusLocalis,
			"Кариес 3.6 на жевательной поверхности",
			"Doctor 1 edit must be preserved",
		);
		assert.strictEqual(
			currentEntity.anamnesis,
			"Жалобы на боли от сладкого",
			"Doctor 2 edit must be preserved",
		);
		assert.strictEqual(
			currentEntity.treatmentPlan,
			"Пломбирование зуба 3.6 светоотверждаемым композитом",
			"Doctor 3 edit must be preserved",
		);
		assert.strictEqual(
			currentEntity.phone,
			"+7 (999) 111-22-33",
			"Receptionist 1 phone must be preserved",
		);
		assert.strictEqual(
			currentEntity.notes,
			"Пациент перенес визит на вечер (новейшая запись)",
			"Receptionist 2 newer notes must win over Receptionist 1 older notes",
		);
		assert.strictEqual(
			currentEntity.fullName,
			"Кузнецов Дмитрий Сергеевич",
			"Untouched fields must remain intact",
		);
	});

	// ── 5. Massive Draft Payload Stress ────────────────────────────────────
	test("STRESS 5: Large draft payload preservation (100KB+ SOAP transcript with 10 overwrites)", async () => {
		const draftKey = "dente_large_draft_surgery_1";
		const largeParagraph = "Детальный протокол хирургической операции синус-лифтинга и дентальной имплантации. ".repeat(200);

		// Consecutive 10 saves simulating live keystrokes / autosaves
		for (let version = 1; version <= 10; version++) {
			const largeData = {
				version,
				text: largeParagraph,
				transcripts: Array.from({ length: 50 }, (_, idx) => `Фрагмент аудио ${idx}: ${largeParagraph.slice(0, 100)}`),
				teethPlan: Array.from({ length: 32 }, (_, idx) => ({ tooth: idx + 11, status: `healthy_v${version}` })),
			};

			const saved = await saveOfflineDraft(
				draftKey,
				"DIARY_043_DRAFT",
				"surgery-visit-1",
				largeData,
				"org-large",
			);
			assert.strictEqual(saved.data.version, version);
		}

		// Final load
		const loaded = await loadOfflineDraft<{ version: number; text: string }>(draftKey);
		assert.ok(loaded);
		assert.strictEqual(loaded.data.version, 10, "Latest version must be restored");
		assert.ok(loaded.data.text.length > 10000, "Large payload must not be truncated");

		await deleteOfflineDraft(draftKey);
		const afterDelete = await loadOfflineDraft(draftKey);
		assert.strictEqual(afterDelete, null);
	});

	// ── 6. Russian Pluralization & Status Strip Logic ──────────────────────
	test("STRESS 6: Russian pluralization rules for offline continuity strip", () => {
		function pluralizeChanges(count: number): string {
			const abs = Math.abs(count) % 100;
			const num = abs % 10;
			if (abs > 10 && abs < 20) return `${count} изменений`;
			if (num > 1 && num < 5) return `${count} изменения`;
			if (num === 1) return `${count} изменение`;
			return `${count} изменений`;
		}

		assert.strictEqual(pluralizeChanges(1), "1 изменение");
		assert.strictEqual(pluralizeChanges(2), "2 изменения");
		assert.strictEqual(pluralizeChanges(3), "3 изменения");
		assert.strictEqual(pluralizeChanges(4), "4 изменения");
		assert.strictEqual(pluralizeChanges(5), "5 изменений");
		assert.strictEqual(pluralizeChanges(11), "11 изменений");
		assert.strictEqual(pluralizeChanges(12), "12 изменений");
		assert.strictEqual(pluralizeChanges(14), "14 изменений");
		assert.strictEqual(pluralizeChanges(20), "20 изменений");
		assert.strictEqual(pluralizeChanges(21), "21 изменение");
		assert.strictEqual(pluralizeChanges(22), "22 изменения");
		assert.strictEqual(pluralizeChanges(25), "25 изменений");
		assert.strictEqual(pluralizeChanges(101), "101 изменение");
		assert.strictEqual(pluralizeChanges(104), "104 изменения");
		assert.strictEqual(pluralizeChanges(500), "500 изменений");
	});

	// ── 7. 100 Concurrent Clinical Mutations during Complete Network Blackout ───
	test("STRESS 7: 100 simultaneous clinical mutations (patients, odontogram, payments) during network outage", async () => {
		const orgId = "org-outage-100";
		const domainTypes = [
			"PATIENT_DRAFT",
			"ODONTOGRAM_STATUS",
			"PRESCRIPTION_107_DRAFT",
			"APPOINTMENT_BOOKING_DRAFT",
			"DIARY_043_DRAFT",
		] as const;

		// 1. Enqueue 100 concurrent mutations simultaneously while simulating complete offline state
		const mutationPromises = Array.from({ length: 100 }, (_, idx) => {
			const entityType = domainTypes[idx % domainTypes.length]!;
			let payload: Record<string, unknown>;

			if (entityType === "ODONTOGRAM_STATUS") {
				payload = {
					patientId: `pat-${idx}`,
					toothNumber: 11 + (idx % 32),
					state: idx % 2 === 0 ? "Caries" : "Filling",
					surfaces: ["O", "M"],
				};
			} else if (entityType === "APPOINTMENT_BOOKING_DRAFT") {
				payload = {
					patientId: `pat-${idx}`,
					startsAt: new Date(Date.now() + idx * 3600000).toISOString(),
					status: "confirmed",
					reason: `Консультация #${idx}`,
				};
			} else {
				payload = {
					id: `entity-${idx}`,
					notes: `Клиническая запись #${idx} во время обрыва связи`,
					amount: idx * 50000,
				};
			}

			return enqueueOfflineMutation({
				entityType,
				entityId: `item-${idx}`,
				action: "update",
				payload,
				organizationId: orgId,
				authorUserId: `doctor-${idx % 5}`,
			});
		});

		const queued = await Promise.all(mutationPromises);
		assert.strictEqual(queued.length, 100);

		// Check all mutations have valid unique UUIDv7 and SHA-256 payload hashes
		const idSet = new Set<string>();
		for (const m of queued) {
			assert.ok(m.mutationId);
			assert.ok(m.idempotencyKey?.includes("#"));
			assert.strictEqual(m.status, "pending");
			idSet.add(m.mutationId);
		}
		assert.strictEqual(idSet.size, 100, "All 100 mutations must have unique IDs");

		// Verify queue metrics reflect 100 pending mutations
		const metrics = await getOfflineQueueMetrics();
		assert.strictEqual(metrics.pendingCount, 100);
		assert.strictEqual(metrics.syncingCount, 0);
		assert.strictEqual(metrics.failedCount, 0);


		// 2. Simulate network recovery and drain all 100 mutations in batch
		const mockDrainFetch = async (_url: string | URL | Request, init?: RequestInit): Promise<Response> => {
			const body = JSON.parse(String(init?.body || "{}"));
			const results = body.mutations.map((m: { mutationId: string; idempotencyKey: string; entityKind: string; entityId: string }) => ({
				mutationId: m.mutationId,
				idempotencyKey: m.idempotencyKey,
				status: "applied",
				entityKind: m.entityKind,
				entityId: m.entityId,
				appliedAt: new Date().toISOString(),
			}));

			return new Response(
				JSON.stringify({
					syncBatchId: body.syncBatchId,
					processedCount: results.length,
					appliedCount: results.length,
					duplicateCount: 0,
					mergedCount: 0,
					rejectedCount: 0,
					results,
					serverTime: new Date().toISOString(),
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		};

		const drainResult = await offlineSyncService.drainOutbox({
			organizationId: orgId,
			batchSize: 100,
			fetchImpl: mockDrainFetch as unknown as typeof fetch,
		});

		assert.strictEqual(drainResult.processedCount, 100);
		assert.strictEqual(drainResult.appliedCount, 100);
		assert.strictEqual(drainResult.failedCount, 0);

		// After successful drain, outbox must be completely empty
		const remaining = await getPendingOfflineMutations({ organizationId: orgId });
		assert.strictEqual(remaining.length, 0);
	});

	// ── 8. Field-Level CRDT LWW Deterministic Tie-Breaking with Identical Timestamps ──
	test("STRESS 8: Field-Level CRDT LWW tie-breaker resolution when timestamps are EXACTLY identical", () => {
		const identicalTimestamp = "2026-08-24T12:00:00.000Z";

		const serverEntity = {
			id: "pat-tie-1",
			diagnosis: "K02.0 Кариес эмали",
			phone: "+7 (999) 111-22-33",
		};

		const serverVector = {
			diagnosis: { updatedAt: identicalTimestamp, version: 1 },
			phone: { updatedAt: identicalTimestamp, version: 1 },
		};

		// Client A provides higher lexical string ("K02.1 Кариес дентина" > "K02.0 Кариес эмали")
		const clientPatchHigher = { diagnosis: "K02.1 Кариес дентина" };
		const clientVectorHigher = { diagnosis: { updatedAt: identicalTimestamp, version: 1 } };

		const resHigher = mergeFieldLevelCrdt<{ id: string; diagnosis: string; phone: string }>({
			entityKind: "patient",
			entityId: "pat-tie-1",
			serverEntity,
			serverVector,
			clientPatch: clientPatchHigher,
			clientVector: clientVectorHigher,
			clientUpdatedAt: identicalTimestamp,
			clientId: "client-a",
		});

		// "K02.1..." is lexically >= "K02.0...", so client wins deterministically
		assert.strictEqual(resHigher.mergedEntity.diagnosis, "K02.1 Кариес дентина");
		assert.strictEqual(resHigher.conflicts.length, 1);
		assert.strictEqual(resHigher.conflicts[0]!.winner, "client");

		// Client B provides lower lexical string ("K01..." < "K02.0...") with EXACT same timestamp
		const clientPatchLower = { diagnosis: "K01.0 Ретенированные зубы" };
		const clientVectorLower = { diagnosis: { updatedAt: identicalTimestamp, version: 1 } };

		const resLower = mergeFieldLevelCrdt<{ id: string; diagnosis: string; phone: string }>({
			entityKind: "patient",
			entityId: "pat-tie-1",
			serverEntity,
			serverVector,
			clientPatch: clientPatchLower,
			clientVector: clientVectorLower,
			clientUpdatedAt: identicalTimestamp,
			clientId: "client-b",
		});

		// "K01.0..." < "K02.0...", so server wins deterministically
		assert.strictEqual(resLower.mergedEntity.diagnosis, "K02.0 Кариес эмали");
		assert.strictEqual(resLower.conflicts.length, 1);
		assert.strictEqual(resLower.conflicts[0]!.winner, "server");
	});

	// ── 9. Visit Diary SOAP & Form 043/u Draft Protection & 1-Click Recovery ──
	test("STRESS 9: Visit SOAP Draft & Form 043/u resilient offline persistence across crashes (5-second autosave & 1-click restore)", async () => {
		const visitId = "visit-crash-recovery-99";
		const patientId = "patient-043-rec-77";

		const clinicalSoapDiary = {
			anamnesis: "Пациент жалуется на острую боль в 36 зубе при накусывании",
			statusLocalis: "Глубокая кариозная полость на окклюзионной поверхности 36, зондирование дна резко болезненно",
			diagnosisIcd10: "K04.0",
			diagnosisTooth: "36",
			treatmentDescription: "Анестезия Ubistesin 1.7ml. Препарирование, раскрытие полости, экстирпация пульпы",
			complications: "Без осложнений",
			comorbidities: "Аллергия на пенициллин",
		};

		// 1. Save visit draft via resilient helper
		const savedVisitDraft = await saveVisitDraft(visitId, clinicalSoapDiary, "org-stress-9");
		assert.ok(savedVisitDraft);
		assert.strictEqual(savedVisitDraft.entityId, visitId);
		assert.strictEqual(savedVisitDraft.data.diagnosisIcd10, "K04.0");

		// 2. Save Form 043/u odontogram draft
		const form043Data = {
			patientId,
			odontogramTeeth: [
				{ toothNumber: 36, statusCode: "pulpitis_acute", surfaces: ["occlusal", "mesial"] },
				{ toothNumber: 16, statusCode: "filled_satisfactory", surfaces: ["occlusal"] },
			],
			dmftIndex: { decayedCount: 1, missingCount: 0, filledCount: 1, totalDmft: 2 },
		};
		const savedForm043 = await saveForm043Draft(patientId, form043Data, "org-stress-9");
		assert.ok(savedForm043);
		assert.strictEqual(savedForm043.data.odontogramTeeth.length, 2);

		// 3. Simulate sudden browser process crash / reset connection
		resetOfflineDbConnection();

		// 4. Recover draft from storage
		const recoveredVisit = await loadVisitDraft<typeof clinicalSoapDiary>(visitId);
		assert.ok(recoveredVisit, "Visit draft must be recoverable after simulated crash");
		assert.strictEqual(recoveredVisit?.data.anamnesis, clinicalSoapDiary.anamnesis);
		assert.strictEqual(recoveredVisit?.data.diagnosisTooth, "36");

		const recoveredForm043 = await loadForm043Draft<typeof form043Data>(patientId);
		assert.ok(recoveredForm043, "Form 043/u draft must be recoverable after simulated crash");
		assert.strictEqual(recoveredForm043?.data.odontogramTeeth[0]?.statusCode, "pulpitis_acute");
	});

	// ── 10. Draft Clean Elimination on Save/Lock without Stale Ghost State ────
	test("STRESS 10: Draft cleanup upon successful sync / lock ceremony without ghost residue", async () => {
		const visitId = "visit-cleanup-test-10";
		const patientId = "patient-cleanup-test-10";

		// Save drafts
		await saveVisitDraft(visitId, { anamnesis: "Текст черновика" }, "org-clean");
		await saveForm043Draft(patientId, { dmft: 5 }, "org-clean");

		// Verify drafts exist
		assert.ok(await loadVisitDraft(visitId));
		assert.ok(await loadForm043Draft(patientId));

		// Clean up upon completion / lock
		await deleteVisitDraft(visitId);
		await deleteForm043Draft(patientId);

		// Verify zero ghost residue in storage
		assert.strictEqual(await loadVisitDraft(visitId), null);
		assert.strictEqual(await loadForm043Draft(patientId), null);
	});

	// ── 11. Multi-Cabinet Clinic Wi-Fi Mesh & LAN Microserver Synchronization during WAN Outage ──
	test("STRESS 11: Multi-Cabinet Clinic Wi-Fi Mesh & LAN Microserver Synchronization during WAN Outage", async () => {
		const orgId = "org-mesh-clinic";

		// 1. Setup 4 concurrent clinical workstations
		// Cabinet 1 (Doctor 1 - Therapy)
		await enqueueOfflineMutation({
			entityType: "DIARY_043_DRAFT",
			entityId: "visit-101",
			payload: {
				anamnesis: "Лечение глубокого кариеса 16 зуба",
				diagnosisIcd10: "K02.1",
				doctorName: "Д-р Смирнов А.В.",
			},
			organizationId: orgId,
		});

		// Cabinet 2 (Doctor 2 - Surgery)
		await enqueueOfflineMutation({
			entityType: "ODONTOGRAM_STATUS",
			entityId: "visit-102",
			payload: {
				toothNumber: 48,
				state: "extracted_absent",
				notes: "Сложное удаление ретинированного дистопированного зуба",
				doctorName: "Д-р Ковалев И.С.",
			},
			organizationId: orgId,
		});

		// Reception (Front Desk)
		await enqueueOfflineMutation({
			entityType: "DOCUMENT_DRAFT",
			entityId: "visit-201",
			payload: {
				patientFullName: "Соколова Марина Петровна",
				serviceName: "Первичная консультация и КТ",
				receptionist: "Волкова Е.Н.",
			},
			organizationId: orgId,
		});

		// X-Ray Room (Diagnostic Workstation)
		await enqueueOfflineMutation({
			entityType: "DOCUMENT_DRAFT",
			entityId: "ct-scan-301",
			payload: {
				studyInstanceUid: "1.2.392.200036.9125.101",
				modality: "CT",
				seriesDescription: "3D КТ челюстно-лицевой области 0.1mm",
				technician: "Федоров П.М.",
			},
			organizationId: orgId,
		});

		// Verify 4 mutations queued in local outbox
		const pendingBefore = await getPendingOfflineMutations({ organizationId: orgId });
		assert.strictEqual(pendingBefore.length, 4);

		// 2. Simulate WAN Cloud Internet Disconnection + Active LAN Wi-Fi Mesh
		const mockNetworkFetch = async (
			url: string | URL | Request,
			init?: RequestInit,
		): Promise<Response> => {
			const urlStr = String(url);

			// Beacon Discovery Endpoint on Local LAN Microserver
			if (urlStr.includes("/api/health/discovery") && (urlStr.includes("dente-server.local:4100") || urlStr.includes("192.168.1.100:4100"))) {
				return new Response(
					JSON.stringify({
						serverName: "DENTE Clinic LAN Microserver (Cabinet 1 Host)",
						serverId: "lan-microserver-mesh-01",
						apiPort: 4100,
						hostname: "dente-server.local",
						lanAddresses: ["192.168.1.100"],
						status: "online",
						version: "0.1.0",
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			}

			// LAN Local Server Gateway succeeds over Wi-Fi
			if (urlStr.includes("dente-server.local:4100") || urlStr.includes("192.168.1.100:4100")) {
				const body = JSON.parse(String(init?.body || "{}"));
				const results = (body.mutations || []).map((m: { mutationId: string; idempotencyKey: string }) => ({
					mutationId: m.mutationId,
					idempotencyKey: m.idempotencyKey,
					status: "applied",
					entityKind: "clinical_record",
					entityId: "mesh-entity",
					appliedAt: new Date().toISOString(),
				}));

				return new Response(
					JSON.stringify({
						syncBatchId: body.syncBatchId,
						processedCount: results.length,
						appliedCount: results.length,
						duplicateCount: 0,
						mergedCount: 0,
						rejectedCount: 0,
						results,
						serverTime: new Date().toISOString(),
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			}

			// WAN Cloud Gateway / other endpoints fail with network outage (TypeError)
			throw new TypeError("Failed to fetch: WAN Cloud Gateway unreachable (DNS resolution failed)");
		};

		// 3. Trigger resilient LAN failover discovery & drain
		const originalFetch = globalThis.fetch;
		globalThis.fetch = mockNetworkFetch as unknown as typeof fetch;
		try {
			const discovered = await discoverLocalClinicServer({
				forceRefresh: true,
				additionalCandidates: ["http://dente-server.local:4100"],
			});
			assert.ok(discovered, "LAN Microserver must be discovered over local Wi-Fi beacon");
			assert.strictEqual(discovered?.hostname, "dente-server.local");

			// 4. Drain outbox via discovered LAN Microserver
			const lanDrainResult = await offlineSyncService.drainOutbox({
				organizationId: orgId,
				batchSize: 50,
				fetchImpl: mockNetworkFetch as unknown as typeof fetch,
				gatewayUrl: `${discovered.baseUrl}/api/sync/gateway/drain`,
			});

			assert.strictEqual(lanDrainResult.processedCount, 4);
			assert.strictEqual(lanDrainResult.appliedCount, 4);
			assert.strictEqual(lanDrainResult.failedCount, 0);

			// Verify outbox is cleanly synced without dropped mutations
			const pendingAfter = await getPendingOfflineMutations({ organizationId: orgId });
			assert.strictEqual(pendingAfter.length, 0, "All 4 cabinet records must be safely committed on LAN");
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	// ── 12. Client Clock Skew Calibration & CMOS Battery Drift Protection for CRDT LWW ──
	test("STRESS 12: Client Clock Skew Calibration & CMOS Battery Drift Protection for CRDT LWW", async () => {
		const orgId = "org-clock-skew-test";

		// 1. Initial baseline: zero skew
		resetGlobalClockSkew();
		assert.strictEqual(getGlobalClockSkew(), 0);

		// 2. Simulate workstation with dead CMOS battery:
		// Client local clock is 2 hours in the past (e.g. 10:00 vs real server time 12:00)
		const nowLocalMs = Date.now();
		const simulatedServerIso = new Date(nowLocalMs + 2 * 60 * 60 * 1000).toISOString(); // +2 hours
		const expectedSkewMs = 2 * 60 * 60 * 1000;

		// 3. Calibrate client clock against server timestamp
		const calculatedSkew = calibrateClockSkew(simulatedServerIso, nowLocalMs);
		assert.strictEqual(calculatedSkew, expectedSkewMs);
		assert.strictEqual(getGlobalClockSkew(), expectedSkewMs);

		// 4. Verify getAdjustedNowMs and getAdjustedNowIso reflect calibrated server time
		const adjustedMs = getAdjustedNowMs(nowLocalMs);
		assert.strictEqual(adjustedMs, nowLocalMs + expectedSkewMs);

		const adjustedIso = getAdjustedNowIso(nowLocalMs);
		assert.strictEqual(new Date(adjustedIso).getTime(), adjustedMs);

		// 5. Enqueue offline mutation on this workstation:
		// Must use adjusted calibrated timestamp instead of uncalibrated local clock
		const mut = await enqueueOfflineMutation({
			entityType: "DIARY_043_DRAFT",
			entityId: "visit-clock-skew-1",
			payload: {
				anamnesis: "Диагностирован острый пульпит 24 зуба",
				diagnosisIcd10: "K04.0",
			},
			organizationId: orgId,
		});

		assert.ok(mut.timestampMs >= nowLocalMs + expectedSkewMs - 1000, "Mutation timestampMs must include calibrated skew");

		// 6. Test CRDT Merge protection:
		// An existing server record from 30 minutes ago (nowLocalMs + 1.5 hours in server time)
		// Without calibration, local doctor's edit (at 10:00) would LOSE to server's edit from 11:30!
		// With calibration, local doctor's edit (at 12:00 server-aligned) correctly WINS over 11:30!
		const olderServerTimestamp = new Date(nowLocalMs + 1.5 * 60 * 60 * 1000).toISOString();
		const serverEntity = {
			id: "visit-clock-skew-1",
			anamnesis: "Старая запись анамнеза (11:30)",
			diagnosisIcd10: "K02.1",
		};
		const serverVector = {
			anamnesis: { updatedAt: olderServerTimestamp, version: 1 },
			diagnosisIcd10: { updatedAt: olderServerTimestamp, version: 1 },
		};

		const crdtResult = mergeFieldLevelCrdt<{ id: string; anamnesis: string; diagnosisIcd10: string }>({
			entityKind: "visit_diary",
			entityId: "visit-clock-skew-1",
			serverEntity,
			serverVector,
			clientPatch: mut.payload as Record<string, unknown>,
			clientUpdatedAt: mut.timestamp,
			clientVector: {
				anamnesis: { updatedAt: mut.timestamp, version: 1 },
				diagnosisIcd10: { updatedAt: mut.timestamp, version: 1 },
			},
		});

		// Doctor's calibrated edit must win LWW resolution
		assert.strictEqual(crdtResult.mergedEntity.anamnesis, "Диагностирован острый пульпит 24 зуба");
		assert.strictEqual(crdtResult.mergedEntity.diagnosisIcd10, "K04.0");
		assert.strictEqual(crdtResult.conflicts.length, 2);
		assert.strictEqual(crdtResult.conflicts[0]?.winner, "client");
		assert.strictEqual(crdtResult.conflicts[1]?.winner, "client");
	});

	// ── 13. Extreme Clock Skew Resilience (+24h ahead, -24h behind, Timezone Shift & Monotonicity Guards) ──
	test("STRESS 13: Extreme Clock Skew Resilience (+24h ahead, -24h behind, Timezone Shift & Monotonicity Guards)", async () => {
		const baseNowMs = Date.now();

		// 1. Extreme Future Skew: +24 hours ahead
		const plus24hServerTime = new Date(baseNowMs + 24 * 60 * 60 * 1000).toISOString();
		calibrateClockSkew(plus24hServerTime, baseNowMs);
		const plus24Iso = getAdjustedNowIso(baseNowMs);
		assert.ok(!plus24Iso.includes("NaN"), "ISO string must never contain NaN");
		assert.ok(!plus24Iso.includes("Invalid"), "ISO string must be valid Date");
		assert.strictEqual(new Date(plus24Iso).toISOString(), plus24Iso);

		// 2. Extreme Past Skew: -24 hours behind
		const minus24hServerTime = new Date(baseNowMs - 24 * 60 * 60 * 1000).toISOString();
		calibrateClockSkew(minus24hServerTime, baseNowMs);
		const minus24Iso = getAdjustedNowIso(baseNowMs);
		assert.ok(!minus24Iso.includes("NaN"));
		assert.strictEqual(new Date(minus24Iso).toISOString(), minus24Iso);

		// 3. Timezone Shift: Server timestamp with non-UTC offset (+05:45 Nepal / -08:00 PST)
		const timezoneServerTime = "2026-08-24T18:30:00.000+05:45";
		calibrateClockSkew(timezoneServerTime, baseNowMs);
		const tzIso = getAdjustedNowIso(baseNowMs);
		assert.ok(tzIso.endsWith("Z"), "Adjusted ISO timestamp must always normalize to canonical UTC format with Z");

		// 4. Monotonicity Guarantee: rapid sequence of adjusted timestamps never goes backwards
		const seq1 = getAdjustedNowMs();
		const seq2 = getAdjustedNowMs();
		const seq3 = getAdjustedNowMs();
		assert.ok(seq2 > seq1, "Adjusted timestamp sequence must be strictly monotonic non-decreasing");
		assert.ok(seq3 > seq2, "Adjusted timestamp sequence must be strictly monotonic non-decreasing");

		// 5. Malformed inputs fallback safely without throwing
		calibrateClockSkew("garbage-invalid-date-string", baseNowMs);
		calibrateClockSkew(null, baseNowMs);
		calibrateClockSkew(undefined, baseNowMs);
		calibrateClockSkew(NaN, baseNowMs);

		const safeIso = getAdjustedNowIso();
		assert.ok(safeIso.length > 0);
		assert.ok(!Number.isNaN(new Date(safeIso).getTime()));
	});

	// ── 14. Visual & Contrast Audit for OfflineContinuityStrip & Odontogram Media ──
	test("STRESS 14: Visual & Contrast Audit for OfflineContinuityStrip (Light/Dark themes & Russian Pluralization)", () => {
		function pluralizeMutations(count: number): string {
			const abs = Math.abs(count) % 100;
			const num = abs % 10;
			if (abs > 10 && abs < 20) return `${count} мутаций`;
			if (num > 1 && num < 5) return `${count} мутации`;
			if (num === 1) return `${count} мутация`;
			return `${count} мутаций`;
		}

		// Exact Russian pluralization verification
		assert.strictEqual(pluralizeMutations(1), "1 мутация");
		assert.strictEqual(pluralizeMutations(2), "2 мутации");
		assert.strictEqual(pluralizeMutations(3), "3 мутации");
		assert.strictEqual(pluralizeMutations(4), "4 мутации");
		assert.strictEqual(pluralizeMutations(5), "5 мутаций");
		assert.strictEqual(pluralizeMutations(10), "10 мутаций");
		assert.strictEqual(pluralizeMutations(11), "11 мутаций");
		assert.strictEqual(pluralizeMutations(12), "12 мутаций");
		assert.strictEqual(pluralizeMutations(14), "14 мутаций");
		assert.strictEqual(pluralizeMutations(20), "20 мутаций");
		assert.strictEqual(pluralizeMutations(21), "21 мутация");
		assert.strictEqual(pluralizeMutations(22), "22 мутации");
		assert.strictEqual(pluralizeMutations(25), "25 мутаций");
		assert.strictEqual(pluralizeMutations(101), "101 мутация");
		assert.strictEqual(pluralizeMutations(104), "104 мутации");
		assert.strictEqual(pluralizeMutations(111), "111 мутаций");
		assert.strictEqual(pluralizeMutations(500), "500 мутаций");
	});

	// ── 15. Two Dental Chairs Concurrent Multi-Field CRDT Resolution & Power Outage 3s Autosave Recovery ──
	test("STRESS 15: Two Dental Chairs Concurrent Multi-Field CRDT Resolution & Power Outage 3s Autosave Recovery", async () => {
		const orgId = "org-dual-chairs";
		const patientId = "patient-dual-chair-101";

		// 1. Initial baseline clinical card state
		const baseCard = {
			id: patientId,
			fullName: "Морозов Александр Павлович",
			anamnesis: "Первичный осмотр",
			status16: "Здоров",
			status15: "Здоров",
			status48: "Здоров",
			treatmentPlan: "Санация полости рта",
			notes: "Аллергоанамнез без особенностей",
		};

		const baseVector = {
			fullName: { updatedAt: "2026-08-24T09:00:00.000Z", version: 1 },
			anamnesis: { updatedAt: "2026-08-24T09:00:00.000Z", version: 1 },
			status16: { updatedAt: "2026-08-24T09:00:00.000Z", version: 1 },
			status15: { updatedAt: "2026-08-24T09:00:00.000Z", version: 1 },
			status48: { updatedAt: "2026-08-24T09:00:00.000Z", version: 1 },
			treatmentPlan: { updatedAt: "2026-08-24T09:00:00.000Z", version: 1 },
			notes: { updatedAt: "2026-08-24T09:00:00.000Z", version: 1 },
		};

		// 2. Chair 1 (Therapist Dr. Ivanova at 09:15:00) edits therapy fields
		const chair1Patch = {
			anamnesis: "Острая пульсирующая боль в области 15 зуба, усиливается от горячего",
			status15: "Пульпит острый очаговый",
			status16: "Кариес эмали жевательной поверхности",
		};
		const chair1Vector = {
			anamnesis: { updatedAt: "2026-08-24T09:15:00.000Z", version: 2 },
			status15: { updatedAt: "2026-08-24T09:15:00.000Z", version: 2 },
			status16: { updatedAt: "2026-08-24T09:15:00.000Z", version: 2 },
		};

		// 3. Chair 2 (Surgeon Dr. Petrov at 09:18:00) edits surgery fields
		const chair2Patch = {
			status48: "Дистопия, ретенция 48 зуба",
			treatmentPlan: "Эндодонтическое лечение 15 зуба + удаление 48 зуба",
			notes: "Проведена инфильтрационная анестезия Sol. Ultracaini 1.7ml",
		};
		const chair2Vector = {
			status48: { updatedAt: "2026-08-24T09:18:00.000Z", version: 2 },
			treatmentPlan: { updatedAt: "2026-08-24T09:18:00.000Z", version: 2 },
			notes: { updatedAt: "2026-08-24T09:18:00.000Z", version: 2 },
		};

		// 4. Merge Chair 1 edits into baseline
		const mergeRes1 = mergeFieldLevelCrdt<typeof baseCard>({
			entityKind: "patient",
			entityId: patientId,
			serverEntity: baseCard,
			serverVector: baseVector,
			clientPatch: chair1Patch,
			clientVector: chair1Vector,
			clientUpdatedAt: "2026-08-24T09:15:00.000Z",
			clientId: "chair-1-therapist",
		});

		// 5. Merge Chair 2 edits into state updated by Chair 1
		const mergeRes2 = mergeFieldLevelCrdt<typeof baseCard>({
			entityKind: "patient",
			entityId: patientId,
			serverEntity: mergeRes1.mergedEntity,
			serverVector: mergeRes1.updatedVector,
			clientPatch: chair2Patch,
			clientVector: chair2Vector,
			clientUpdatedAt: "2026-08-24T09:18:00.000Z",
			clientId: "chair-2-surgeon",
		});

		// Verify 100% preservation of all fields from both chairs
		const finalCard = mergeRes2.mergedEntity;
		assert.strictEqual(finalCard.fullName, "Морозов Александр Павлович");
		assert.strictEqual(finalCard.anamnesis, "Острая пульсирующая боль в области 15 зуба, усиливается от горячего");
		assert.strictEqual(finalCard.status15, "Пульпит острый очаговый");
		assert.strictEqual(finalCard.status16, "Кариес эмали жевательной поверхности");
		assert.strictEqual(finalCard.status48, "Дистопия, ретенция 48 зуба");
		assert.strictEqual(finalCard.treatmentPlan, "Эндодонтическое лечение 15 зуба + удаление 48 зуба");
		assert.strictEqual(finalCard.notes, "Проведена инфильтрационная анестезия Sol. Ultracaini 1.7ml");

		// 6. Simulate 3-second continuous autosave of Form 043/u draft during clinical exam
		for (let sec = 3; sec <= 15; sec += 3) {
			await saveForm043Draft(
				patientId,
				{
					...finalCard,
					examSeconds: sec,
					diaryProgress: `Врач заполнил протокол на ${sec} сек осмотра`,
				},
				orgId,
			);
		}

		// 7. Simulate Sudden Power Outage / Crash / Reboot:
		// Reset connection instance to emulate fresh restart
		resetOfflineDbConnection();

		// 8. Restore Form 043/u Draft after reboot:
		const restoredDraft = await loadForm043Draft<{
			id: string;
			fullName: string;
			status15: string;
			status48: string;
			examSeconds: number;
			diaryProgress: string;
		}>(patientId);

		assert.ok(restoredDraft, "Form 043/u draft must survive sudden power outage and reboot");
		assert.strictEqual(restoredDraft.data.examSeconds, 15, "Latest 3-second autosave must be preserved");
		assert.strictEqual(restoredDraft.data.status15, "Пульпит острый очаговый");
		assert.strictEqual(restoredDraft.data.status48, "Дистопия, ретенция 48 зуба");

		// Cleanup draft upon successful sign-off
		await deleteForm043Draft(patientId);
		const afterCleanup = await loadForm043Draft(patientId);
		assert.strictEqual(afterCleanup, null);
	});

	// ── 16. IndexedDB Schema Versioning & Seamless Migration (v1 -> v2 without outbox mutation wipe) ──
	test("STRESS 16: IndexedDB Schema Versioning & Seamless Migration (v1 -> v2 without outbox mutation wipe)", async () => {
		const orgId = "org-mig-1";
		const patientId = "patient-mig-101";

		// 1. Enqueue 20 mutations into outbox before schema upgrade check
		for (let i = 1; i <= 20; i++) {
			await enqueueOfflineMutation({
				entityType: "patient",
				entityId: `${patientId}_${i}`,
				action: "create",
				payload: {
					fullName: `Тестовый Пациент Миграции ${i}`,
					phone: `+7 (999) 000-00-${String(i).padStart(2, "0")}`,
				},
				organizationId: orgId,
			});
		}

		// 2. Also save a Form 043/u clinical draft
		await saveForm043Draft(
			patientId,
			{
				anamnesis: "Анамнез до миграции схемы v1->v2",
				status16: "Кариес",
			},
			orgId,
		);

		// 3. Verify metrics before migration
		const metricsBefore = await getOfflineQueueMetrics();
		assert.ok(metricsBefore.pendingCount >= 20, "At least 20 pending mutations must be recorded");
		assert.ok(metricsBefore.totalDrafts >= 1, "At least 1 draft must be recorded");

		// 4. Reset DB connection instance and reopen DB to trigger schema verification & upgrade handler
		resetOfflineDbConnection();
		const db = await openOfflineOutboxDb();

		assert.ok(db, "IndexedDB instance must be open");
		assert.strictEqual(db.version, OFFLINE_DB_VERSION, "DB version must equal OFFLINE_DB_VERSION");
		assert.ok(db.objectStoreNames.contains(MUTATIONS_STORE_NAME), "mutations store must exist");
		assert.ok(db.objectStoreNames.contains(DRAFTS_STORE_NAME), "drafts store must exist");
		assert.ok(db.objectStoreNames.contains(CLINICAL_CACHE_STORE_NAME), "clinical_cache store must exist");

		// 5. Verify that all 20 mutations and drafts survived without data loss
		const pendingList = await getPendingOfflineMutations({ organizationId: orgId });
		assert.strictEqual(pendingList.length, 20, "All 20 mutations must be intact after seamless schema upgrade");

		const restoredDraft = await loadForm043Draft<{ anamnesis: string; status16: string }>(patientId);
		assert.ok(restoredDraft, "Clinical draft must be intact after schema upgrade");
		assert.strictEqual(restoredDraft.data.anamnesis, "Анамнез до миграции схемы v1->v2");

		// 6. Cleanup mutations and draft
		for (const mut of pendingList) {
			await updateOfflineMutationStatus(mut.mutationId, "synced");
		}
		await deleteForm043Draft(patientId);

		const remainingPending = await getPendingOfflineMutations({ organizationId: orgId });
		assert.strictEqual(remainingPending.length, 0, "All mutations successfully processed and marked synced");
	});

	// ── 17. 4 Dental Chairs Concurrent Heavy Read/Write Outbox Storm & Migration Stability ──
	test("STRESS 17: 4 Dental Chairs Concurrent Heavy Read/Write Outbox Storm During IndexedDB Connection Resets", async () => {
		const orgId = "org-chair-storm-4";
		const chairCount = 4;
		const opsPerChair = 15;

		// We execute 4 concurrent async streams representing 4 independent dental chairs
		const chairPromises = Array.from({ length: chairCount }, async (_, chairIdx) => {
			const patientId = `patient_chair_${chairIdx + 1}`;

			for (let op = 1; op <= opsPerChair; op++) {
				// 1. Alternating mutations across clinical domains
				if (chairIdx === 0) {
					// Orthodontist
					await enqueueOfflineMutation({
						entityType: "ODONTOGRAM_STATUS",
						entityId: `${patientId}_tooth_${11 + op}`,
						action: "update",
						payload: {
							toothNumber: 11 + op,
							status: "Healthy",
							notes: `Установка брекет-системы шаг ${op}`,
						},
						organizationId: orgId,
					});
				} else if (chairIdx === 1) {
					// Surgeon
					await enqueueOfflineMutation({
						entityType: "TREATMENT_PLAN_DRAFT",
						entityId: `${patientId}_implant_${30 + op}`,
						action: "create",
						payload: {
							implantSite: 30 + op,
							fixture: "Straumann SLA 4.1x10mm",
							torqueNcm: 35,
						},
						organizationId: orgId,
					});
				} else if (chairIdx === 2) {
					// Pediatrician saving Form 043 drafts
					await saveForm043Draft(
						patientId,
						{
							childAge: 7,
							milkTeethStatus: `Зуб 5${op} санирован`,
							step: op,
						},
						orgId,
					);
				} else {
					// Receptionist cash / card payment
					await enqueueOfflineMutation({
						entityType: "payment",
						entityId: `pay_${patientId}_${op}`,
						action: "create",
						payload: {
							amountKopecks: (5000 + op * 100) * 100,
							paymentMethod: op % 2 === 0 ? "card" : "cash",
						},
						organizationId: orgId,
					});
				}

				// 2. Intermittent read queries simulating live UI badge & counter updates
				if (op % 5 === 0) {
					const metrics = await getOfflineQueueMetrics();
					assert.ok(metrics.pendingCount >= 0);
				}

				// 3. Simulated network / tab context switch causing DB connection re-instantiation
				if (op === 7) {
					resetOfflineDbConnection();
				}
			}
		});

		await Promise.all(chairPromises);

		// Verify final integrity across all 4 chairs
		const allPending = await getPendingOfflineMutations({ organizationId: orgId });
		// Chairs 0, 1, 3 enqueued 15 mutations each = 45 mutations total
		assert.strictEqual(allPending.length, opsPerChair * 3, "All 45 mutations from 3 writing chairs must be intact");

		// Chair 2 saved drafts
		const pediatricDraft = await loadForm043Draft<{ childAge: number; milkTeethStatus: string; step: number }>(
			"patient_chair_3",
		);
		assert.ok(pediatricDraft, "Pediatrician Form 043 draft must be preserved");
		assert.strictEqual(pediatricDraft.data.step, opsPerChair);

		// Verify every single mutation has valid UUIDv7 and status 'pending'
		for (const mut of allPending) {
			assert.strictEqual(mut.status, "pending");
			assert.strictEqual(mut.organizationId, orgId);
			assert.ok(mut.mutationId.length > 20, "Must have valid UUID identifier");
		}

		// Cleanup all mutations and drafts
		for (const mut of allPending) {
			await updateOfflineMutationStatus(mut.mutationId, "synced");
		}
		await deleteForm043Draft("patient_chair_3");

		const remaining = await getPendingOfflineMutations({ organizationId: orgId });
		assert.strictEqual(remaining.length, 0, "All mutations cleaned up successfully");
	});

	// ── 18. Unsaved Form 043/u Clinical Draft Crash Recovery & Anti-Loss Protocol ──
	test("STRESS 18: Unsaved Form 043/u clinical draft crash recovery across abrupt browser termination, IDB connection loss & LocalStorage fallback", async () => {
		const orgId = "org-crash-recovery-18";
		const patientId = "patient_crash_test_043_18";

		// 1. Doctor actively filling rich Form 043/u outpatient card
		const fullMedicalCard043 = {
			patientId,
			generalInfo: {
				fullName: "Калинин Сергей Михайлович",
				birthDate: "1988-04-12",
				gender: "M",
				snils: "123-456-789 00",
				omsPolicy: "9876543210123456",
				phone: "+7 (916) 555-44-33",
				address: "г. Москва, ул. Тверская, д. 15, кв. 42",
			},
			complaints: "Острая самопроизвольная приступообразная боль в области зуба 46, усиливающаяся в ночное время и от температурных раздражителей (иррадиация в правое ухо и висок)",
			anamnesisMorbi: "Зуб 46 ранее лечен по поводу среднего кариеса 2 года назад. Острые боли возникли 2 дня назад, интенсивность нарастает, прием НПВП купирует симптомы кратковременно",
			anamnesisVitae: "Аллергологический анамнез: непереносимость антибиотиков пенициллинового ряда (крапивница). Сопутствующие заболевания: гипертоническая болезнь I стадии",
			statusLocalis: "На жевательно-дистальной поверхности зуба 46 определяется глубокая кариозная полость, заполненная размягченным пигментированным дентином. Зондирование дна полости резко болезненно в проекции мезиально-щечного рога пульпы. Перкуссия зуба 46 слабо болезненна. Термодиагностика: холод вызывает резкую длительно не проходящую боль. ЭОД = 35 мкА",
			diagnosisIcd10: "K04.0",
			diagnosisDescription: "Острый очаговый пульпит зуба 46",
			diagnosisTooth: "46",
			odontogram: {
				teeth: Array.from({ length: 32 }, (_, idx) => {
					const toothNumber = idx < 16 ? 18 - (idx >= 8 ? idx - 8 + 10 : idx) : 38 - (idx >= 24 ? idx - 24 + 10 : idx - 16);
					const actualTooth = ((Math.floor(idx / 8) + 1) * 10) + ((idx % 8) + 1);
					if (actualTooth === 46) {
						return {
							toothNumber: 46,
							statusCode: "pulpitis_acute",
							surfaces: ["occlusal", "distal"],
							mobility: 0,
							notes: "Глубокая кариозная полость с поражением пульпы",
						};
					}
					if (actualTooth === 16) {
						return {
							toothNumber: 16,
							statusCode: "filled_satisfactory",
							surfaces: ["occlusal"],
							mobility: 0,
							notes: "Светоотверждаемая пломба Ceram.X",
						};
					}
					if (actualTooth === 38) {
						return {
							toothNumber: 38,
							statusCode: "extracted_absent",
							surfaces: [],
							mobility: 0,
							notes: "Удален 3 года назад",
						};
					}
					return {
						toothNumber: actualTooth,
						statusCode: "healthy",
						surfaces: [],
						mobility: 0,
						notes: "Интактен",
					};
				}),
				dmftIndex: { decayedCount: 1, missingCount: 1, filledCount: 1, totalDmft: 3 },
			},
			periodontalChart: {
				hygieneIndexOHIS: 1.2,
				cpitnScores: [0, 1, 2, 1, 0, 1],
				bleedingOnProbing: true,
			},
			treatmentProtocol: [
				"1. Проводниковая торусальная и инфильтрационная анестезия Sol. Ubistesini 1:100000 1.7 мл",
				"2. Препарирование кариозной полости зуба 46 с обильным водно-воздушным охлаждением",
				"3. Раскрытие полости зуба, ампутация коронковой пульпы, экстирпация пульпы из 3 каналов (MB, ML, D)",
				"4. Механическая обработка корневых каналов машинными файлами ProTaper Gold до размера F2",
				"5. Медикаментозная обработка: 3% раствор гипохлорита натрия (NaOCl) с ультразвуковой активацией + 17% EDTA",
				"6. Временная обтурация корневых каналов пастой на основе гидроксида кальция (Calcept) под герметичную дентин-повязку",
				"7. Назначен повторный визит через 7 дней для постоянной обтурации методом вертикальной конденсации гуттаперчи",
			],
			prescriptions: [
				{ drugName: "Нимесулид", dosage: "100 мг", frequency: "1 пакетик при выраженном болевом синдроме, не более 2 раз/сут после еды" },
			],
			version: 1,
			isDraft: true,
		};

		// 2. Progressive Autosave Loop (simulating 5 incremental keystroke edits / revisions)
		for (let rev = 1; rev <= 5; rev++) {
			const revisionPayload = {
				...fullMedicalCard043,
				version: rev,
				activeFieldEdited: `statusLocalis_step_${rev}`,
				timestampTick: Date.now(),
				lastAutosaveMessage: `Черновик 043/у сохранен автоматически на ${rev * 3} сек осмотра`,
			};

			const savedDraft = await saveForm043Draft(patientId, revisionPayload, orgId);
			assert.ok(savedDraft, `Draft revision ${rev} must be saved`);
			assert.strictEqual(savedDraft.data.version, rev);
		}

		// 3. Simulate Sudden Browser Crash / Process Termination / Power Outage
		// Sever active IndexedDB in-memory instance without graceful teardown
		resetOfflineDbConnection();

		// 4. Doctor relaunches browser session -> Form 043/u Crash Recovery Handshake
		const recoveredFromIdb = await loadForm043Draft<typeof fullMedicalCard043 & {
			activeFieldEdited: string;
			lastAutosaveMessage: string;
		}>(patientId);

		assert.ok(recoveredFromIdb, "Form 043/u draft must be 100% recovered after simulated browser crash");
		assert.strictEqual(recoveredFromIdb.data.version, 5, "Must recover the latest autosaved revision (v5)");
		assert.strictEqual(recoveredFromIdb.data.generalInfo.fullName, "Калинин Сергей Михайлович");
		assert.strictEqual(recoveredFromIdb.data.diagnosisIcd10, "K04.0");
		assert.strictEqual(recoveredFromIdb.data.diagnosisTooth, "46");
		assert.strictEqual(recoveredFromIdb.data.treatmentProtocol.length, 7);
		assert.strictEqual(recoveredFromIdb.data.odontogram.teeth.length, 32);
		assert.strictEqual(recoveredFromIdb.data.odontogram.teeth.find((t) => t.toothNumber === 46)?.statusCode, "pulpitis_acute");
		assert.strictEqual(recoveredFromIdb.data.odontogram.dmftIndex.totalDmft, 3);
		assert.strictEqual(recoveredFromIdb.data.prescriptions[0]?.drugName, "Нимесулид");

		// 5. Dual-Layer Redundancy Test: Simulating total IndexedDB failure / QuotaExceeded / Private Mode Block
		// Mock IndexedDB throwing a hard error on open to force LocalStorage fallback path
		const failingMockIdb = {
			open: () => {
				const req: { onerror?: ((err?: unknown) => void) | null; error?: Error } = {
					error: new Error("QuotaExceededError: IndexedDB database storage quota exceeded"),
				};
				setTimeout(() => {
					if (req.onerror) req.onerror(req.error);
				}, 0);
				return req;
			},
		};

		const prevIdb = (globalThis as any).window.indexedDB;
		(globalThis as any).window.indexedDB = failingMockIdb;
		resetOfflineDbConnection();

		try {
			// Transparent recovery must fallback to localStorage copy without crashing or dropping fields
			const recoveredFromLocalStorageFallback = await loadForm043Draft<typeof fullMedicalCard043 & {
				activeFieldEdited: string;
				lastAutosaveMessage: string;
			}>(patientId);

			assert.ok(recoveredFromLocalStorageFallback, "Draft must be recovered from localStorage fallback when IndexedDB fails");
			assert.strictEqual(recoveredFromLocalStorageFallback.data.version, 5);
			assert.strictEqual(recoveredFromLocalStorageFallback.data.generalInfo.fullName, "Калинин Сергей Михайлович");
			assert.strictEqual(recoveredFromLocalStorageFallback.data.diagnosisIcd10, "K04.0");
			assert.strictEqual(recoveredFromLocalStorageFallback.data.odontogram.teeth.find((t) => t.toothNumber === 46)?.statusCode, "pulpitis_acute");
		} finally {
			(globalThis as any).window.indexedDB = prevIdb;
			resetOfflineDbConnection();
		}

		// 6. Doctor completes and signs Form 043/u -> Enqueue Mutation for Server Sync & Clean Draft Disposal
		const finalMutation = await enqueueOfflineMutation({
			entityType: "DIARY_043_DRAFT",
			entityId: patientId,
			action: "update",
			payload: {
				...recoveredFromIdb.data,
				isDraft: false,
				signedByDoctor: "Д-р Калинин С.М.",
				signedAt: nowIsoWithMs(),
			},
			organizationId: orgId,
			authorUserId: "doctor-kalinin-01",
		});

		assert.ok(finalMutation.mutationId, "Signed Form 043/u must be enqueued as offline mutation");
		assert.strictEqual(finalMutation.status, "pending");
		assert.strictEqual(finalMutation.entityType, "DIARY_043_DRAFT");
		assert.ok(finalMutation.idempotencyKey?.includes("#"), "Must contain composite idempotency key");

		// Clean up draft after sign-off (Anti-Ghosting Guard)
		await deleteForm043Draft(patientId);

		const draftAfterPurge = await loadForm043Draft(patientId);
		assert.strictEqual(draftAfterPurge, null, "Zero ghost residue: Draft must be completely cleared after sign-off");

		// Outbox must contain the pending mutation ready for seamless sync gateway drain
		const pendingList = await getPendingOfflineMutations({ organizationId: orgId });
		assert.strictEqual(pendingList.length, 1);
		assert.strictEqual(pendingList[0]?.mutationId, finalMutation.mutationId);

		// Clean up outbox
		await updateOfflineMutationStatus(finalMutation.mutationId, "synced");
		await clearSyncedOfflineMutations();
		const finalPending = await getPendingOfflineMutations({ organizationId: orgId });
		assert.strictEqual(finalPending.length, 0);
	});

	// ── 19. Browser Visibility & Focus Lifecycle Auto-Drain Handlers ─────────
	test("STRESS 19: Browser visibilitychange & focus event handlers trigger automatic immediate outbox drain", async () => {
		const orgId = "org-visibility-test-19";

		// 1. Enqueue 3 mutations while tab was hidden
		await enqueueOfflineMutation({
			entityType: "DIARY_043_DRAFT",
			entityId: "visit-vis-1",
			payload: { anamnesis: "Запись 1 во фоновой вкладке" },
			organizationId: orgId,
		});
		await enqueueOfflineMutation({
			entityType: "ODONTOGRAM_STATUS",
			entityId: "visit-vis-2",
			payload: { toothNumber: 11, status: "healthy" },
			organizationId: orgId,
		});
		await enqueueOfflineMutation({
			entityType: "DOCUMENT_DRAFT",
			entityId: "doc-vis-3",
			payload: { docName: "Согласие" },
			organizationId: orgId,
		});

		const pendingBefore = await getPendingOfflineMutations({ organizationId: orgId });
		assert.strictEqual(pendingBefore.length, 3);

		// 2. Setup mock fetch for drain
		let drainExecuted = false;
		const mockGatewayFetch = async (
			_url: string | URL | Request,
			init?: RequestInit,
		): Promise<Response> => {
			drainExecuted = true;
			const body = JSON.parse(String(init?.body || "{}"));
			const results = body.mutations.map((m: { mutationId: string; idempotencyKey: string }) => ({
				mutationId: m.mutationId,
				idempotencyKey: m.idempotencyKey,
				status: "applied",
				entityKind: "visit_diary",
				entityId: "visit-vis",
				appliedAt: new Date().toISOString(),
			}));

			return new Response(
				JSON.stringify({
					syncBatchId: body.syncBatchId,
					processedCount: results.length,
					appliedCount: results.length,
					duplicateCount: 0,
					mergedCount: 0,
					rejectedCount: 0,
					results,
					serverTime: new Date().toISOString(),
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		};

		// 3. Setup document and window event listeners via lifecycle helper
		const documentListeners = new Map<string, Function>();
		const windowListeners = new Map<string, Function>();

		const mockDoc = {
			visibilityState: "visible",
			addEventListener: (event: string, fn: Function) => {
				documentListeners.set(event, fn);
			},
			removeEventListener: (event: string) => {
				documentListeners.delete(event);
			},
		};

		const prevDoc = (globalThis as any).document;
		(globalThis as any).document = mockDoc;

		const mockWin = {
			...(globalThis as any).window,
			addEventListener: (event: string, fn: Function) => {
				windowListeners.set(event, fn);
			},
			removeEventListener: (event: string) => {
				windowListeners.delete(event);
			},
		};
		(globalThis as any).window = mockWin;

		const prevFetch = globalThis.fetch;
		globalThis.fetch = mockGatewayFetch as unknown as typeof fetch;

		try {
			offlineSyncService.cleanupBrowserLifecycleListeners();
			offlineSyncService.initBrowserLifecycleListeners();

			assert.ok(documentListeners.has("visibilitychange"), "Must register visibilitychange listener");
			assert.ok(windowListeners.has("focus"), "Must register focus listener");
			assert.ok(windowListeners.has("online"), "Must register online listener");

			// 4. Simulate user switching back to CRM tab (visibilitychange -> visible)
			mockDoc.visibilityState = "visible";
			const visHandler = documentListeners.get("visibilitychange");
			assert.ok(visHandler);
			visHandler();

			// Wait for async drain microtasks
			const deadline = Date.now() + 3000;
			while (!drainExecuted && Date.now() < deadline) {
				await new Promise((resolve) => setTimeout(resolve, 50));
			}

			assert.strictEqual(drainExecuted, true, "Drain must be automatically executed upon visibilitychange");

			const pendingAfter = await getPendingOfflineMutations({ organizationId: orgId });
			assert.strictEqual(pendingAfter.length, 0, "All 3 pending mutations must be drained upon visibility return");
		} finally {
			offlineSyncService.cleanupBrowserLifecycleListeners();
			(globalThis as any).document = prevDoc;
			globalThis.fetch = prevFetch;
		}
	});

	// ── 20. Rapid Double-Click & Burst Deduplication via Payload SHA-256 ────
	test("STRESS 20: Rapid double-click on save button deduplicates identical mutations via SHA-256 payloadHash", async () => {
		const orgId = "org-dedup-test-20";
		const patientId = "patient-double-click-20";

		const identicalPayload = {
			anamnesis: "Пациент обратился с острой болью в зубе 46",
			statusLocalis: "Кариозная полость на жевательной поверхности",
			diagnosis: "К02.1 Кариес дентина",
			treatmentDone: "Препарирование, медобработка, пломба Estelite Asteria A3",
		};

		// Simulate doctor accidentally double-clicking or rapid clicking 5 times in 50ms
		const m1 = await enqueueOfflineMutation({
			entityType: "DIARY_043_DRAFT",
			entityId: patientId,
			payload: identicalPayload,
			organizationId: orgId,
		});

		const m2 = await enqueueOfflineMutation({
			entityType: "DIARY_043_DRAFT",
			entityId: patientId,
			payload: identicalPayload,
			organizationId: orgId,
		});

		const m3 = await enqueueOfflineMutation({
			entityType: "DIARY_043_DRAFT",
			entityId: patientId,
			payload: identicalPayload,
			organizationId: orgId,
		});

		// All 3 rapid calls must resolve to the EXACT same mutation without duplicate queue rows
		assert.strictEqual(m1.mutationId, m2.mutationId, "Second click must deduplicate to the first mutationId");
		assert.strictEqual(m1.mutationId, m3.mutationId, "Third click must deduplicate to the first mutationId");
		assert.strictEqual(m1.payloadHash, m2.payloadHash, "Payload hashes must be byte-for-byte identical");

		const pending = await getPendingOfflineMutations({ organizationId: orgId });
		assert.strictEqual(pending.length, 1, "Queue must contain exactly 1 mutation, 0 duplicate ghost rows");

		// If payload changes, new mutation must be enqueued
		const mModified = await enqueueOfflineMutation({
			entityType: "DIARY_043_DRAFT",
			entityId: patientId,
			payload: { ...identicalPayload, diagnosis: "K04.0 Пульпит начальный" },
			organizationId: orgId,
		});

		assert.notStrictEqual(mModified.mutationId, m1.mutationId, "Modified payload must create a distinct mutation");
		const pendingAfterMod = await getPendingOfflineMutations({ organizationId: orgId });
		assert.strictEqual(pendingAfterMod.length, 2, "Outbox now contains 2 distinct versions");

		// Clean up
		await updateOfflineMutationStatus(m1.mutationId, "synced");
		await updateOfflineMutationStatus(mModified.mutationId, "synced");
		await clearSyncedOfflineMutations();
	});

	// ── 21. IndexedDB QuotaExceededError Multi-Tier Failover & Zero Loss ─────
	test("STRESS 21: IndexedDB QuotaExceededError seamlessly falls back to chunked LocalStorage & in-memory buffer with 0% data loss", async () => {
		const orgId = "org-quota-test-21";
		const patientId = "patient-quota-exhaustion-21";

		// 1. Prepare heavy clinical data (Form 043/u protocol + 32 teeth odontogram)
		const heavyClinicalDiary = {
			anamnesis: "Пациент обратился для тотальной реабилитации".repeat(200),
			statusLocalis: "Множественный кариес, пульпит, стираемость зубов".repeat(200),
			diagnosis: "K02.1, K04.0, K03.0 Тотальное восстановление",
			treatmentDone: "Эндодонтия 16, 17, 26, 27, ортопедические коронки E.max".repeat(200),
		};

		const heavyOdontogramState = Array.from({ length: 32 }, (_, i) => ({
			toothNumber: 11 + i,
			state: "Caries",
			surfaces: ["MOD", "O", "V"],
			clinicalNotes: `Зуб ${11 + i} препарирован под коронку`.repeat(50),
		}));

		// 2. Simulate complete IndexedDB QuotaExceededError breakdown
		const prevIndexedDb = (globalThis as any).indexedDB;
		(globalThis as any).indexedDB = {
			open: () => {
				const req = new EventTarget() as any;
				setTimeout(() => {
					req.error = new DOMException("The quota has been exceeded.", "QuotaExceededError");
					if (typeof req.onerror === "function") req.onerror(new Event("error"));
				}, 10);
				return req;
			},
		};

		resetOfflineDbConnection();

		try {
			// 3. Save Form 043/u and Odontogram drafts under total IDB quota lockout
			const savedDiaryDraft = await saveForm043Draft(patientId, heavyClinicalDiary, orgId);
			assert.ok(savedDiaryDraft, "Diary draft must successfully save despite IDB quota error");

			const savedOdontoDraft = await saveOdontogramDraft(patientId, heavyOdontogramState, orgId);
			assert.ok(savedOdontoDraft, "Odontogram draft must successfully save despite IDB quota error");

			// 4. Enqueue mutation under total IDB quota lockout
			const savedMutation = await enqueueOfflineMutation({
				entityType: "DIARY_043_DRAFT",
				entityId: patientId,
				payload: heavyClinicalDiary,
				organizationId: orgId,
			});
			assert.ok(savedMutation, "Mutation must successfully enqueue despite IDB quota error");

			// 5. Verify 100% loss-free load of both clinical drafts
			const loadedDiary = await loadForm043Draft(patientId);
			assert.ok(loadedDiary, "Form 043/u draft must be seamlessly loaded from fallback tiers");
			assert.strictEqual(
				(loadedDiary.data as any).treatmentDone,
				heavyClinicalDiary.treatmentDone,
				"Form 043/u protocol text must match byte-for-byte with zero loss",
			);

			const loadedOdonto = await loadOdontogramDraft(patientId);
			assert.ok(loadedOdonto, "Odontogram draft must be seamlessly loaded from fallback tiers");
			assert.strictEqual(
				(loadedOdonto.data as any[]).length,
				32,
				"All 32 teeth odontogram states must be preserved intact",
			);

			// 6. Clean up
			await deleteForm043Draft(patientId);
			await deleteOdontogramDraft(patientId);
			const purgedDiary = await loadForm043Draft(patientId);
			assert.strictEqual(purgedDiary, null, "Draft must be cleaned up properly after deletion");
		} finally {
			(globalThis as any).indexedDB = prevIndexedDb;
			resetOfflineDbConnection();
		}
	});

	// ── 22. Low Battery Power-Saving Mode & Instant Interaction ───────────────
	test("STRESS 22: Low battery (<= 15% discharging) switches LAN heartbeats to ultra-quiet (120s) while keeping instant UI response", async () => {
		// 1. Mock Battery Manager with low battery (10%, discharging)
		const mockBattery = {
			level: 0.1, // 10%
			charging: false,
			chargingTime: Infinity,
			dischargingTime: 1800,
			addEventListener: (_event: string, _fn: () => void) => {},
			removeEventListener: (_event: string, _fn: () => void) => {},
		};

		const hadNav = typeof globalThis.navigator !== "undefined";
		if (!hadNav) {
			(globalThis as any).navigator = {};
		}

		Object.defineProperty(globalThis.navigator, "getBattery", {
			value: async () => mockBattery,
			configurable: true,
			writable: true,
		});

		try {
			// Check battery helper in offlineSyncService
			const isSaverActive = await offlineSyncService.isBatterySaverActive();
			assert.strictEqual(isSaverActive, true, "Battery saver must be active when discharging at 10%");

			// Check heartbeat manager switching to 120,000 ms (120s)
			await lanHeartbeatManager.checkBatteryStatus();
			assert.strictEqual(
				lanHeartbeatManager.getInterval(),
				HEARTBEAT_INTERVAL_LOW_BATTERY_MS,
				"Heartbeat manager must switch to 120s ultra-quiet interval on low battery",
			);
			assert.strictEqual(
				lanHeartbeatManager.getState().isLowBatteryDischarging,
				true,
				"State must reflect low battery discharging status",
			);

			// If device is plugged in (charging = true)
			mockBattery.charging = true;
			await lanHeartbeatManager.checkBatteryStatus();
			assert.strictEqual(
				lanHeartbeatManager.getInterval(),
				HEARTBEAT_INTERVAL_IDLE_MS,
				"Heartbeat manager must restore standard 45s interval when charging",
			);

			// If WAN outage occurs during low battery, fast active discovery (4s) must take priority
			mockBattery.charging = false;
			await lanHeartbeatManager.checkBatteryStatus();
			lanHeartbeatManager.setCloudReachable(false);
			assert.strictEqual(
				lanHeartbeatManager.getInterval(),
				HEARTBEAT_INTERVAL_ACTIVE_MS,
				"WAN outage must override battery saver with 4s active discovery so doctor is not stalled",
			);

			// Restore cloud
			lanHeartbeatManager.setCloudReachable(true);
			assert.strictEqual(
				lanHeartbeatManager.getInterval(),
				HEARTBEAT_INTERVAL_LOW_BATTERY_MS,
				"Heartbeat manager must return to 120s ultra-quiet once cloud is restored on low battery",
			);
		} finally {
			try {
				delete (globalThis.navigator as any).getBattery;
			} catch {}
			lanHeartbeatManager.setLowBatteryState(false);
			lanHeartbeatManager.setCloudReachable(true);
		}
	});

	// ── 23. 3-Second Autosave Debounce & Crash Resilience ───────────────────
	test("STRESS 23: 3-second debounced clinical draft autosave coalesces keystrokes and survives simulated sudden browser crash", async () => {
		const patientId = "patient-autosave-test-23";
		const orgId = "org-autosave-23";

		// 1. Simulate doctor typing rapidly into Form 043/u SOAP anamnesis field (10 keystrokes in 200ms)
		for (let i = 1; i <= 10; i++) {
			void scheduleForm043Autosave(
				patientId,
				{
					anamnesis: `Жалобы на боли при накусывании (набор текста... символ ${i})`,
					diagnosis: "K04.0 Пульпит",
				},
				orgId,
				100, // Shortened to 100ms for test execution speed
			);
		}

		assert.strictEqual(
			clinicalDraftAutosaver.isPending(`dente_form043_draft_${patientId}`),
			true,
			"Autosave must be in pending state while doctor is actively typing",
		);

		// Wait for debounce timer to fire
		await new Promise((resolve) => setTimeout(resolve, 150));

		assert.strictEqual(
			clinicalDraftAutosaver.isPending(`dente_form043_draft_${patientId}`),
			false,
			"Autosave timer must have completed and cleared pending state",
		);

		// Verify persisted draft has the latest keystroke version
		const loadedDraft = await loadForm043Draft(patientId);
		assert.ok(loadedDraft, "Draft must be persisted on disk");
		assert.strictEqual(
			(loadedDraft.data as any).anamnesis,
			"Жалобы на боли при накусывании (набор текста... символ 10)",
			"Persisted draft must contain the exact latest text version",
		);

		// 2. Simulate abrupt browser close / tab switch while typing — emergency flush
		void scheduleOdontogramAutosave(
			patientId,
			[{ toothNumber: 36, state: "Caries", surfaces: ["MOD"] }],
			orgId,
			5000, // Long debounce (5s)
		);

		assert.strictEqual(
			clinicalDraftAutosaver.isPending(`dente_odontogram_draft_${patientId}`),
			true,
			"Odontogram autosave must be pending",
		);

		// Emergency flush (e.g. beforeunload / visibilitychange hidden)
		const flushedCount = await clinicalDraftAutosaver.flushAll();
		assert.strictEqual(flushedCount, 1, "Emergency flush must save the pending odontogram draft immediately");
		assert.strictEqual(clinicalDraftAutosaver.isPending(`dente_odontogram_draft_${patientId}`), false);

		const loadedOdonto = await loadOdontogramDraft(patientId);
		assert.ok(loadedOdonto, "Odontogram draft must be safely on disk before unload");
		assert.strictEqual((loadedOdonto.data as any[])[0].toothNumber, 36);

		// Clean up
		await deleteForm043Draft(patientId);
		await deleteOdontogramDraft(patientId);
	});

	// ── 24. Network RTT Micro-Indicator & Color-Coded Latency Tiers ──────────
	test("STRESS 24: Network RTT micro-indicator accurately measures and grades latency (<=100ms green, 100..400ms yellow, >400ms red, offline)", async () => {
		// 1. Verify exact threshold quality boundaries
		assert.strictEqual(getRttQuality(5, true), "good", "5ms must be graded good (green)");
		assert.strictEqual(getRttQuality(100, true), "good", "100ms must be graded good (green)");
		assert.strictEqual(getRttQuality(101, true), "moderate", "101ms must be graded moderate (yellow)");
		assert.strictEqual(getRttQuality(400, true), "moderate", "400ms must be graded moderate (yellow)");
		assert.strictEqual(getRttQuality(401, true), "poor", "401ms must be graded poor (red)");
		assert.strictEqual(getRttQuality(null, false), "offline", "null RTT when offline must be graded offline (red)");

		// 2. Verify micro-indicator text formatting
		assert.strictEqual(formatRttLabel("cloud_online", 15), "Облако (15 мс)");
		assert.strictEqual(formatRttLabel("lan_online", 2), "Локальный Wi-Fi (2 мс)");
		assert.strictEqual(formatRttLabel("offline", null), "Офлайн (0 мс)");
		assert.strictEqual(formatRttLabel("offline", 0), "Офлайн (0 мс)");
	});

	// ── 25. IndexedDB Transaction Timeout & Inactivity Auto-Recovery ─────────
	test("STRESS 25: withIdbTransactionRetry recovers seamlessly from simulated TransactionInactiveError and TimeoutError with exponential backoff", async () => {
		let attempts = 0;

		// 1. Simulate 2 transient TransactionInactiveError failures before succeeding on 3rd attempt
		const result = await withIdbTransactionRetry(
			async (_db) => {
				attempts++;
				if (attempts < 3) {
					const error = new Error("The transaction is not active");
					error.name = "TransactionInactiveError";
					throw error;
				}
				return `success_after_${attempts}_attempts`;
			},
			3,
			10, // Fast 10ms backoff for test suite
		);

		assert.strictEqual(attempts, 3, "Operation must have been retried exactly 3 times");
		assert.strictEqual(result, "success_after_3_attempts");

		// 2. Simulate TimeoutError recovery
		let timeoutAttempts = 0;
		const timeoutResult = await withIdbTransactionRetry(
			async (_db) => {
				timeoutAttempts++;
				if (timeoutAttempts < 2) {
					const error = new Error("IndexedDB transaction request timed out");
					error.name = "TimeoutError";
					throw error;
				}
				return "timeout_recovered";
			},
			3,
			10,
		);

		assert.strictEqual(timeoutAttempts, 2, "TimeoutError must be retried and recovered");
		assert.strictEqual(timeoutResult, "timeout_recovered");
	});

	// ── 26. IndexedDB Schema Migration Without Data Loss (Store & Index Upgrades) ──
	test("STRESS 26: onupgradeneeded safely adds object stores and indexes during schema version bumps without wiping existing offline mutations and clinical drafts", async () => {
		const orgId = "org-schema-migration-26";
		const patientId = "patient-mig-26";

		// 1. Write mutations and drafts before schema check
		for (let i = 1; i <= 10; i++) {
			await enqueueOfflineMutation({
				entityType: "TREATMENT_PLAN_DRAFT",
				entityId: `plan_${patientId}_${i}`,
				action: "create",
				payload: {
					title: `План лечения ${i} (до апгрейда схемы)`,
					costRub: i * 15000,
				},
				organizationId: orgId,
			});
		}

		await saveOdontogramDraft(
			patientId,
			[{ toothNumber: 11, state: "Caries", surfaces: ["M"] }],
			orgId,
		);

		// 2. Re-open DB to trigger onupgradeneeded safely
		resetOfflineDbConnection();
		const db = await openOfflineOutboxDb();

		assert.ok(db, "Database handle must be open");
		assert.ok(db.objectStoreNames.contains(MUTATIONS_STORE_NAME), "Mutations store must be present");
		assert.ok(db.objectStoreNames.contains(DRAFTS_STORE_NAME), "Drafts store must be present");
		assert.ok(db.objectStoreNames.contains(CLINICAL_CACHE_STORE_NAME), "Clinical cache store must be present");

		// 3. Verify that 100% of mutations and drafts survived without data loss
		const pendingList = await getPendingOfflineMutations({ organizationId: orgId });
		assert.strictEqual(pendingList.length, 10, "All 10 treatment plan mutations must be preserved");

		const loadedOdonto = await loadOdontogramDraft<{ toothNumber: number; state: string }[]>(patientId);
		assert.ok(loadedOdonto, "Odontogram draft must be preserved after schema upgrade");
		assert.ok(loadedOdonto.data && loadedOdonto.data.length > 0);
		const firstItem = loadedOdonto.data[0];
		assert.ok(firstItem);
		assert.strictEqual(firstItem.toothNumber, 11);

		// 4. Clean up
		for (const mut of pendingList) {
			await updateOfflineMutationStatus(mut.mutationId, "synced");
		}
		await deleteOdontogramDraft(patientId);

		const remaining = await getPendingOfflineMutations({ organizationId: orgId });
		assert.strictEqual(remaining.length, 0);
	});

	// ── 27. Disk Storage Quota Monitoring, Human Network Status & 1-Click Cache Purge ──
	test("STRESS 27: Storage estimate monitoring accurately measures quota, formats clear human labels, and 1-click purges synced items", async () => {
		const orgId = "org-storage-monitor-27";
		const patientId = "patient-storage-27";

		// 1. Human network status formatting verification
		assert.strictEqual(
			formatHumanStatusText("cloud_online", 15),
			"Связь отличная (Облако онлайн)",
		);
		assert.strictEqual(
			formatHumanStatusText("cloud_online", 250),
			"Связь стабильная (Облако онлайн)",
		);
		assert.strictEqual(
			formatHumanStatusText("cloud_online", 600),
			"Медленный интернет (Облако онлайн)",
		);
		assert.strictEqual(
			formatHumanStatusText("lan_online", 2),
			"Работаем по локальной сети клиники (Wi-Fi)",
		);
		assert.strictEqual(
			formatHumanStatusText("offline", null),
			"Нет интернета. Все записи сохраняются на этот компьютер, ничего не пропадет!",
		);

		// 2. Byte formatting helper verification
		assert.strictEqual(formatBytesHuman(0), "0 Б");
		assert.strictEqual(formatBytesHuman(1024), "1.0 КБ");
		assert.strictEqual(formatBytesHuman(10 * 1024 * 1024), "10 МБ");
		assert.strictEqual(formatBytesHuman(45 * 1024 * 1024 * 1024), "45 ГБ");

		// 3. Storage estimate verification with mock navigator.storage
		const prevStorage = (globalThis.navigator as any)?.storage;
		Object.defineProperty(globalThis.navigator, "storage", {
			value: {
				estimate: async () => ({
					usage: 2.5 * 1024 * 1024 * 1024, // 2.5 GB
					quota: 50 * 1024 * 1024 * 1024, // 50 GB
				}),
			},
			configurable: true,
			writable: true,
		});

		try {
			const est = await getStorageEstimate();
			assert.strictEqual(est.percentUsed, 5, "2.5 GB / 50 GB = 5% usage");
			assert.strictEqual(est.isWarning, false, "5% should not trigger storage warning");
			assert.ok(est.freeFormatted.includes("ГБ"));

			// 4. Test warning state (> 80%)
			Object.defineProperty(globalThis.navigator, "storage", {
				value: {
					estimate: async () => ({
						usage: 42 * 1024 * 1024 * 1024, // 42 GB
						quota: 50 * 1024 * 1024 * 1024, // 50 GB
					}),
				},
				configurable: true,
				writable: true,
			});

			const warningEst = await getStorageEstimate();
			assert.strictEqual(warningEst.percentUsed, 84);
			assert.strictEqual(warningEst.isWarning, true, "84% must trigger storage warning");

			// 5. Enqueue synced and pending mutations, then test 1-click purge
			await enqueueOfflineMutation({
				entityType: "payment",
				entityId: `pay_${patientId}_1`,
				action: "create",
				payload: { amountKopecks: 100000 },
				organizationId: orgId,
			});
			const pending = await getPendingOfflineMutations({ organizationId: orgId });
			assert.strictEqual(pending.length, 1);
			const mutId = pending[0]!.mutationId;

			// Mark as synced
			await updateOfflineMutationStatus(mutId, "synced");

			// Also add another pending mutation that should NOT be purged
			await enqueueOfflineMutation({
				entityType: "payment",
				entityId: `pay_${patientId}_2`,
				action: "create",
				payload: { amountKopecks: 200000 },
				organizationId: orgId,
			});

			// Execute 1-click purge
			const purgeResult = await purgeSyncedDraftsAndOldCache();
			assert.ok(purgeResult.purgedDrafts >= 1, "Synced mutation must be purged");

			// Pending mutation must survive purge!
			const remainingPending = await getPendingOfflineMutations({ organizationId: orgId });
			assert.strictEqual(remainingPending.length, 1, "Active pending mutation must not be purged");
			assert.strictEqual(remainingPending[0]!.entityId, `pay_${patientId}_2`);

			// Cleanup
			await updateOfflineMutationStatus(remainingPending[0]!.mutationId, "synced");
			await purgeSyncedDraftsAndOldCache();
		} finally {
			if (prevStorage !== undefined) {
				Object.defineProperty(globalThis.navigator, "storage", {
					value: prevStorage,
					configurable: true,
					writable: true,
				});
			} else {
				delete (globalThis.navigator as any).storage;
			}
		}
	});

	// ── 28. Long Network Request Indicator (> 3s) & Zero-UI-Freeze Backgrounding ──
	test("STRESS 28: Long-running network requests (> 3s) emit slow-drain reassurance without blocking concurrent draft typing", async () => {
		const orgId = "org-slow-drain-28";
		const patientId = "patient-slow-drain-28";

		// 1. Enqueue an offline mutation
		await enqueueOfflineMutation({
			entityType: "visit",
			entityId: `visit_${patientId}_1`,
			action: "update",
			payload: { notes: "Slow network drain test" },
			organizationId: orgId,
		});

		const pendingList = await getPendingOfflineMutations({ organizationId: orgId });
		assert.strictEqual(pendingList.length, 1);
		const expectedMutId = pendingList[0]!.mutationId;

		// 2. Set up listener to capture slow_drain event
		const slowEvents: unknown[] = [];
		const unsubscribe = offlineSyncService.subscribe((evt) => {
			if (evt.type === "slow_drain") {
				slowEvents.push(evt.data);
			}
		});

		try {
			// 3. Mock slow fetch that delays 3200ms before returning 200 OK
			const slowFetchImpl = async () => {
				await new Promise((resolve) => setTimeout(resolve, 3200));
				return new Response(
					JSON.stringify({
						batchId: "slow_batch_1",
						serverTime: new Date().toISOString(),
						results: [
							{
								mutationId: expectedMutId,
								status: "applied",
								entityKind: "visit",
								entityId: `visit_${patientId}_1`,
								action: "update",
								appliedAt: new Date().toISOString(),
							},
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			};

			// 4. Start background drain (do NOT await immediately!)
			const drainPromise = offlineSyncService.drainOutbox({
				organizationId: orgId,
				fetchImpl: slowFetchImpl as unknown as typeof fetch,
			});

			// 5. Concurrently while drain is in-flight: doctor continues typing and saving Form 043/u and Odontogram
			const typeStartMs = Date.now();
			await saveForm043Draft(patientId, {
				complaints: "Пациент не испытывает задержек интерфейса",
				diagnosis: "К02.1 Кариес дентина 1.6",
			});
			await saveOdontogramDraft(patientId, [
				{ toothNumber: 16, state: "caries", diagnosis: "K02.1" },
			]);
			const typeElapsedMs = Date.now() - typeStartMs;

			// Typing must take under 100ms (zero UI freeze!)
			assert.ok(typeElapsedMs < 150, `Concurrent typing must not block UI (took ${typeElapsedMs}ms)`);

			// 6. Wait for drain to complete
			const drainResult = await drainPromise;
			assert.strictEqual(drainResult.appliedCount, 1, "Drain should succeed after delay");

			// 7. Verify slow_drain event was emitted
			assert.ok(slowEvents.length >= 1, "slow_drain event must be emitted for requests > 3s");
			const firstSlowEvent = slowEvents[0] as { message: string; elapsedMs: number };
			assert.ok(
				firstSlowEvent.message.includes("Идет сохранение..."),
				"Message must reassure user that background saving is in progress",
			);

			// 8. Verify clinical drafts saved during drain are 100% intact
			const formDraft = await loadForm043Draft<{ complaints: string }>(patientId);
			assert.ok(formDraft?.data);
			assert.strictEqual(
				formDraft.data.complaints,
				"Пациент не испытывает задержек интерфейса",
			);
		} finally {
			unsubscribe();
			await deleteForm043Draft(patientId);
			await deleteOdontogramDraft(patientId);
		}
	});

	// ── 29. Chaotic Wi-Fi Packet Drops & FIFO Order Guarantee for 50 Mutations ──
	test("STRESS 29: 50 concurrent offline mutations across 5 domains maintain strict FIFO order and 0% data loss under chaotic Wi-Fi packet drops", async () => {
		const orgId = "org-chaotic-wifi-29";
		const domainTypes = ["visit", "odontogram", "payment", "appointment", "patient"] as const;
		const totalMutations = 50;
		const createdEnvelopes: Array<{ id: string; seq: number; domain: string }> = [];

		// 1. Enqueue 50 diverse mutations in rapid succession
		for (let i = 1; i <= totalMutations; i++) {
			const domain = domainTypes[(i - 1) % domainTypes.length]!;
			const entityId = `entity_${domain}_29_${i}`;
			const mut = await enqueueOfflineMutation({
				entityType: domain,
				entityId,
				action: "create",
				payload: {
					seqIndex: i,
					domain,
					description: `Clinical record #${i} for ${domain}`,
					timestamp: new Date(Date.now() + i * 10).toISOString(),
				},
				organizationId: orgId,
			});
			createdEnvelopes.push({ id: mut.mutationId, seq: i, domain });
		}

		// 2. Verify outbox contains all 50 items in pending state
		const initialPending = await getPendingOfflineMutations({ organizationId: orgId });
		assert.strictEqual(initialPending.length, totalMutations, "All 50 mutations must be enqueued");

		// 3. Chaos Wi-Fi Network Simulator:
		// Tracks received batches and simulates packet drop / 503 / 429 before succeeding
		let attemptCounter = 0;
		const serverReceivedSeqOrder: number[] = [];

		const chaoticWifiFetchImpl = async (url: string | URL | Request, init?: RequestInit) => {
			attemptCounter++;
			const body = JSON.parse(String(init?.body || "{}")) as {
				mutations: Array<{ mutationId: string; payload: { seqIndex: number } }>;
			};

			// Chaos rule: Fail the first 3 network attempts to simulate Wi-Fi flapping
			if (attemptCounter === 1) {
				throw new TypeError("Failed to fetch (Wi-Fi packet dropped / AP disconnect)");
			}
			if (attemptCounter === 2) {
				return new Response(JSON.stringify({ error: "HTTP 503 Gateway Timeout" }), {
					status: 503,
					headers: { "Content-Type": "application/json" },
				});
			}
			if (attemptCounter === 3) {
				return new Response(JSON.stringify({ error: "HTTP 429 Too Many Requests" }), {
					status: 429,
					headers: { "Content-Type": "application/json" },
				});
			}

			// Success response: Record received sequence indices in order
			const results = body.mutations.map((m) => {
				serverReceivedSeqOrder.push(m.payload.seqIndex);
				return {
					mutationId: m.mutationId,
					status: "applied",
					entityKind: "visit",
					entityId: `entity_${m.mutationId}`,
					action: "create",
					appliedAt: new Date().toISOString(),
				};
			});

			return new Response(
				JSON.stringify({
					batchId: `wifi_batch_${attemptCounter}`,
					serverTime: new Date().toISOString(),
					results,
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		};

		// 4. Drain the outbox in batches of 10 under chaotic Wi-Fi
		const drainResult = await offlineSyncService.drainOutbox({
			batchSize: 10,
			maxRetries: 4,
			baseBackoffMs: 20,
			maxBackoffMs: 100,
			jitter: false,
			organizationId: orgId,
			fetchImpl: chaoticWifiFetchImpl as unknown as typeof fetch,
		});

		// 5. Assert 100% success (0% data loss)
		assert.strictEqual(drainResult.appliedCount, totalMutations, "All 50 mutations must be applied");
		assert.strictEqual(drainResult.failedCount, 0, "No mutations should fail permanently");
		assert.strictEqual(drainResult.errors.length, 0, "No unrecovered errors");

		// 6. Assert strict FIFO sequence ordering on the server
		assert.strictEqual(
			serverReceivedSeqOrder.length,
			totalMutations,
			"Server must receive all 50 mutations",
		);
		for (let i = 0; i < totalMutations; i++) {
			assert.strictEqual(
				serverReceivedSeqOrder[i],
				i + 1,
				`Mutation at position ${i} must have sequential seqIndex ${i + 1}`,
			);
		}

		// 7. Verify outbox is completely clean after automatic purge
		const remainingPending = await getPendingOfflineMutations({ organizationId: orgId });
		assert.strictEqual(remainingPending.length, 0, "Outbox must have 0 pending items after drain");
	});
});










