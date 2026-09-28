/**
 * DENTE CRM — Industrial Stress Test: 5 Offline Visits & 5 Financial Transactions Idempotency
 *
 * Mandatory Verification Gates:
 * 1. Offline Accumulation: 5 Form 043/u clinical visits + 5 financial transactions (54-FZ payments/receipts).
 * 2. Rapid Double-Click Protection: Payload SHA-256 deduplication rejects duplicate offline mutations.
 * 3. Network Restoration & Chaotic Gateway Handling:
 *    - Transient HTTP 503 / 429 retries with exponential backoff & jitter.
 *    - Zero unhandled HTTP 500 errors.
 *    - In-flight drain mutex prevents concurrent drain storms.
 * 4. Kopeck-Exact Money Conservation:
 *    - Sum of 5 financial operations (cash, card, SBP, mixed, deposit) matches down to 1 kopeck.
 *    - Zero duplicate fiscal receipts or double debits.
 * 5. Re-drain Idempotency: Subsequent drain outbox calls produce zero side-effects.
 * 6. CRDT Zero Keystroke Loss & Fiscal Mesh Resolution: Doctor clinical notes and payments are never lost.
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
	computePayloadHash,
	createCompositeIdempotencyKey,
	generateUuidV7,
	resolveCashOperationCrdt,
	resolveForm043DiaryCrdt,
	type CashPaymentRecord,
	type SyncMutationEnvelope,
	type SyncPushBatchRequest,
	type SyncPushBatchResponse,
} from "@dental/shared";
import {
	clearSyncedOfflineMutations,
	enqueueCard043Mutation,
	enqueueCashReceiptMutation,
	enqueueOfflineMutation,
	getOfflineQueueMetrics,
	getPendingOfflineMutations,
	offlineSyncService,
	resetOfflineDbConnection,
	updateOfflineMutationStatus,
} from "../index";
import type { OfflineMutation } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Isolated In-Memory Mock IndexedDB & Storage for Node Test Environment
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

	close() {}
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

describe("Offline-First Stress Test: 5 Accumulated Visits & 5 Fiscal Operations", () => {
	const orgId = "org-clinic-solo-01";
	const doctorId = "doctor-ivanov-solo";
	const cashierName = "Кассир Петрова А. С.";
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
				location: { hostname: "clinic-solo.dente.local" },
				addEventListener: () => {},
				removeEventListener: () => {},
			},
			configurable: true,
			writable: true,
		});

		Object.defineProperty(globalThis, "navigator", {
			value: {
				onLine: false, // Start offline: internet is disconnected!
			},
			configurable: true,
			writable: true,
		});
	});

	afterEach(() => {
		resetOfflineDbConnection();
	});

	it("Master E2E Lifecycle: 5 Visits + 5 Fiscal Payments offline accumulation, chaotic retry & idempotent sync", async () => {
		// ─────────────────────────────────────────────────────────────────────────
		// 1. OFFLINE ACCUMULATION: 5 VISITS (Form 043/u)
		// ─────────────────────────────────────────────────────────────────────────
		assert.strictEqual(navigator.onLine, false, "Must start in disconnected offline mode");

		// Visit 1: Caries treatment 1.6
		const v1 = await enqueueCard043Mutation({
			patientId: "patient-001",
			diaryData: {
				visitId: "visit-001",
				diagnosisIcd10: "K02.1",
				complaints: "Острая реакция на сладкое и холодное в зубе 1.6",
				anamnesis: "Болевые ощущения появились 3 дня назад",
				statusLocalis: "Глубокая кариозная полость на окклюзионной поверхности 1.6",
				treatmentProtocol: [
					"Инфильтрационная анестезия Артикаин 1:200000 1.7 мл",
					"Препарирование кариозной полости",
					"Медикаментозная обработка 2% хлоргексидином",
					"Наложение изолирующей прокладки",
					"Пломбирование светоотверждаемым композитом",
				],
			},
			organizationId: orgId,
			authorUserId: doctorId,
		});

		// Visit 2: Pulpitis root canal treatment 2.4
		const v2 = await enqueueCard043Mutation({
			patientId: "patient-002",
			diaryData: {
				visitId: "visit-002",
				diagnosisIcd10: "K04.0",
				complaints: "Самопроизвольные ночные боли в зубе 2.4, иррадиирующие в висок",
				anamnesis: "Боли в течение суток, обезболивающие не помогают",
				statusLocalis: "Зуб 2.4 с глубокой полостью, зондирование дна резко болезненно",
				treatmentProtocol: [
					"Проводниковая анестезия",
					"Вскрытие полости зуба, ампутация пульпы",
					"Механическая и медикаментозная обработка 2 каналов",
					"Временное пломбирование гидроксидом кальция",
				],
			},
			organizationId: orgId,
			authorUserId: doctorId,
		});

		// Visit 3: Professional hygiene
		const v3Payload = {
			visitId: "visit-003",
			diagnosisIcd10: "K05.1",
			complaints: "Кровоточивость десен при чистке зубов",
			anamnesis: "Профгигиена не проводилась более 1 года",
			statusLocalis: "Наддесневые и поддесневые зубные отложения во фронтальном отделе",
			treatmentProtocol: [
				"Ультразвуковой скейлинг",
				"Air-Flow порошком глицина",
				"Полировка пастой",
				"Фторирование",
			],
		};
		const v3 = await enqueueCard043Mutation({
			patientId: "patient-003",
			diaryData: v3Payload,
			organizationId: orgId,
			authorUserId: doctorId,
		});

		// Rapid double-click simulation on Visit 3: doctor accidentally clicks save twice in 50ms
		const v3Duplicate = await enqueueCard043Mutation({
			patientId: "patient-003",
			diaryData: v3Payload,
			organizationId: orgId,
			authorUserId: doctorId,
		});

		assert.strictEqual(
			v3.mutationId,
			v3Duplicate.mutationId,
			"Rapid double-click on identical visit mutation must return existing pending mutation",
		);

		// Visit 4: Crown consultation and impressions
		const v4 = await enqueueCard043Mutation({
			patientId: "patient-004",
			diaryData: {
				visitId: "visit-004",
				diagnosisIcd10: "K08.1",
				complaints: "Отсутствие зуба 4.6, нарушение жевательной функции",
				treatmentProtocol: [
					"Осмотр, снятие диагностических оттисков",
					"Согласование ортопедического плана",
				],
			},
			organizationId: orgId,
			authorUserId: doctorId,
		});

		// Visit 5: Healing abutment installation
		const v5 = await enqueueCard043Mutation({
			patientId: "patient-005",
			diaryData: {
				visitId: "visit-005",
				diagnosisIcd10: "K00.0",
				complaints: "Плановый этап имплантации зуба 3.6",
				treatmentProtocol: [
					"Инфильтрационная анестезия",
					"Раскрытие имплантата 3.6",
					"Установка формирователя десны 4.5 мм",
				],
			},
			organizationId: orgId,
			authorUserId: doctorId,
		});

		const pendingVisits = await getPendingOfflineMutations({
			entityType: "DIARY_043_DRAFT",
			organizationId: orgId,
		});

		assert.strictEqual(pendingVisits.length, 5, "Exactly 5 clinical visits must be in pending outbox");
		for (const mut of pendingVisits) {
			assert.strictEqual(mut.status, "pending");
			assert.ok(mut.payloadHash && mut.payloadHash.length === 64, "Must have SHA-256 payload hash");
			assert.ok(mut.idempotencyKey, "Must have composite idempotency key");
		}

		// ─────────────────────────────────────────────────────────────────────────
		// 2. OFFLINE ACCUMULATION: 5 FINANCIAL TRANSACTIONS (54-FZ)
		// ─────────────────────────────────────────────────────────────────────────
		// Transaction 1: Cash payment 4,500.00 RUB = 450,000 kopecks
		const t1 = await enqueueCashReceiptMutation({
			patientId: "patient-001",
			visitId: "visit-001",
			invoiceId: "inv-001",
			cashierName,
			totalRub: 4500,
			totalKopecks: 450000,
			paymentType: "cash",
			items: [
				{
					name: "Лечение глубокого кариеса 1.6",
					priceRub: 4500,
					priceKopecks: 450000,
					quantity: 1,
					vatPercent: 0,
				},
			],
			organizationId: orgId,
			authorUserId: doctorId,
		});

		// Transaction 2: POS Card payment 6,000.00 RUB = 600,000 kopecks
		const t2Payload = {
			patientId: "patient-002",
			visitId: "visit-002",
			invoiceId: "inv-002",
			cashierName,
			totalRub: 6000,
			totalKopecks: 600000,
			paymentType: "card" as const,
			items: [
				{
					name: "Лечение пульпита 2.4",
					priceRub: 6000,
					priceKopecks: 600000,
					quantity: 1,
					vatPercent: 0,
				},
			],
			organizationId: orgId,
			authorUserId: doctorId,
		};
		const t2 = await enqueueCashReceiptMutation(t2Payload);

		// Rapid double-click on payment: cashier double clicks 'Оплатить картой'
		const t2Duplicate = await enqueueCashReceiptMutation(t2Payload);
		assert.strictEqual(
			t2.mutationId,
			t2Duplicate.mutationId,
			"Double-clicked payment receipt must be deduplicated immediately in offline queue",
		);

		// Transaction 3: SBP QR payment 5,000.00 RUB = 500,000 kopecks
		const t3 = await enqueueCashReceiptMutation({
			patientId: "patient-003",
			visitId: "visit-003",
			invoiceId: "inv-003",
			cashierName,
			totalRub: 5000,
			totalKopecks: 500000,
			paymentType: "sbp",
			items: [
				{
					name: "Комплексная профессиональная гигиена",
					priceRub: 5000,
					priceKopecks: 500000,
					quantity: 1,
					vatPercent: 0,
				},
			],
			organizationId: orgId,
			authorUserId: doctorId,
		});

		// Transaction 4: Mixed payment (Cash 500 + Card 1000) = 1,500.00 RUB = 150,000 kopecks
		const t4 = await enqueueCashReceiptMutation({
			patientId: "patient-004",
			visitId: "visit-004",
			invoiceId: "inv-004",
			cashierName,
			totalRub: 1500,
			totalKopecks: 150000,
			paymentType: "mixed",
			items: [
				{
					name: "Диагностические оттиски альгинатные",
					priceRub: 1500,
					priceKopecks: 150000,
					quantity: 1,
					vatPercent: 0,
				},
			],
			organizationId: orgId,
			authorUserId: doctorId,
		});

		// Transaction 5: Patient deposit debit 8,500.00 RUB = 850,000 kopecks
		const t5 = await enqueueCashReceiptMutation({
			patientId: "patient-005",
			visitId: "visit-005",
			invoiceId: "inv-005",
			cashierName,
			totalRub: 8500,
			totalKopecks: 850000,
			paymentType: "deposit",
			items: [
				{
					name: "Формирователь десны и абатмент",
					priceRub: 8500,
					priceKopecks: 850000,
					quantity: 1,
					vatPercent: 0,
				},
			],
			organizationId: orgId,
			authorUserId: doctorId,
		});

		const pendingPayments = await getPendingOfflineMutations({
			entityType: "CASH_RECEIPT_DRAFT",
			organizationId: orgId,
		});

		assert.strictEqual(pendingPayments.length, 5, "Exactly 5 payment receipts must be queued offline");

		// Total money verification in outbox:
		// 450,000 + 600,000 + 500,000 + 150,000 + 850,000 = 2,550,000 kopecks (25,500.00 RUB)
		const totalQueuedKopecks = pendingPayments.reduce((sum, m) => {
			const payload = m.payload as { totalKopecks?: number };
			return sum + (payload.totalKopecks || 0);
		}, 0);

		assert.strictEqual(
			totalQueuedKopecks,
			2550000,
			"Sum of 5 queued payments must equal exactly 2,550,000 kopecks (25,500.00 RUB)",
		);

		// Combined queue check: 5 visits + 5 payments = 10 total pending mutations
		const allPending = await getPendingOfflineMutations({ organizationId: orgId });
		assert.strictEqual(allPending.length, 10, "Total pending mutations must be 10 (5 visits + 5 payments)");

		// ─────────────────────────────────────────────────────────────────────────
		// 3. NETWORK RESTORATION & CHAOTIC GATEWAY SIMULATION
		// ─────────────────────────────────────────────────────────────────────────
		// Restore network connectivity!
		Object.defineProperty(globalThis, "navigator", {
			value: { onLine: true },
			configurable: true,
			writable: true,
		});
		assert.strictEqual(navigator.onLine, true);

		let networkCallsCount = 0;
		const processedOnServerIds = new Set<string>();
		let totalServerKopecksProcessed = 0;

		// Mock Cloud Sync Gateway with simulated chaotic network:
		// Call 1: HTTP 503 Service Unavailable (DNS failover in progress)
		// Call 2: HTTP 200 OK with valid batch processing
		const mockGatewayFetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
			networkCallsCount++;
			const bodyText = typeof init?.body === "string" ? init.body : "";
			const req = JSON.parse(bodyText) as SyncPushBatchRequest;

			if (networkCallsCount === 1) {
				// Inject transient 503 to prove backoff resilience
				return new Response("Service Unavailable: Failover in progress", {
					status: 503,
					statusText: "Service Unavailable",
				});
			}

			// Call 2+: Process mutations cleanly
			const results: SyncPushBatchResponse["results"] = [];

			for (const mut of req.mutations) {
				assert.ok(mut.idempotencyKey, "Each envelope must carry an idempotency key");
				assert.ok(mut.payloadHash, "Each envelope must carry a SHA-256 payload hash");

				const isAlreadyProcessed = processedOnServerIds.has(mut.mutationId);
				processedOnServerIds.add(mut.mutationId);

				if (mut.entityKind === "payment") {
					const paymentPayload = mut.payload as { totalKopecks?: number; invoiceId?: string };
					if (!isAlreadyProcessed) {
						totalServerKopecksProcessed += paymentPayload.totalKopecks || 0;
					}
					results.push({
						mutationId: mut.mutationId,
						idempotencyKey: mut.idempotencyKey,
						entityKind: "payment",
						entityId: mut.entityId,
						status: isAlreadyProcessed ? "duplicate" : "applied",
						appliedAt: new Date().toISOString(),
					});
				} else {
					results.push({
						mutationId: mut.mutationId,
						idempotencyKey: mut.idempotencyKey,
						entityKind: mut.entityKind,
						entityId: mut.entityId,
						status: isAlreadyProcessed ? "duplicate" : "applied",
						appliedAt: new Date().toISOString(),
					});
				}
			}

			const responseBody: SyncPushBatchResponse = {
				syncBatchId: req.syncBatchId,
				processedCount: req.mutations.length,
				appliedCount: results.filter((r) => r.status === "applied").length,
				duplicateCount: results.filter((r) => r.status === "duplicate").length,
				mergedCount: 0,
				rejectedCount: 0,
				serverTime: new Date().toISOString(),
				results,
			};

			return new Response(JSON.stringify(responseBody), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		};

		// Drain the outbox with retry enabled
		const drainPromise = offlineSyncService.drainOutbox({
			organizationId: orgId,
			batchSize: 20,
			maxRetries: 3,
			baseBackoffMs: 10,
			maxBackoffMs: 50,
			jitter: false,
			fetchImpl: mockGatewayFetch as unknown as typeof fetch,
		});

		// Mutex Verification: Attempt concurrent drain while drain is in progress
		const concurrentDrainResult = await offlineSyncService.drainOutbox({
			organizationId: orgId,
			fetchImpl: mockGatewayFetch as unknown as typeof fetch,
		});

		assert.strictEqual(
			concurrentDrainResult.processedCount,
			0,
			"In-flight mutex must prevent concurrent drain storms from duplicating network calls",
		);

		const drainResult = await drainPromise;

		// ─────────────────────────────────────────────────────────────────────────
		// 4. VERIFICATION OF DRAIN OUTPUT & KOPECK CONSERVATION
		// ─────────────────────────────────────────────────────────────────────────
		assert.strictEqual(networkCallsCount, 2, "Must have retried once after 503 and succeeded on attempt 2");
		assert.strictEqual(drainResult.processedCount, 10, "All 10 mutations must be processed");
		assert.strictEqual(drainResult.appliedCount, 10, "All 10 mutations must be successfully applied");
		assert.strictEqual(drainResult.failedCount, 0, "Zero mutations should fail");
		assert.strictEqual(drainResult.rejectedCount, 0, "Zero mutations should be rejected");
		assert.strictEqual(drainResult.errors.length, 0, "Zero unhandled HTTP 500 errors");

		// Kopeck-Exact Money Conservation Invariant:
		assert.strictEqual(
			totalServerKopecksProcessed,
			2550000,
			"Server must receive and process exactly 2,550,000 kopecks with ZERO money drift",
		);

		// Outbox cleanup verification:
		const remainingPending = await getPendingOfflineMutations({ organizationId: orgId });
		assert.strictEqual(remainingPending.length, 0, "Outbox pending queue must be 0 after successful drain");

		// ─────────────────────────────────────────────────────────────────────────
		// 5. RE-DRAIN IDEMPOTENCY PROOF (SECOND DRAIN STORM)
		// ─────────────────────────────────────────────────────────────────────────
		const secondDrainCallsBefore = networkCallsCount;
		const secondDrainResult = await offlineSyncService.drainOutbox({
			organizationId: orgId,
			fetchImpl: mockGatewayFetch as unknown as typeof fetch,
		});

		assert.strictEqual(secondDrainResult.processedCount, 0, "Second drain must find zero pending mutations");
		assert.strictEqual(secondDrainResult.appliedCount, 0);
		assert.strictEqual(
			networkCallsCount,
			secondDrainCallsBefore,
			"Zero HTTP requests must be sent on redundant drain when outbox is clean",
		);
	});

	it("CRDT Idempotency & Zero Keystroke Loss Under Concurrent Mesh Updates", () => {
		// 1. Payment CRDT Idempotency: duplicate payment mutation advances status without altering money
		const existingPayment: CashPaymentRecord = {
			paymentId: "pay-002",
			patientId: "patient-002",
			idempotencyKey: "idem-pay-002-abc",
			amountKopecks: 600000,
			paymentMethod: "card",
			status: "draft",
			fiscalDocNumber: undefined,
			createdAt: "2026-09-28T10:00:00.000Z",
		};

		const incomingPayment: CashPaymentRecord = {
			paymentId: "pay-002",
			patientId: "patient-002",
			idempotencyKey: "idem-pay-002-abc",
			amountKopecks: 600000,
			paymentMethod: "card",
			status: "fiscalized",
			fiscalDocNumber: "000042",
			createdAt: "2026-09-28T10:00:00.000Z",
		};

		const cashCrdtResult = resolveCashOperationCrdt({
			existingPayment,
			incomingPayment,
			existingClock: { "client-tablet-1": 1 },
			incomingClock: { "server-fiscal-core": 2 },
			nodeId: "client-tablet-1",
		});

		assert.strictEqual(cashCrdtResult.status, "duplicate", "Matching idempotency key must resolve as duplicate");
		assert.strictEqual(cashCrdtResult.isDuplicate, true);
		assert.strictEqual(
			cashCrdtResult.resolvedPayment.status,
			"fiscalized",
			"Status must advance to fiscalized without duplicating money",
		);
		assert.strictEqual(
			cashCrdtResult.resolvedPayment.amountKopecks,
			600000,
			"Money must remain exactly 600,000 kopecks without distortion",
		);
		assert.strictEqual(cashCrdtResult.resolvedPayment.fiscalDocNumber, "000042");

		// 2. Form 043/u Zero Keystroke Loss Guard:
		// Incoming empty diary string must NEVER wipe out existing doctor notes
		const doctorDiary = {
			visitId: "visit-001",
			complaints: "Острая боль при накусывании 1.6",
			statusLocalis: "Глубокая кариозная полость",
			treatmentProtocol: ["Анестезия", "Препарирование", "Пломба"],
		};

		const blankIncomingDiary = {
			visitId: "visit-001",
			complaints: "   ", // Blank spaces from uninitialized form
			statusLocalis: "",
			treatmentProtocol: ["Анестезия", "Препарирование", "Пломба"],
		};

		const diaryCrdtResult = resolveForm043DiaryCrdt({
			existingDiary: doctorDiary,
			incomingDiary: blankIncomingDiary,
			existingClock: { "tablet-doc": 3 },
			incomingClock: { "reception-pc": 4 },
			existingUpdatedAt: "2026-09-28T10:00:00.000Z",
			incomingUpdatedAt: "2026-09-28T10:05:00.000Z",
			nodeId: "tablet-doc",
		});

		assert.strictEqual(
			diaryCrdtResult.resolvedDiary.complaints,
			"Острая боль при накусывании 1.6",
			"Doctor's complaints must NEVER be wiped by incoming blank string (Zero Keystroke Loss)",
		);
		assert.strictEqual(
			diaryCrdtResult.resolvedDiary.statusLocalis,
			"Глубокая кариозная полость",
			"Doctor's status localis must be preserved",
		);
	});

	it("Multi-Branch Tenant Isolation: Draining outbox for one clinic never leaks or clears other branch outboxes", async () => {
		const orgAlpha = "org-clinic-alpha";
		const orgBeta = "org-clinic-beta";

		// Enqueue 1 visit for Alpha and 1 visit for Beta
		await enqueueCard043Mutation({
			patientId: "patient-alpha-1",
			diaryData: { visitId: "visit-alpha-1", diagnosisIcd10: "K02.1", complaints: "Alpha clinic visit" },
			organizationId: orgAlpha,
			authorUserId: "doc-alpha",
		});

		await enqueueCard043Mutation({
			patientId: "patient-beta-1",
			diaryData: { visitId: "visit-beta-1", diagnosisIcd10: "K04.0", complaints: "Beta clinic visit" },
			organizationId: orgBeta,
			authorUserId: "doc-beta",
		});

		const pendingAlphaBefore = await getPendingOfflineMutations({ organizationId: orgAlpha });
		const pendingBetaBefore = await getPendingOfflineMutations({ organizationId: orgBeta });
		assert.strictEqual(pendingAlphaBefore.length, 1);
		assert.strictEqual(pendingBetaBefore.length, 1);

		// Mock gateway acknowledging Alpha
		const mockGatewayFetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
			const bodyText = typeof init?.body === "string" ? init.body : "";
			const req = JSON.parse(bodyText) as SyncPushBatchRequest;

			const results: SyncPushBatchResponse["results"] = req.mutations.map((m) => ({
				mutationId: m.mutationId,
				idempotencyKey: m.idempotencyKey,
				entityKind: m.entityKind,
				entityId: m.entityId,
				status: "applied",
				appliedAt: new Date().toISOString(),
			}));

			const responseBody: SyncPushBatchResponse = {
				syncBatchId: req.syncBatchId,
				processedCount: req.mutations.length,
				appliedCount: results.length,
				duplicateCount: 0,
				mergedCount: 0,
				rejectedCount: 0,
				serverTime: new Date().toISOString(),
				results,
			};

			return new Response(JSON.stringify(responseBody), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		};

		// Drain strictly for Alpha
		const resAlpha = await offlineSyncService.drainOutbox({
			organizationId: orgAlpha,
			fetchImpl: mockGatewayFetch as unknown as typeof fetch,
		});

		assert.strictEqual(resAlpha.appliedCount, 1);

		// Verify Alpha is drained (0 pending), but Beta remains untouched (1 pending)
		const pendingAlphaAfter = await getPendingOfflineMutations({ organizationId: orgAlpha });
		const pendingBetaAfter = await getPendingOfflineMutations({ organizationId: orgBeta });
		assert.strictEqual(pendingAlphaAfter.length, 0, "Alpha clinic mutations must be drained");
		assert.strictEqual(pendingBetaAfter.length, 1, "Beta clinic mutations must remain intact (Tenant Isolation)");
	});

	it("Validation Rejection: Gateway rejects malformed mutation cleanly without infinite retry loops", async () => {
		const orgTest = "org-test-validation";

		await enqueueOfflineMutation({
			entityType: "GENERIC",
			entityId: "invalid-doc-001",
			action: "create",
			payload: { invalidField: true },
			organizationId: orgTest,
		});

		const mockGatewayFetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
			const bodyText = typeof init?.body === "string" ? init.body : "";
			const req = JSON.parse(bodyText) as SyncPushBatchRequest;

			const results: SyncPushBatchResponse["results"] = req.mutations.map((m) => ({
				mutationId: m.mutationId,
				idempotencyKey: m.idempotencyKey,
				entityKind: m.entityKind,
				entityId: m.entityId,
				status: "rejected",
				appliedAt: new Date().toISOString(),
				error: "422 Unprocessable Entity: Invalid document schema",
			}));

			const responseBody: SyncPushBatchResponse = {
				syncBatchId: req.syncBatchId,
				processedCount: req.mutations.length,
				appliedCount: 0,
				duplicateCount: 0,
				mergedCount: 0,
				rejectedCount: results.length,
				serverTime: new Date().toISOString(),
				results,
			};

			return new Response(JSON.stringify(responseBody), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		};

		const res = await offlineSyncService.drainOutbox({
			organizationId: orgTest,
			maxRetries: 2,
			fetchImpl: mockGatewayFetch as unknown as typeof fetch,
		});

		assert.strictEqual(res.rejectedCount, 1, "Rejected mutation must be counted in rejectedCount");
		assert.strictEqual(res.appliedCount, 0);
		assert.strictEqual(res.errors.length, 1);
		assert.ok(res.errors[0]?.error.includes("422 Unprocessable Entity"));
	});
});
