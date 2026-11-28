import assert from "node:assert/strict";
import * as nodeCrypto from "node:crypto";
import { afterEach, beforeEach, describe, it } from "node:test";
import { openDicomOfflineDb } from "../components/dicom/dicomOfflineSync";
import {
	DEFAULT_CHUNK_SIZE_BYTES,
	MAX_PARALLEL_CHUNKS,
	uploadImagingScanChunked,
} from "../components/imaging/upload/chunkedImagingUpload";
import { saveToothStatesToIndexedDb } from "../components/odontogram/syncModules/odontogramIndexedDbSync";
import { openSpeechChunkDb } from "../helpers/speechHelpers";
import {
	cacheScheduleOffline,
	clearScheduleMemoryCache,
	getCachedScheduleOffline,
} from "../offline/offlineAppointmentQueue";
import {
	clearPaymentMemoryCache,
	enqueueOfflinePayment,
} from "../offline/offlinePaymentQueue";
import { backupStaffEventsToIndexedDb } from "../services/logging/telemetry/batchTransport";
import { openMediaVaultDb } from "../services/media/offlineMediaVault";
import { OFFLINE_DB_NAME } from "../services/offline/storage/constants";
import {
	openOfflineOutboxDb,
	resetOfflineDbConnection,
} from "../services/offline/storage/idbDatabase";
import { VoiceOfflineQueue } from "../services/voice/VoiceOfflineQueue";

function createLocalStorageMock(): Storage {
	const store = new Map<string, string>();
	return {
		get length() {
			return store.size;
		},
		clear() {
			store.clear();
		},
		getItem(key: string) {
			return store.get(key) ?? null;
		},
		key(index: number) {
			return Array.from(store.keys())[index] ?? null;
		},
		removeItem(key: string) {
			store.delete(key);
		},
		setItem(key: string, value: string) {
			store.set(key, String(value));
		},
	};
}

function createTrackingIndexedDbMock(openedDbNames: string[]): IDBFactory {
	const stores = new Map<string, Map<string, unknown>>();
	const ensureStore = (name: string) => {
		let map = stores.get(name);
		if (!map) {
			map = new Map();
			stores.set(name, map);
		}
		return map;
	};

	const makeRequest = <T>(result: T) => {
		const req: Record<string, unknown> = {
			result,
			error: null,
			onsuccess: null,
			onerror: null,
			onupgradeneeded: null,
			onblocked: null,
		};
		queueMicrotask(() => {
			if (typeof req.onsuccess === "function") {
				req.onsuccess({ target: req });
			}
		});
		return req;
	};

	const dbMock: Record<string, unknown> = {
		objectStoreNames: {
			contains: (name: string) => stores.has(name),
		},
		createObjectStore: (name: string) => {
			ensureStore(name);
			return {
				indexNames: { contains: () => false },
				createIndex: () => {},
			};
		},
		close: () => {},
		transaction: (storeNames: string | string[]) => {
			const list = Array.isArray(storeNames) ? storeNames : [storeNames];
			const tx: Record<string, unknown> = {
				oncomplete: null,
				onerror: null,
				objectStore: (name: string) => {
					const map = ensureStore(name || list[0] || "default");
					return {
						put: (val: unknown, explicitKey?: unknown) => {
							const k =
								explicitKey !== undefined
									? String(explicitKey)
									: val && typeof val === "object" && "id" in val
										? String((val as { id: unknown }).id)
										: val && typeof val === "object" && "patientId" in val
											? String((val as { patientId: unknown }).patientId)
											: `k_${map.size}`;
							map.set(k, val);
							return makeRequest(k);
						},
						get: (k: string) => makeRequest(map.get(String(k)) ?? undefined),
						getAll: () => makeRequest(Array.from(map.values())),
						delete: (k: string) => {
							map.delete(String(k));
							return makeRequest(undefined);
						},
						clear: () => {
							map.clear();
							return makeRequest(undefined);
						},
					};
				},
			};
			setTimeout(() => {
				if (typeof tx.oncomplete === "function") {
					tx.oncomplete();
				}
			}, 0);
			return tx;
		},
	};

	return {
		open: (name: string, _version?: number) => {
			openedDbNames.push(name);
			const req: Record<string, unknown> = {
				result: dbMock,
				error: null,
				transaction: null,
				onsuccess: null,
				onerror: null,
				onupgradeneeded: null,
				onblocked: null,
			};
			queueMicrotask(() => {
				if (typeof req.onupgradeneeded === "function") {
					req.onupgradeneeded({ target: req, oldVersion: 0 });
				}
				if (typeof req.onsuccess === "function") {
					req.onsuccess({ target: req });
				}
			});
			return req as unknown as IDBOpenDBRequest;
		},
		deleteDatabase: () => makeRequest(undefined) as unknown as IDBOpenDBRequest,
		databases: async () => [],
		cmp: () => 0,
	};
}

