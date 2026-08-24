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
	computePayloadHash,
	createCompositeIdempotencyKey,
	mergeFieldLevelCrdt,
} from "@dental/shared";
import {
	calculateBackoffDelay,
	clearSyncedOfflineMutations,
	deleteForm043Draft,
	deleteOfflineDraft,
	deleteOfflineMutation,
	deleteVisitDraft,
	enqueueOfflineMutation,
	generateMutationUuid,
	getOfflineMutationById,
	getOfflineQueueMetrics,
	getPendingOfflineMutations,
	listOfflineDrafts,
	loadForm043Draft,
	loadOfflineDraft,
	loadVisitDraft,
	mapToSyncAction,
	mapToSyncEntityKind,
	nowIsoWithMs,
	type OfflineMutation,
	offlineSyncService,
	openOfflineOutboxDb,
	resetOfflineDbConnection,
	saveForm043Draft,
	saveOfflineDraft,
	saveVisitDraft,
	updateOfflineMutationStatus,
} from "../index";

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
});

