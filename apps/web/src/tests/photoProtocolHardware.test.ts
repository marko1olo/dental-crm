/**
 * DENTE CRM — Offline PWA, Capacitor/Android Photo-Protocol & Hardware Telemetry Test Suite
 *
 * Comprehensive validation for Round 47:
 * 1. Clinical Dental Photo Protocol & Form 043/u Integration (12/8/6/3 slot presets, mirrors, retractors, 043/u statement).
 * 2. Mobile Tablet/Smartphone Camera Ergonomics & Capacitor Bridge (MediaDevices, Touch-targets, Modal Back Stack, Haptics, Audio).
 * 3. Offline IndexedDB Media Vault & Background Sync (High-res Blobs, 200x200 WebP thumbnails, FDI tooth queries, Queue Drain, Safe Eviction).
 * 4. Hardware Telemetry & Barcode Interception (USB HID bursts, GS1 DataMatrix Честный ЗНАК, SanPiN Sterilization, Lab Orders, Waste, Visiograph PACS Watcher).
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

// 1. Photo Protocol Presets & 043/u Form
import {
	STANDARD_12_SLOT_PROTOCOL,
	AESTHETIC_8_SLOT_PROTOCOL,
	EXPRESS_6_SLOT_PROTOCOL,
	MINIMAL_3_SLOT_PROTOCOL,
	CLINICAL_PROTOCOLS_REGISTRY,
	DENTAL_PHOTO_SLOTS,
	getPresetById,
	getSlotDefinitionById,
} from "../components/photography/photoGridPresets";
import {
	generatePhotoProtocolAttachmentsStatement,
	type ClinicalPhotoAttachment,
} from "../lib/clinicalProtocols043";

// 2. Mobile Camera, Tablet Ergonomics & Native Bridge
import {
	scanDataMatrixWithCamera,
	isMobileApp,
	getMobileNativeApi,
	isTabletDevice,
	isMobileSmartphone,
	getDeviceFormFactor,
	CLINICAL_TOUCH_TARGETS,
	validateClinicalActionButtonErgonomics,
	pushModalBackHandler,
	popModalBackHandler,
	handleHardwareBackAction,
	getModalBackStackDepth,
	clearModalBackStack,
	triggerHaptic,
	playClinicalAudioFeedback,
	isClinicalAudioMuted,
	setClinicalAudioMuted,
	parseGs1DataMatrix,
} from "../native/mobileBridge";

// 3. Offline Media Vault & Background Sync
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

// 4. Hardware Barcode & Scanner Telemetry
import {
	UsbBarcodeScanner,
	parseUniversalBarcode,
	parseSanpinBarcode,
	parseLabOrderBarcode,
	parseMedicalWasteBarcode,
	isHardwareScanBurst,
	validateEan13Checksum,
} from "../services/hardware/usbBarcodeScanner";

// 5. Visiograph & PACS Watcher Telemetry
import { VisiographPacsWatcherService } from "../services/hardware/visiographPacsWatcher";

// ─────────────────────────────────────────────────────────────────────────────
// In-Memory Mock IndexedDB Engine for Media Vault
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

describe("Offline PWA, Capacitor Camera & Hardware Telemetry Suite", () => {
	let mockDb: MockIDBDatabase;
	const originalWindow = (globalThis as unknown as { window?: unknown }).window;
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		mockDb = new MockIDBDatabase();
		clearMemoryMediaStorage();
		resetMediaDbConnection();
		clearModalBackStack();

		(globalThis as unknown as { window: unknown }).window = {
			innerWidth: 1024,
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
			addEventListener: () => {},
			removeEventListener: () => {},
		};
	});

	afterEach(() => {
		(globalThis as unknown as { window: unknown }).window = originalWindow;
		globalThis.fetch = originalFetch;
		clearMemoryMediaStorage();
		clearModalBackStack();
	});

	// ═════════════════════════════════════════════════════════════════════════
	// 1. Clinical Photo Protocol Presets & Form 043/u Statement Generation
	// ═════════════════════════════════════════════════════════════════════════
	describe("1. Clinical Photo Protocol & Form 043/u Attachment Statement", () => {
		it("validates Standard 12-Slot Protocol contains all essential extraoral & intraoral views", () => {
			assert.strictEqual(STANDARD_12_SLOT_PROTOCOL.totalSlots, 12);
			assert.strictEqual(STANDARD_12_SLOT_PROTOCOL.categoryCount.extraoral, 6);
			assert.strictEqual(STANDARD_12_SLOT_PROTOCOL.categoryCount.intraoral, 6);

			const extraoralExpected = [
				"portrait_rest",
				"portrait_smile",
				"portrait_smile_wide",
				"profile_90_rest",
				"profile_90_smile",
				"portrait_45_smile",
			];
			const intraoralExpected = [
				"intraoral_frontal_occlusion",
				"intraoral_right_buccal",
				"intraoral_left_buccal",
				"intraoral_maxillary_occlusal",
				"intraoral_mandibular_occlusal",
				"intraoral_overjet",
			];

			for (const id of extraoralExpected) {
				const slot = STANDARD_12_SLOT_PROTOCOL.slots.find((s) => s.id === id);
				assert.ok(slot, `Extraoral slot ${id} must exist in 12-slot protocol`);
				assert.strictEqual(slot.category, "extraoral");
			}

			for (const id of intraoralExpected) {
				const slot = STANDARD_12_SLOT_PROTOCOL.slots.find((s) => s.id === id);
				assert.ok(slot, `Intraoral slot ${id} must exist in 12-slot protocol`);
				assert.strictEqual(slot.category, "intraoral");
			}
		});

		it("verifies specialized protocols (Aesthetic 8-slot, Express 6-slot, Minimal 3-slot)", () => {
			assert.strictEqual(AESTHETIC_8_SLOT_PROTOCOL.totalSlots, 8);
			assert.strictEqual(EXPRESS_6_SLOT_PROTOCOL.totalSlots, 6);
			assert.strictEqual(MINIMAL_3_SLOT_PROTOCOL.totalSlots, 3);

			assert.strictEqual(CLINICAL_PROTOCOLS_REGISTRY.length, 4);
			assert.strictEqual(getPresetById("aesthetic_8_prosthodontic").id, "aesthetic_8_prosthodontic");
			assert.strictEqual(getPresetById("express_6_monitoring").id, "express_6_monitoring");
			assert.strictEqual(getPresetById("minimal_3_therapy").id, "minimal_3_therapy");
			assert.strictEqual(getPresetById("unknown_fallback").id, "standard_12_ortho_aesthetic");
		});

		it("verifies optical mirror and retractor requirements for intraoral occlusal slots", () => {
			const maxOcclusal = DENTAL_PHOTO_SLOTS.intraoral_maxillary_occlusal;
			assert.strictEqual(maxOcclusal.requiresMirror, true);
			assert.strictEqual(maxOcclusal.requiresRetractor, true);
			assert.strictEqual(maxOcclusal.retractorType, "contraster");

			const mandOcclusal = DENTAL_PHOTO_SLOTS.intraoral_mandibular_occlusal;
			assert.strictEqual(mandOcclusal.requiresMirror, true);
			assert.strictEqual(mandOcclusal.requiresRetractor, true);

			const frontalOcclusion = DENTAL_PHOTO_SLOTS.intraoral_frontal_occlusion;
			assert.strictEqual(frontalOcclusion.requiresMirror, false);
			assert.strictEqual(frontalOcclusion.requiresRetractor, true);
			assert.strictEqual(frontalOcclusion.retractorType, "vestibular_clear");

			const portrait = DENTAL_PHOTO_SLOTS.portrait_rest;
			assert.strictEqual(portrait.requiresMirror, false);
			assert.strictEqual(portrait.requiresRetractor, false);
		});

		it("formats structured photo attachments statement for Medical Record Form 043/u", () => {
			const photos: ClinicalPhotoAttachment[] = [
				{
					id: "p1",
					toothNumber: 16,
					photoType: "before",
					photoUrl: "blob://photo1",
					description: "Глубокий кариес окклюзионной поверхности",
					capturedAtIso: "2026-08-25T10:30:00.000Z",
				},
				{
					id: "p2",
					toothNumber: 16,
					photoType: "process",
					photoUrl: "blob://photo2",
					description: "Изоляция коффердамом, некрэктомия",
					capturedAtIso: "2026-08-25T10:45:00.000Z",
				},
				{
					id: "p3",
					toothNumber: 16,
					photoType: "after",
					photoUrl: "blob://photo3",
					description: "Анатомическая реставрация Estelite Asteria A2/Occlusal",
					capturedAtIso: "2026-08-25T11:15:00.000Z",
				},
			];

			const statement = generatePhotoProtocolAttachmentsStatement(photos);
			assert.ok(statement.includes("ВЕДОМОСТЬ ФОТОПРОТОКОЛА И ПРИЛОЖЕНИЙ (Форма 043/у)"));
			assert.ok(statement.includes("1. [Зуб 16] Исходная ситуация (До лечения) (Глубокий кариес окклюзионной поверхности)"));
			assert.ok(statement.includes("2. [Зуб 16] Этап лечения (Изоляция / Препарирование / Обтурация) (Изоляция коффердамом, некрэктомия)"));
			assert.ok(statement.includes("3. [Зуб 16] Финальный результат (После лечения) (Анатомическая реставрация Estelite Asteria A2/Occlusal)"));

			// Empty list returns empty string
			assert.strictEqual(generatePhotoProtocolAttachmentsStatement([]), "");
		});
	});

	// ═════════════════════════════════════════════════════════════════════════
	// 2. Mobile Tablet Camera Ergonomics & Capacitor Native Bridge
	// ═════════════════════════════════════════════════════════════════════════
	describe("2. Mobile Tablet Camera & Capacitor Bridge Ergonomics", () => {
		it("detects device form factor: Doctor Tablet vs Mobile Phone vs Desktop", () => {
			(globalThis as unknown as { window: { innerWidth: number } }).window = { innerWidth: 1024 };
			assert.strictEqual(isTabletDevice(), true);
			assert.strictEqual(isMobileSmartphone(), false);
			assert.strictEqual(getDeviceFormFactor(), "tablet");

			(globalThis as unknown as { window: { innerWidth: number } }).window = { innerWidth: 375 };
			assert.strictEqual(isTabletDevice(), false);
			assert.strictEqual(isMobileSmartphone(), true);
			assert.strictEqual(getDeviceFormFactor(), "phone");

			(globalThis as unknown as { window: { innerWidth: number } }).window = { innerWidth: 1600 };
			assert.strictEqual(isTabletDevice(), false);
			assert.strictEqual(isMobileSmartphone(), false);
			assert.strictEqual(getDeviceFormFactor(), "desktop");
		});

		it("enforces glove-friendly clinical touch targets (>= 48px height, >= 14px text, Russian labels)", () => {
			assert.strictEqual(CLINICAL_TOUCH_TARGETS.PRIMARY_ACTION_MIN_HEIGHT_PX, 48);
			assert.strictEqual(CLINICAL_TOUCH_TARGETS.PRIMARY_ACTION_FONT_SIZE_PX, 14);
			assert.strictEqual(CLINICAL_TOUCH_TARGETS.TOOTH_FORMULA_MIN_HEIGHT_PX, 140);

			// Valid clinical button
			const validBtn = validateClinicalActionButtonErgonomics({
				heightPx: 52,
				fontSizePx: 14,
				hasVisibleRussianLabel: true,
			});
			assert.strictEqual(validBtn.isValid, true);
			assert.strictEqual(validBtn.issues.length, 0);

			// Non-compliant button (too small, isolated icon without text)
			const invalidBtn = validateClinicalActionButtonErgonomics({
				heightPx: 36,
				fontSizePx: 12,
				hasVisibleRussianLabel: false,
			});
			assert.strictEqual(invalidBtn.isValid, false);
			assert.strictEqual(invalidBtn.issues.length, 3);
			assert.ok(invalidBtn.issues[0]?.includes("Высота кнопки"));
			assert.ok(invalidBtn.issues[1]?.includes("Размер шрифта"));
			assert.ok(invalidBtn.issues[2]?.includes("Запрет на изолированные иконки"));
		});

		it("provides LIFO Modal Back Stack for Android hardware / gesture back button navigation", () => {
			let modal1Closed = false;
			let modal2Closed = false;

			const unreg1 = pushModalBackHandler("photo-protocol-modal", () => {
				modal1Closed = true;
			}, 10);

			const unreg2 = pushModalBackHandler("photo-calibration-drawer", () => {
				modal2Closed = true;
			}, 20); // Higher priority (top child drawer)

			assert.strictEqual(getModalBackStackDepth(), 2);

			// First hardware back closes top drawer (modal2)
			const handledFirst = handleHardwareBackAction();
			assert.strictEqual(handledFirst, true);
			assert.strictEqual(modal2Closed, true);
			assert.strictEqual(modal1Closed, false);
			assert.strictEqual(getModalBackStackDepth(), 1);

			// Second hardware back closes parent modal (modal1)
			const handledSecond = handleHardwareBackAction();
			assert.strictEqual(handledSecond, true);
			assert.strictEqual(modal1Closed, true);
			assert.strictEqual(getModalBackStackDepth(), 0);

			// Empty stack returns false (allowing OS app minimization)
			const handledThird = handleHardwareBackAction();
			assert.strictEqual(handledThird, false);

			unreg1();
			unreg2();
		});

		it("handles camera barcode scan fallback gracefully when Capacitor bridge is not present", async () => {
			const res = await scanDataMatrixWithCamera();
			assert.strictEqual(res.success, false);
			assert.ok(res.error?.includes("Android (.apk)") || res.error?.includes("сканер"));
		});

		it("synthesizes soft clinical audio cues without throwing in muted or active states", () => {
			setClinicalAudioMuted(false);
			assert.strictEqual(isClinicalAudioMuted(), false);

			// Mute toggle
			setClinicalAudioMuted(true);
			assert.strictEqual(isClinicalAudioMuted(), true);
			const playedWhileMuted = playClinicalAudioFeedback("scan_success");
			assert.strictEqual(playedWhileMuted, false);

			setClinicalAudioMuted(false);
		});
	});

	// ═════════════════════════════════════════════════════════════════════════
	// 3. Offline IndexedDB Media Vault & Background Sync
	// ═════════════════════════════════════════════════════════════════════════
	describe("3. Offline IndexedDB Media Vault & Background Synchronization", () => {
		it("stores intraoral macro photos, X-rays, and generates 200x200 WebP preview for odontogram", async () => {
			const samplePhotoBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
			const patientId = "pat-test-photo-001";
			const toothNumber = 26;

			const saved = await saveMediaToVault({
				patientId,
				toothNumber,
				photoType: "intraoral_photo",
				file: samplePhotoBytes,
				fileName: "tooth_26_macro_occlusal.jpg",
				mimeType: "image/jpeg",
				organizationId: "org-dent-1",
			});

			assert.ok(saved.mediaId, "Must assign valid UUIDv7 mediaId");
			assert.strictEqual(saved.patientId, patientId);
			assert.strictEqual(saved.toothNumber, 26);
			assert.strictEqual(saved.photoType, "intraoral_photo");
			assert.strictEqual(saved.syncStatus, "pending");
			assert.ok(saved.thumbnailWebpDataUrl.startsWith("data:image/webp"), "Must generate WebP thumbnail");

			// Query by mediaId
			const fetched = await getMediaItemById(saved.mediaId);
			assert.ok(fetched);
			assert.strictEqual(fetched?.fileName, "tooth_26_macro_occlusal.jpg");

			// Query binary blob
			const blob = await getMediaOriginalBlob(saved.originalBlobKey);
			assert.ok(blob);
		});

		it("filters patient media by FDI tooth number for instant odontogram card display", async () => {
			const patientId = "pat-test-photo-002";
			const sampleBytes = new Uint8Array([1, 2, 3, 4]);

			await saveMediaToVault({ patientId, toothNumber: 11, photoType: "intraoral_photo", file: sampleBytes });
			await saveMediaToVault({ patientId, toothNumber: 11, photoType: "periapical_xray", file: sampleBytes });
			await saveMediaToVault({ patientId, toothNumber: 46, photoType: "intraoral_photo", file: sampleBytes });
			await saveMediaToVault({ patientId, photoType: "panoramic_xray", file: sampleBytes });

			const allMedia = await listPatientMedia(patientId);
			assert.strictEqual(allMedia.length, 4);

			const tooth11Media = await listPatientMedia(patientId, 11);
			assert.strictEqual(tooth11Media.length, 2);

			const tooth46Media = await listPatientMedia(patientId, 46);
			assert.strictEqual(tooth46Media.length, 1);
		});

		it("drains media sync queue in background with batch processing and status updates", async () => {
			const patientId = "pat-test-photo-003";
			const sampleBytes = new Uint8Array([5, 6, 7, 8]);

			await saveMediaToVault({ patientId, toothNumber: 36, photoType: "intraoral_photo", file: sampleBytes });
			await saveMediaToVault({ patientId, toothNumber: 37, photoType: "intraoral_photo", file: sampleBytes });

			const pendingBefore = await getPendingMediaItems();
			assert.strictEqual(pendingBefore.length, 2);

			let uploadsPerformed = 0;
			const mockUploadFetch = async (): Promise<Response> => {
				uploadsPerformed++;
				return new Response(
					JSON.stringify({ success: true, remoteUrl: `/uploads/synced_${uploadsPerformed}.jpg` }),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			};

			const drainResult = await drainMediaSyncQueue({
				batchSize: 2,
				fetchImpl: mockUploadFetch as unknown as typeof fetch,
			});

			assert.strictEqual(drainResult.totalQueued, 2);
			assert.strictEqual(drainResult.uploadedCount, 2);
			assert.strictEqual(drainResult.failedCount, 0);

			const pendingAfter = await getPendingMediaItems();
			assert.strictEqual(pendingAfter.length, 0);
		});

		it("safely evicts synced original high-res Blobs while preserving thumbnails & 043/u metadata", async () => {
			const patientId = "pat-test-photo-004";
			const largeBlob = new Uint8Array(1024 * 100); // 100 KB

			const item1 = await saveMediaToVault({ patientId, toothNumber: 21, photoType: "intraoral_photo", file: largeBlob });
			const item2 = await saveMediaToVault({ patientId, toothNumber: 22, photoType: "intraoral_photo", file: largeBlob });

			// Mark item 1 as synced
			await updateMediaSyncStatus(item1.mediaId, "synced", { remoteUrl: "/media/21.jpg" });

			const quotaBefore = await getMediaVaultStorageEstimate();
			assert.strictEqual(quotaBefore.totalMediaCount, 2);
			assert.strictEqual(quotaBefore.syncedCount, 1);
			assert.strictEqual(quotaBefore.pendingCount, 1);

			// Evict cache
			const eviction = await evictSyncedMediaCache({ maxAgeDays: 0, targetFreeBytes: 1024 * 500 });
			assert.strictEqual(eviction.evictedCount, 1);
			assert.strictEqual(eviction.freedBytes, 1024 * 100);

			// Verify metadata & thumbnail remain intact
			const item1After = await getMediaItemById(item1.mediaId);
			assert.ok(item1After);
			assert.strictEqual(item1After?.evictedOriginal, true);
			assert.ok(item1After?.thumbnailWebpDataUrl.startsWith("data:image/webp"));

			// Verify binary blob was deleted
			const blob1After = await getMediaOriginalBlob(item1.originalBlobKey);
			assert.strictEqual(blob1After, null);

			// Verify unsynced item 2 still retains original binary blob
			const blob2After = await getMediaOriginalBlob(item2.originalBlobKey);
			assert.ok(blob2After);
		});
	});

	// ═════════════════════════════════════════════════════════════════════════
	// 4. Hardware Telemetry & Barcode / Radiography Interception
	// ═════════════════════════════════════════════════════════════════════════
	describe("4. Hardware Telemetry & Barcode / PACS Interception", () => {
		it("detects rapid hardware scanner keystroke bursts (< 35ms) vs human manual typing", () => {
			const now = 1000000;
			// Fast burst: 15ms interval
			const hardwareBurst = [
				{ key: "0", timestamp: now },
				{ key: "1", timestamp: now + 15 },
				{ key: "0", timestamp: now + 30 },
				{ key: "4", timestamp: now + 45 },
				{ key: "6", timestamp: now + 60 },
			];
			assert.strictEqual(isHardwareScanBurst(hardwareBurst, 35, 3), true);

			// Slow typing: 150ms interval (human typing)
			const humanTyping = [
				{ key: "0", timestamp: now },
				{ key: "1", timestamp: now + 150 },
				{ key: "0", timestamp: now + 300 },
			];
			assert.strictEqual(isHardwareScanBurst(humanTyping, 35, 3), false);
		});

		it("parses GS1 DataMatrix (Честный ЗНАК / МДЛП / 86-ФЗ) barcodes with GTIN & Crypto Signature", () => {
			// Standard MDLP format with FNC1: (01)GTIN(21)Serial(91)Key(92)Crypto
			const mdlpCode = "010460123456789021abcd123456\u001d91EE06\u001d92abcdefghijklmnopqrstuvwxyz0123456789ABCDEF";
			const parsed = parseUniversalBarcode(mdlpCode);

			assert.strictEqual(parsed.classification, "gs1_datamatrix");
			assert.strictEqual(parsed.isValid, true);
			assert.ok(parsed.gs1);
			assert.strictEqual(parsed.gs1?.gtin, "04601234567890");
			assert.strictEqual(parsed.gs1?.serialNumber, "abcd123456");
			assert.strictEqual(parsed.gs1?.cryptoKey, "EE06");
			assert.strictEqual(parsed.gs1?.cryptoSignature, "abcdefghijklmnopqrstuvwxyz0123456789ABCDEF");
		});

		it("parses SanPiN 3.3686-21 sterilization package barcodes (autoclave ID, cycle, pack/exp date)", () => {
			const sanpin2D = "BATCH-042#15|MELAG-PRO|CYC108|2026-08-20|2026-09-20|DR-SMIRNOVA|KIT-SURGERY-1";
			const parsed = parseUniversalBarcode(sanpin2D);

			assert.strictEqual(parsed.classification, "sanpin_sterilization");
			assert.strictEqual(parsed.isValid, true);
			assert.ok(parsed.sanpin);
			assert.strictEqual(parsed.sanpin?.batchId, "BATCH-042");
			assert.strictEqual(parsed.sanpin?.serialNumber, 15);
			assert.strictEqual(parsed.sanpin?.autoclaveId, "MELAG-PRO");
			assert.strictEqual(parsed.sanpin?.cycleNumber, 108);
			assert.strictEqual(parsed.sanpin?.packDate, "2026-08-20");
			assert.strictEqual(parsed.sanpin?.expDate, "2026-09-20");
			assert.strictEqual(parsed.sanpin?.operatorId, "DR-SMIRNOVA");
			assert.strictEqual(parsed.sanpin?.toolSetId, "KIT-SURGERY-1");
			assert.strictEqual(parsed.sanpin?.isExpired, false);

			// 1D SanPiN Barcode format
			const sanpin1D = "SANPIN-MELAG01-042-20260822-001";
			const parsed1D = parseSanpinBarcode(sanpin1D);
			assert.ok(parsed1D);
			assert.strictEqual(parsed1D?.autoclaveId, "MELAG01");
			assert.strictEqual(parsed1D?.cycleNumber, 42);
			assert.strictEqual(parsed1D?.serialNumber, 1);
		});

		it("parses Dental Lab work orders and SanPiN medical waste barcodes", () => {
			// Lab Order
			const labCode = "LAB-ORTHO-PAT9421";
			const parsedLab = parseUniversalBarcode(labCode);
			assert.strictEqual(parsedLab.classification, "lab_order");
			assert.strictEqual(parsedLab.isValid, true);
			assert.strictEqual(parsedLab.labOrder?.orderNumber, "LAB-ORTHO-PAT9421");
			assert.strictEqual(parsedLab.labOrder?.labId, "LAB-ORTHO");
			assert.strictEqual(parsedLab.labOrder?.patientId, "PAT-PAT9421");

			// Medical Waste Class B
			const wasteCode = "WASTE-B-BAG9042-2.5";
			const parsedWaste = parseUniversalBarcode(wasteCode);
			assert.strictEqual(parsedWaste.classification, "medical_waste");
			assert.strictEqual(parsedWaste.isValid, true);
			assert.strictEqual(parsedWaste.medicalWaste?.wasteClass, "B");
			assert.strictEqual(parsedWaste.medicalWaste?.bagSerialNumber, "BAG9042");
			assert.strictEqual(parsedWaste.medicalWaste?.weightKg, 2.5);
		});

		it("validates 1D EAN-13 check digit algorithm", () => {
			assert.strictEqual(validateEan13Checksum("4601234567893"), true);
			assert.strictEqual(validateEan13Checksum("4601234567890"), false); // Wrong check digit
			assert.strictEqual(validateEan13Checksum("123"), false); // Too short
		});

		it("emulates USB HID barcode scanner key-by-key processing", () => {
			const scanner = new UsbBarcodeScanner({ maxInterKeyDelayMs: 35, minBarcodeLength: 3 });
			let receivedEvent: unknown = null;
			scanner.onScan((evt) => {
				receivedEvent = evt;
			});

			const startTime = 1000000;
			const code = "SANPIN-MELAG01-015-20260825-003";

			for (let i = 0; i < code.length; i++) {
				scanner.processKey(code[i]!, startTime + i * 10);
			}

			// Press Enter to complete hardware scan burst
			const completed = scanner.processKey("Enter", startTime + code.length * 10 + 5);
			assert.ok(completed);
			assert.strictEqual(completed?.rawCode, code);
			assert.strictEqual(completed?.data.classification, "sanpin_sterilization");
			assert.ok(receivedEvent);
		});

		it("extracts tooth code, modality and diagnostic window from incoming visiograph filenames", () => {
			// Tooth 16 intraoral X-ray
			const meta1 = VisiographPacsWatcherService.parseScanMetadata("pat-10293_tooth_16_periapical.dcm");
			assert.strictEqual(meta1.toothCode, "16");
			assert.strictEqual(meta1.patientId, "pat-10293");
			assert.strictEqual(meta1.modality, "IO");
			assert.strictEqual(meta1.windowCenter, 500); // Endodontics window
			assert.strictEqual(meta1.windowWidth, 2000);

			// OPTG Panoramic scan
			const meta2 = VisiographPacsWatcherService.parseScanMetadata("pat_8492_panoramic_optg.jpg");
			assert.strictEqual(meta2.patientId, "pat_8492");
			assert.strictEqual(meta2.modality, "PX");
			assert.strictEqual(meta2.windowCenter, 300); // Bone window
			assert.strictEqual(meta2.windowWidth, 1500);

			// DICOM Part 10 preamble verification (128 bytes preamble + 'DICM')
			const dicomHeader = new Uint8Array(132);
			dicomHeader[128] = "D".charCodeAt(0);
			dicomHeader[129] = "I".charCodeAt(0);
			dicomHeader[130] = "C".charCodeAt(0);
			dicomHeader[131] = "M".charCodeAt(0);

			const preamble = VisiographPacsWatcherService.parseDicomHeaderPreamble(dicomHeader);
			assert.strictEqual(preamble.isStandardDicom, true);
			assert.strictEqual(preamble.hasMagicPrefix, true);
			assert.strictEqual(preamble.detectedPreambleLength, 132);
		});

		it("dispatches radiography scan events with automatic patient binding and history buffering", () => {
			VisiographPacsWatcherService.clearRecentScans();
			VisiographPacsWatcherService.bindToActivePatient("patient-active-043", "visit-active-999");

			let receivedScanEvent: unknown = null;
			const unsub = VisiographPacsWatcherService.onNewScanDetected((evt) => {
				receivedScanEvent = evt;
			});

			const dispatched = VisiographPacsWatcherService.dispatchScanEvent({
				filePath: "C:\\DentalImages\\Incoming\\tooth_46_root_apex.dcm",
				fileName: "tooth_46_root_apex.dcm",
				fileSize: 1024 * 768,
			});

			assert.strictEqual(dispatched.patientId, "patient-active-043");
			assert.strictEqual(dispatched.toothCode, "46");
			assert.strictEqual(dispatched.modality, "IO");
			assert.strictEqual(dispatched.previewReady, true);
			assert.ok(dispatched.thumbnailDataUri?.startsWith("data:image/png;base64,"));
			assert.ok(receivedScanEvent);

			const history = VisiographPacsWatcherService.getRecentScans();
			assert.strictEqual(history.length, 1);
			assert.strictEqual(history[0]?.fileName, "tooth_46_root_apex.dcm");

			unsub();
		});
	});
});
