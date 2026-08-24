/**
 * DENTE CRM — Offline Media Vault & Background Sync Test Suite
 *
 * Тестирование:
 * 1. Сохранение интраоральных фото и прицельных снимков в IndexedDB Blob
 * 2. Генерация WebP превью 200x200 для карточек зубов одонтограммы
 * 3. Выборка снимков по пациенту и конкретному зубу (FDI)
 * 4. Фоновая досылка на локальный сервер клиники (порт 4100) без блокировки UI
 * 5. Дренаж очереди медиафайлов с обработкой сетевых сбоев
 * 6. Мониторинг квоты хранилища и безопасная очистка кэша (eviction)
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
	clearMemoryMediaStorage,
	evictSyncedMediaCache,
	generateWebpThumbnail,
	getMediaItemById,
	getMediaOriginalBlob,
	getMediaVaultStorageEstimate,
	listPatientMedia,
	resetMediaDbConnection,
	saveMediaToVault,
	updateMediaSyncStatus,
} from "../services/media/offlineMediaVault";
import {
	drainMediaSyncQueue,
	getPendingMediaItems,
	uploadSingleMediaItem,
} from "../services/media/mediaSyncQueue";

// ─────────────────────────────────────────────────────────────────────────────
// In-Memory IndexedDB Mock for Media Vault
// ─────────────────────────────────────────────────────────────────────────────

interface MockStoreData {
	keyPath: string | null;
	indexes: Map<string, string>;
	records: Map<string, unknown>;
}

class MockIDBTransaction {
	db: MockIDBDatabase;
	mode: string;
	error: DOMException | null = null;
	oncomplete: (() => void) | null = null;
	onerror: (() => void) | null = null;

	constructor(db: MockIDBDatabase, mode: string) {
		this.db = db;
		this.mode = mode;
	}

	objectStore(name: string): MockIDBObjectStore {
		const store = this.db.stores.get(name);
		if (!store) throw new Error(`ObjectStore not found: ${name}`);
		return new MockIDBObjectStore(store, this);
	}
}

class MockIDBIndex {
	storeData: MockStoreData;
	indexField: string;
	tx: MockIDBTransaction;

	constructor(storeData: MockStoreData, indexField: string, tx: MockIDBTransaction) {
		this.storeData = storeData;
		this.indexField = indexField;
		this.tx = tx;
	}

	getAll(query?: unknown): { onsuccess: (() => void) | null; onerror: (() => void) | null; result: unknown[] } {
		const req = { onsuccess: null as (() => void) | null, onerror: null as (() => void) | null, result: [] as unknown[] };
		queueMicrotask(() => {
			const items: unknown[] = [];
			for (const val of this.storeData.records.values()) {
				if (query === undefined) {
					items.push(val);
				} else if (val && typeof val === "object" && (val as Record<string, unknown>)[this.indexField] === query) {
					items.push(val);
				}
			}
			req.result = items;
			if (req.onsuccess) req.onsuccess();
		});
		return req;
	}
}

class MockIDBObjectStore {
	storeData: MockStoreData;
	tx: MockIDBTransaction;

	constructor(storeData: MockStoreData, tx: MockIDBTransaction) {
		this.storeData = storeData;
		this.tx = tx;
	}

	index(name: string): MockIDBIndex {
		const field = this.storeData.indexes.get(name) || name;
		return new MockIDBIndex(this.storeData, field, this.tx);
	}

	put(value: unknown, key?: string): { onsuccess: (() => void) | null; onerror: (() => void) | null } {
		const req = { onsuccess: null as (() => void) | null, onerror: null as (() => void) | null };
		const finalKey = key || (this.storeData.keyPath && value && typeof value === "object"
			? (value as Record<string, unknown>)[this.storeData.keyPath] as string
			: String(this.storeData.records.size));

		this.storeData.records.set(finalKey, value);

		queueMicrotask(() => {
			if (req.onsuccess) req.onsuccess();
			if (this.tx.oncomplete) this.tx.oncomplete();
		});
		return req;
	}

	get(key: string): { onsuccess: (() => void) | null; onerror: (() => void) | null; result: unknown } {
		const req = { onsuccess: null as (() => void) | null, onerror: null as (() => void) | null, result: undefined as unknown };
		queueMicrotask(() => {
			req.result = this.storeData.records.get(key);
			if (req.onsuccess) req.onsuccess();
		});
		return req;
	}

	getAll(): { onsuccess: (() => void) | null; onerror: (() => void) | null; result: unknown[] } {
		const req = { onsuccess: null as (() => void) | null, onerror: null as (() => void) | null, result: [] as unknown[] };
		queueMicrotask(() => {
			req.result = Array.from(this.storeData.records.values());
			if (req.onsuccess) req.onsuccess();
		});
		return req;
	}

	delete(key: string): { onsuccess: (() => void) | null; onerror: (() => void) | null } {
		const req = { onsuccess: null as (() => void) | null, onerror: null as (() => void) | null };
		this.storeData.records.delete(key);
		queueMicrotask(() => {
			if (req.onsuccess) req.onsuccess();
		});
		return req;
	}
}

class MockIDBDatabase {
	stores = new Map<string, MockStoreData>();
	objectStoreNames = {
		contains: (name: string) => this.stores.has(name),
	};

	createObjectStore(name: string, options?: { keyPath?: string }): { createIndex: (idx: string, field: string) => void } {
		const storeData: MockStoreData = {
			keyPath: options?.keyPath || null,
			indexes: new Map(),
			records: new Map(),
		};
		this.stores.set(name, storeData);
		return {
			createIndex: (idx: string, field: string) => {
				storeData.indexes.set(idx, field);
			},
		};
	}

	transaction(storeNames: string | string[], mode = "readonly"): MockIDBTransaction {
		return new MockIDBTransaction(this, mode);
	}
}

describe("DENTE Offline Media Vault & Background Sync Suite", () => {
	let mockDb: MockIDBDatabase;
	const originalWindow = (globalThis as unknown as { window?: unknown }).window;
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		mockDb = new MockIDBDatabase();
		clearMemoryMediaStorage();
		resetMediaDbConnection();

		(globalThis as unknown as { window: unknown }).window = {
			indexedDB: {
				open: (_name: string, _version: number) => {
					const req = {
						result: mockDb,
						error: null,
						onupgradeneeded: null as (() => void) | null,
						onsuccess: null as (() => void) | null,
						onerror: null as (() => void) | null,
					};
					queueMicrotask(() => {
						if (req.onupgradeneeded) req.onupgradeneeded();
						if (req.onsuccess) req.onsuccess();
					});
					return req;
				},
			},
			dispatchEvent: () => true,
		};
	});

	afterEach(() => {
		(globalThis as unknown as { window: unknown }).window = originalWindow;
		globalThis.fetch = originalFetch;
		clearMemoryMediaStorage();
	});

	// ── 1. Save & Retrieve Media with 200x200 WebP Thumbnail ──────────────────
	test("1. saveMediaToVault: stores intraoral photo, periapical X-ray, and generates 200x200 thumbnail", async () => {
		const sampleJpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
		const patientId = "patient-media-001";
		const toothNumber = 16;

		const saved = await saveMediaToVault({
			patientId,
			toothNumber,
			photoType: "intraoral_photo",
			file: sampleJpegBytes,
			fileName: "tooth_16_occlusal.jpg",
			mimeType: "image/jpeg",
			organizationId: "org-media-1",
		});

		assert.ok(saved.mediaId, "Media must have a valid UUIDv7 ID");
		assert.strictEqual(saved.patientId, patientId);
		assert.strictEqual(saved.toothNumber, 16);
		assert.strictEqual(saved.photoType, "intraoral_photo");
		assert.strictEqual(saved.syncStatus, "pending");
		assert.ok(saved.thumbnailWebpDataUrl.startsWith("data:image/webp"), "Must have a WebP thumbnail DataURL");

		// Retrieve by ID
		const retrieved = await getMediaItemById(saved.mediaId);
		assert.ok(retrieved);
		assert.strictEqual(retrieved?.mediaId, saved.mediaId);
		assert.strictEqual(retrieved?.fileName, "tooth_16_occlusal.jpg");

		// Retrieve binary blob
		const blob = await getMediaOriginalBlob(saved.originalBlobKey);
		assert.ok(blob, "Binary blob must be present in blob store");
	});

	// ── 2. List Media for Patient & Odontogram Tooth Filter ───────────────────
	test("2. listPatientMedia: filters media by patient and tooth number for odontogram cards", async () => {
		const patientId = "patient-media-002";
		const sampleBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

		// Save 2 photos for tooth 36, 1 photo for tooth 46, and 1 panoramic xray
		await saveMediaToVault({
			patientId,
			toothNumber: 36,
			photoType: "intraoral_photo",
			file: sampleBytes,
			fileName: "tooth_36_prep.jpg",
		});

		await saveMediaToVault({
			patientId,
			toothNumber: 36,
			photoType: "periapical_xray",
			file: sampleBytes,
			fileName: "tooth_36_xray.jpg",
		});

		await saveMediaToVault({
			patientId,
			toothNumber: 46,
			photoType: "intraoral_photo",
			file: sampleBytes,
			fileName: "tooth_46_filling.jpg",
		});

		await saveMediaToVault({
			patientId,
			photoType: "panoramic_xray",
			file: sampleBytes,
			fileName: "optg_panoramic.jpg",
		});

		// 1. All media for patient
		const allMedia = await listPatientMedia(patientId);
		assert.strictEqual(allMedia.length, 4);

		// 2. Filtered by tooth 36 (for odontogram card preview)
		const tooth36Media = await listPatientMedia(patientId, 36);
		assert.strictEqual(tooth36Media.length, 2);
		assert.ok(tooth36Media.some((m) => m.photoType === "intraoral_photo"));
		assert.ok(tooth36Media.some((m) => m.photoType === "periapical_xray"));

		// 3. Filtered by tooth 46
		const tooth46Media = await listPatientMedia(patientId, 46);
		assert.strictEqual(tooth46Media.length, 1);
		assert.strictEqual(tooth46Media[0]?.fileName, "tooth_46_filling.jpg");
	});

	// ── 3. Background Upload to Local Clinic Server (Port 4100) ───────────────
	test("3. uploadSingleMediaItem: sends high-res binary to LAN microserver and updates sync status", async () => {
		const patientId = "patient-media-003";
		const sampleBytes = new Uint8Array([1, 2, 3, 4, 5]);

		const saved = await saveMediaToVault({
			patientId,
			toothNumber: 21,
			photoType: "intraoral_photo",
			file: sampleBytes,
			fileName: "tooth_21_veneer.jpg",
		});

		let uploadedUrl = "";
		let receivedFormData = false;

		const mockUploadFetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
			const urlStr = String(url);
			uploadedUrl = urlStr;
			if (init?.body instanceof FormData) {
				receivedFormData = true;
			}
			return new Response(
				JSON.stringify({
					success: true,
					remoteUrl: `http://dente-server.local:4100/media/patients/${patientId}/tooth_21_veneer.jpg`,
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		};

		const uploadResult = await uploadSingleMediaItem(saved.mediaId, {
			targetUploadUrl: "http://dente-server.local:4100/api/media/upload",
			fetchImpl: mockUploadFetch as unknown as typeof fetch,
		});

		assert.strictEqual(uploadResult.success, true);
		assert.strictEqual(
			uploadResult.remoteUrl,
			`http://dente-server.local:4100/media/patients/${patientId}/tooth_21_veneer.jpg`,
		);
		assert.strictEqual(receivedFormData, true);
		assert.strictEqual(uploadedUrl, "http://dente-server.local:4100/api/media/upload");

		// Verify status in vault is updated to "synced"
		const updatedItem = await getMediaItemById(saved.mediaId);
		assert.strictEqual(updatedItem?.syncStatus, "synced");
		assert.strictEqual(updatedItem?.remoteUrl, uploadResult.remoteUrl);
	});

	// ── 4. Drain Media Sync Queue with Batch Processing ──────────────────────
	test("4. drainMediaSyncQueue: drains multiple pending uploads in background", async () => {
		const patientId = "patient-media-004";
		const sampleBytes = new Uint8Array([10, 20, 30]);

		// Save 3 media items
		const m1 = await saveMediaToVault({ patientId, toothNumber: 11, photoType: "intraoral_photo", file: sampleBytes });
		const m2 = await saveMediaToVault({ patientId, toothNumber: 12, photoType: "intraoral_photo", file: sampleBytes });
		const m3 = await saveMediaToVault({ patientId, toothNumber: 13, photoType: "intraoral_photo", file: sampleBytes });

		const pending = await getPendingMediaItems();
		assert.strictEqual(pending.length, 3);

		let uploadedCount = 0;
		const mockBatchFetch = async (): Promise<Response> => {
			uploadedCount++;
			return new Response(
				JSON.stringify({ success: true, remoteUrl: `/media/uploaded_${uploadedCount}.jpg` }),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		};

		const progressEvents: number[] = [];
		const drainRes = await drainMediaSyncQueue({
			batchSize: 2,
			fetchImpl: mockBatchFetch as unknown as typeof fetch,
			onProgress: (p) => progressEvents.push(p.uploaded),
		});

		assert.strictEqual(drainRes.totalQueued, 3);
		assert.strictEqual(drainRes.uploadedCount, 3);
		assert.strictEqual(drainRes.failedCount, 0);
		assert.strictEqual(progressEvents.length, 3);

		const pendingAfter = await getPendingMediaItems();
		assert.strictEqual(pendingAfter.length, 0, "All items must be synced");
	});

	// ── 5. Storage Quota Monitoring & Safe Cache Eviction ─────────────────────
	test("5. evictSyncedMediaCache: safely frees disk space by deleting binary blobs of synced photos while preserving 200x200 thumbnails", async () => {
		const patientId = "patient-media-005";
		const largeBlob = new Uint8Array(1024 * 500); // 500 KB

		const item1 = await saveMediaToVault({ patientId, toothNumber: 14, photoType: "intraoral_photo", file: largeBlob });
		const item2 = await saveMediaToVault({ patientId, toothNumber: 15, photoType: "intraoral_photo", file: largeBlob });

		// Mark item 1 as synced
		await updateMediaSyncStatus(item1.mediaId, "synced", { remoteUrl: "/media/remote_1.jpg" });

		// Initial quota check
		const estimateBefore = await getMediaVaultStorageEstimate();
		assert.strictEqual(estimateBefore.totalMediaCount, 2);
		assert.strictEqual(estimateBefore.syncedCount, 1);
		assert.strictEqual(estimateBefore.pendingCount, 1);

		// Run eviction
		const evictionResult = await evictSyncedMediaCache({ maxAgeDays: 0, targetFreeBytes: 1024 * 1000 });
		assert.strictEqual(evictionResult.evictedCount, 1, "Only synced item 1 should be evicted");
		assert.strictEqual(evictionResult.freedBytes, 1024 * 500);

		// Verify metadata & 200x200 thumbnail remain intact for odontogram card
		const item1After = await getMediaItemById(item1.mediaId);
		assert.ok(item1After);
		assert.strictEqual(item1After?.evictedOriginal, true);
		assert.ok(item1After?.thumbnailWebpDataUrl.startsWith("data:image/webp"), "Thumbnail must be preserved");

		// Verify binary blob was removed
		const blob1After = await getMediaOriginalBlob(item1.originalBlobKey);
		assert.strictEqual(blob1After, null, "Original large binary blob must be freed");

		// Verify unsynced item 2 still has its original binary blob
		const blob2After = await getMediaOriginalBlob(item2.originalBlobKey);
		assert.ok(blob2After, "Pending unsynced binary blob must NOT be evicted");
	});

	// ── 6. WebP Thumbnail Generator Helper ────────────────────────────────────
	test("6. generateWebpThumbnail: returns valid data URI format", async () => {
		const dummyBytes = new Uint8Array([1, 2, 3]);
		const thumb = await generateWebpThumbnail(dummyBytes, "image/jpeg");
		assert.ok(thumb.startsWith("data:image/webp;base64,"), "Thumbnail must be a valid WebP Data URL");
	});
});