describe("Unified Offline Outbox SSOT & 4MB Chunked Upload", () => {
	const originalIndexedDb = globalThis.indexedDB;
	const originalLocalStorage = globalThis.localStorage;
	const originalWindow = globalThis.window;
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		resetOfflineDbConnection(true);
		clearScheduleMemoryCache();
		clearPaymentMemoryCache();
	});

	afterEach(() => {
		resetOfflineDbConnection(true);
		clearScheduleMemoryCache();
		clearPaymentMemoryCache();
		Reflect.set(globalThis, "indexedDB", originalIndexedDb);
		Reflect.set(globalThis, "localStorage", originalLocalStorage);
		Reflect.set(globalThis, "window", originalWindow);
		globalThis.fetch = originalFetch;
	});

	it("opens strictly one SSOT IndexedDB ('dente_clinic_outbox_v1') across all subsystems and leaks 0 schedule/payment keys into localStorage", async () => {
		const openedDbNames: string[] = [];
		const idbMock = createTrackingIndexedDbMock(openedDbNames);
		const localStorageMock = createLocalStorageMock();

		Reflect.set(globalThis, "indexedDB", idbMock);
		Reflect.set(globalThis, "localStorage", localStorageMock);
		Reflect.set(globalThis, "window", {
			indexedDB: idbMock,
			localStorage: localStorageMock,
		});

		await openOfflineOutboxDb();
		await openSpeechChunkDb();
		await openDicomOfflineDb();
		await openMediaVaultDb();
		await saveToothStatesToIndexedDb("pat-unified-1", [
			{ toothNumber: 16, state: "Caries", surfaces: ["O"] },
		]);
		backupStaffEventsToIndexedDb([
			{
				id: "audit-unified-1",
				organizationId: "org-1",
				actionType: "emr_open",
				entityType: "patient",
				entityId: "pat-unified-1",
				occurredAt: new Date().toISOString(),
				details: {},
			},
		]);

		const voiceQueue = new VoiceOfflineQueue({
			autoSyncIntervalMs: 0,
			autoProcessOnEnqueue: false,
		});
		await voiceQueue.enqueue({
			rawText: "Пациент жалуется на боль",
			context: { patientId: "pat-unified-1" },
		});
		voiceQueue.dispose();

		const uniqueDbNames = Array.from(new Set(openedDbNames));
		assert.deepEqual(uniqueDbNames, [OFFLINE_DB_NAME]);
		assert.equal(uniqueDbNames[0], "dente_clinic_outbox_v1");

		// Cache 40 days of schedules -> bounded at 31 and 0 localStorage leaks
		for (let i = 1; i <= 40; i++) {
			const day = `2026-11-${String((i % 28) + 1).padStart(2, "0")}-${i}`;
			cacheScheduleOffline(`2026-12-${String(i).padStart(2, "0")}`, [
				{
					id: `apt-${i}`,
					clientReferenceId: `ref-${i}`,
					patientId: `pat-${i}`,
					patientName: `Patient ${day}`,
					doctorId: "doc-1",
					startTime: "2026-12-01T10:00:00Z",
					endTime: "2026-12-01T10:30:00Z",
					status: "planned",
					createdAt: "2026-12-01T09:00:00Z",
				},
			]);
		}
		assert.equal(getCachedScheduleOffline("2026-12-01"), null, "Oldest schedule day must be evicted when > 31");
		assert.ok(getCachedScheduleOffline("2026-12-40") !== null, "Newest schedule day must stay in bounded L1 cache");

		await enqueueOfflinePayment({
			patientId: "pat-pay-1",
			patientName: "Тестов И.И.",
			totalKopecks: 250000,
			paymentType: "cash",
			items: [{ name: "Осмотр", priceKopecks: 250000, quantity: 1 }],
		});

		for (let i = 0; i < localStorageMock.length; i++) {
			const key = localStorageMock.key(i) || "";
			assert.equal(key.startsWith("dente_schedule_cache_"), false, `Unexpected schedule leak in localStorage: ${key}`);
			assert.equal(key.startsWith("dente_offline_payments_"), false, `Unexpected payment leak in localStorage: ${key}`);
		}
	});

	it("uploads 9 MB DICOM strictly in 4 MB chunks with concurrency=1 and never calls full-file arrayBuffer()", async () => {
		assert.equal(DEFAULT_CHUNK_SIZE_BYTES, 4 * 1024 * 1024);
		assert.equal(MAX_PARALLEL_CHUNKS, 1);

		const nineMbSize = 9 * 1024 * 1024;
		const rawBytes = new Uint8Array(nineMbSize);
		for (let i = 0; i < nineMbSize; i += 4096) {
			rawBytes[i] = (i >> 12) & 0xff;
		}
		const expectedFileSha = nodeCrypto.createHash("sha256").update(rawBytes).digest("hex");
		const file = new File([rawBytes], "cbct_9mb.dcm", { type: "application/dicom" });

		const arrayBufferSizesRead: number[] = [];
		const origArrayBuffer = Blob.prototype.arrayBuffer;
		Blob.prototype.arrayBuffer = function patchedArrayBuffer(this: Blob): Promise<ArrayBuffer> {
			arrayBufferSizesRead.push(this.size);
			return origArrayBuffer.call(this);
		};

		let inFlightParts = 0;
		let maxConcurrentParts = 0;
		const uploadedPartSizes: number[] = [];
		let initPayload: Record<string, unknown> | null = null;

		globalThis.fetch = async (url: RequestInfo | URL, init?: RequestInit) => {
			const u = String(url);
			if (u.endsWith("/api/imaging/chunks/init")) {
				initPayload = JSON.parse(String(init?.body)) as Record<string, unknown>;
				return new Response(JSON.stringify({ ok: true, uploadId: "11111111-1111-4111-8111-111111111111", uploadedChunks: [] }), {
					status: 201,
					headers: { "Content-Type": "application/json" },
				});
			}
			if (u.includes("/part?")) {
				inFlightParts++;
				maxConcurrentParts = Math.max(maxConcurrentParts, inFlightParts);
				await new Promise((r) => setTimeout(r, 15));
				const bodyBuf = init?.body as ArrayBuffer;
				uploadedPartSizes.push(bodyBuf.byteLength);
				inFlightParts--;
				return new Response(JSON.stringify({ ok: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			}
			if (u.endsWith("/complete")) {
				return new Response(
					JSON.stringify({
						success: true,
						study: {
							id: "22222222-2222-4222-8222-222222222222",
							patientId: "33333333-3333-4333-8333-333333333333",
							kind: "cbct",
							title: "CBCT 9MB",
						},
					}),
					{ status: 201, headers: { "Content-Type": "application/json" } },
				);
			}
			return new Response(null, { status: 404 });
		};

		try {
			const res = await uploadImagingScanChunked({
				file,
				patientId: "33333333-3333-4333-8333-333333333333",
				kind: "cbct",
				title: "CBCT 9MB",
			});

			assert.equal(res.success, true);
			assert.ok(initPayload);
			assert.equal(initPayload.totalChunks, 3);
			assert.equal(initPayload.chunkSizeBytes, 4 * 1024 * 1024);
			assert.equal(initPayload.fileSha256, expectedFileSha);
			assert.equal(maxConcurrentParts, 1, "Chunk uploads must run strictly with concurrency=1 on HDD");
			assert.deepEqual(uploadedPartSizes, [4 * 1024 * 1024, 4 * 1024 * 1024, 1 * 1024 * 1024]);
			assert.equal(
				arrayBufferSizesRead.includes(nineMbSize),
				false,
				`Full 9MB file arrayBuffer() must NEVER be called, got sizes: ${arrayBufferSizesRead.join(",")}`,
			);
			assert.ok(
				arrayBufferSizesRead.every((sz) => sz <= 4 * 1024 * 1024),
				"Every slice read must stay <= 4MB",
			);
		} finally {
			Blob.prototype.arrayBuffer = origArrayBuffer;
		}
	});
});
