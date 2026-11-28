/**
 * DENTE CRM — Offline Media Vault (IndexedDB Blob & Thumbnail Storage)
 *
 * Хранилище интраоральных фото, прицельных рентгеновских снимков и КТ-срезов:
 * - Сохранение полноразмерных снимков в IndexedDB Blob/ArrayBuffer
 * - Быстрая генерация WebP превью (thumbnail 200x200) для мгновенного рендеринга в карточке зуба одонтограммы
 * - Мониторинг дисковой квоты и безопасное освобождение кэша (eviction) синхронизированных оригиналов
 * - Отказоустойчивость и работа без подключения к сети
 */

import { generateUuidV7 } from "@dental/shared";
import {
	MEDIA_BLOBS_STORE_NAME,
	MEDIA_ITEMS_STORE_NAME,
	OFFLINE_DB_NAME,
	OFFLINE_DB_VERSION,
} from "../offline/storage/constants";
import {
	isIndexedDbAvailable,
	openOfflineOutboxDb,
	resetOfflineDbConnection,
} from "../offline/storage/idbDatabase";
import { logger } from "../../utils/logger";

export type MediaPhotoType =
	| "intraoral_photo"
	| "periapical_xray"
	| "panoramic_xray"
	| "face_photo"
	| "computed_tomography_slice"
	| "generic_clinical_media";

export type MediaSyncStatus = "pending" | "syncing" | "synced" | "failed";

export interface StoredMediaItem {
	mediaId: string;
	patientId: string;
	visitId?: string | undefined;
	toothNumber?: number | undefined;
	photoType: MediaPhotoType;
	capturedAt: string;
	capturedAtMs: number;
	mimeType: string;
	fileName: string;
	sizeBytes: number;
	width?: number | undefined;
	height?: number | undefined;
	thumbnailWebpDataUrl: string; // 200x200 WebP thumbnail for odontogram card
	originalBlobKey: string;
	syncStatus: MediaSyncStatus;
	syncRetries: number;
	lastSyncAttempt?: string | undefined;
	remoteUrl?: string | undefined;
	organizationId?: string | undefined;
	evictedOriginal?: boolean | undefined;
}

export interface SaveMediaInput {
	patientId: string;
	visitId?: string | undefined;
	toothNumber?: number | undefined;
	photoType: MediaPhotoType;
	file: Blob | File | ArrayBuffer | Uint8Array;
	fileName?: string | undefined;
	mimeType?: string | undefined;
	organizationId?: string | undefined;
	width?: number | undefined;
	height?: number | undefined;
}

export interface MediaVaultQuotaInfo {
	usageBytes: number;
	quotaBytes: number;
	usagePercent: number;
	totalMediaCount: number;
	syncedCount: number;
	pendingCount: number;
}

export const MEDIA_VAULT_DB_NAME = OFFLINE_DB_NAME;
export const MEDIA_VAULT_DB_VERSION = OFFLINE_DB_VERSION;
export const MEDIA_ITEMS_STORE = MEDIA_ITEMS_STORE_NAME;
export const MEDIA_BLOBS_STORE = MEDIA_BLOBS_STORE_NAME;

const MAX_MEMORY_MEDIA_ITEMS = 150;
const MAX_MEMORY_MEDIA_BLOBS = 32;

// Bounded in-memory / fallback storage for test / private browsing environments
const memoryMediaItems = new Map<string, StoredMediaItem>();
const memoryMediaBlobs = new Map<string, Blob | ArrayBuffer>();

function setBoundedMediaMap<V>(map: Map<string, V>, key: string, value: V, maxEntries: number): void {
	if (map.has(key)) {
		map.delete(key);
	} else if (map.size >= maxEntries) {
		const oldest = map.keys().next().value;
		if (oldest !== undefined) map.delete(oldest);
	}
	map.set(key, value);
}

export function resetMediaDbConnection(): void {
	resetOfflineDbConnection(false);
}

export function clearMemoryMediaStorage(): void {
	memoryMediaItems.clear();
	memoryMediaBlobs.clear();
	resetMediaDbConnection();
}

/**
 * Проверка доступности IndexedDB
 */
export function isMediaIndexedDbAvailable(): boolean {
	return isIndexedDbAvailable();
}

/**
 * Открытие единой базы данных медиа-хранилища (dente-crm-offline-outbox)
 */
export function openMediaVaultDb(): Promise<IDBDatabase> {
	if (!isMediaIndexedDbAvailable()) {
		return Promise.reject(
			new Error("IndexedDB is not available for Media Vault"),
		);
	}
	return openOfflineOutboxDb();
}

/**
 * Быстрая генерация WebP превью 200x200
 */
export async function generateWebpThumbnail(
	fileData: Blob | File | ArrayBuffer | Uint8Array,
	mimeType = "image/jpeg",
): Promise<string> {
	// 1. Browser environment with Canvas support
	if (
		typeof window !== "undefined" &&
		typeof document !== "undefined" &&
		typeof document.createElement === "function"
	) {
		try {
			let blob: Blob;
			if (fileData instanceof Blob) {
				blob = fileData;
			} else if (fileData instanceof ArrayBuffer) {
				blob = new Blob([fileData], { type: mimeType });
			} else {
				const copy = new Uint8Array(fileData.byteLength);
				copy.set(fileData);
				blob = new Blob([copy], { type: mimeType });
			}

			// In browser with createImageBitmap support
			if (typeof createImageBitmap === "function") {
				const bitmap = await createImageBitmap(blob);
				const canvas = document.createElement("canvas");
				const targetSize = 200;

				let targetWidth = targetSize;
				let targetHeight = targetSize;
				if (bitmap.width > bitmap.height) {
					targetHeight = Math.round((bitmap.height / bitmap.width) * targetSize);
				} else if (bitmap.height > 0) {
					targetWidth = Math.round((bitmap.width / bitmap.height) * targetSize);
				}

				canvas.width = Math.max(1, targetWidth);
				canvas.height = Math.max(1, targetHeight);

				const ctx = canvas.getContext("2d");
				if (ctx) {
					ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
					const dataUrl = canvas.toDataURL("image/webp", 0.8);
					bitmap.close();
					if (dataUrl && dataUrl.startsWith("data:image/")) {
						return dataUrl;
					}
				}
				bitmap.close();
			}
		} catch (err) {
			logger.warn("[OfflineMediaVault] Canvas thumbnail generation fallback", err);
		}
	}

	// 2. Headless / Node test environment fallback (deterministic 200x200 WebP base64 placeholder)
	return `data:image/webp;base64,UklGRmQAAABXRUJQVlA4IFgAAADwAQCdASoyADIAPtFUo0ynJCQjI/AKCwBQCU2b2AAA/v1z/8A/0QAAAAA=`;
}

/**
 * Сохранение медиафайла в хранилище
 */
export async function saveMediaToVault(
	input: SaveMediaInput,
): Promise<StoredMediaItem> {
	const mediaId = generateUuidV7();
	const now = new Date();
	const nowIso = now.toISOString();
	const nowMs = now.getTime();

	const mimeType =
		input.mimeType ||
		(input.file instanceof Blob ? input.file.type : "image/jpeg") ||
		"image/jpeg";

	const fileName =
		input.fileName ||
		(input.file instanceof File
			? input.file.name
			: `photo_${input.toothNumber ? `tooth_${input.toothNumber}_` : ""}${nowMs}.jpg`);

	const sizeBytes =
		input.file instanceof Blob
			? input.file.size
			: input.file instanceof ArrayBuffer
				? input.file.byteLength
				: input.file.byteLength;

	const originalBlobKey = `blob_${mediaId}`;

	// Генерация 200x200 превью
	const thumbnailWebpDataUrl = await generateWebpThumbnail(input.file, mimeType);

	const item: StoredMediaItem = {
		mediaId,
		patientId: input.patientId,
		visitId: input.visitId,
		toothNumber: input.toothNumber,
		photoType: input.photoType,
		capturedAt: nowIso,
		capturedAtMs: nowMs,
		mimeType,
		fileName,
		sizeBytes,
		width: input.width,
		height: input.height,
		thumbnailWebpDataUrl,
		originalBlobKey,
		syncStatus: "pending",
		syncRetries: 0,
		organizationId: input.organizationId,
		evictedOriginal: false,
	};

	// 1. Попытка записи в IndexedDB
	try {
		const db = await openMediaVaultDb();
		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction(
				[MEDIA_ITEMS_STORE, MEDIA_BLOBS_STORE],
				"readwrite",
			);
			tx.onerror = () => reject(tx.error);
			tx.oncomplete = () => resolve();

			const itemStore = tx.objectStore(MEDIA_ITEMS_STORE);
			const blobStore = tx.objectStore(MEDIA_BLOBS_STORE);

			itemStore.put(item);
			blobStore.put(input.file, originalBlobKey);
		});

		return item;
	} catch (err) {
		logger.warn(
			`[OfflineMediaVault] IDB write failed for ${mediaId}, using memory cache`,
			err,
		);
		setBoundedMediaMap(memoryMediaItems, mediaId, item, MAX_MEMORY_MEDIA_ITEMS);
		let blobOrBuffer: Blob | ArrayBuffer;
		if (input.file instanceof Blob || input.file instanceof ArrayBuffer) {
			blobOrBuffer = input.file;
		} else {
			const u8 = input.file;
			blobOrBuffer = u8.buffer.slice(
				u8.byteOffset,
				u8.byteOffset + u8.byteLength,
			) as ArrayBuffer;
		}
		setBoundedMediaMap(memoryMediaBlobs, originalBlobKey, blobOrBuffer, MAX_MEMORY_MEDIA_BLOBS);
		return item;
	}
}

/**
 * Получение элемента медиа по ID
 */
export async function getMediaItemById(
	mediaId: string,
): Promise<StoredMediaItem | null> {
	try {
		const db = await openMediaVaultDb();
		return await new Promise<StoredMediaItem | null>((resolve, reject) => {
			const tx = db.transaction(MEDIA_ITEMS_STORE, "readonly");
			tx.onerror = () => reject(tx.error);
			const store = tx.objectStore(MEDIA_ITEMS_STORE);
			const req = store.get(mediaId);
			req.onsuccess = () => resolve(req.result || null);
			req.onerror = () => reject(req.error);
		});
	} catch (err: unknown) {
		logger.warn(`[OfflineMediaVault] getMediaItemById IDB read failed for ${mediaId}:`, err);
		return memoryMediaItems.get(mediaId) || null;
	}
}

/**
 * Получение оригинального бинарного Blob/ArrayBuffer
 */
export async function getMediaOriginalBlob(
	originalBlobKey: string,
): Promise<Blob | ArrayBuffer | null> {
	try {
		const db = await openMediaVaultDb();
		return await new Promise<Blob | ArrayBuffer | null>((resolve, reject) => {
			const tx = db.transaction(MEDIA_BLOBS_STORE, "readonly");
			tx.onerror = () => reject(tx.error);
			const store = tx.objectStore(MEDIA_BLOBS_STORE);
			const req = store.get(originalBlobKey);
			req.onsuccess = () => resolve(req.result || null);
			req.onerror = () => reject(req.error);
		});
	} catch (err: unknown) {
		logger.warn(`[OfflineMediaVault] getMediaOriginalBlob IDB read failed for ${originalBlobKey}:`, err);
		return memoryMediaBlobs.get(originalBlobKey) || null;
	}
}

/**
 * Получение медиа-файлов пациента (с возможностью фильтра по номеру зуба)
 */
export async function listPatientMedia(
	patientId: string,
	toothNumber?: number,
): Promise<StoredMediaItem[]> {
	try {
		const db = await openMediaVaultDb();
		const allItems = await new Promise<StoredMediaItem[]>((resolve, reject) => {
			const tx = db.transaction(MEDIA_ITEMS_STORE, "readonly");
			tx.onerror = () => reject(tx.error);
			const store = tx.objectStore(MEDIA_ITEMS_STORE);
			const index = store.index("patientId");
			const req = index.getAll(patientId);
			req.onsuccess = () => resolve(req.result || []);
			req.onerror = () => reject(req.error);
		});

		if (toothNumber !== undefined) {
			return allItems.filter((item) => item.toothNumber === toothNumber);
		}
		return allItems.sort((a, b) => b.capturedAtMs - a.capturedAtMs);
	} catch (err: unknown) {
		logger.warn(`[OfflineMediaVault] listPatientMedia IDB read failed for ${patientId}:`, err);
		const items = Array.from(memoryMediaItems.values()).filter(
			(item) => item.patientId === patientId,
		);
		if (toothNumber !== undefined) {
			return items.filter((item) => item.toothNumber === toothNumber);
		}
		return items.sort((a, b) => b.capturedAtMs - a.capturedAtMs);
	}
}

/**
 * Обновление статуса синхронизации медиафайла
 */
export async function updateMediaSyncStatus(
	mediaId: string,
	status: MediaSyncStatus,
	options: {
		remoteUrl?: string | undefined;
		error?: string | undefined;
	} = {},
): Promise<StoredMediaItem | null> {
	const item = await getMediaItemById(mediaId);
	if (!item) return null;

	item.syncStatus = status;
	item.lastSyncAttempt = new Date().toISOString();
	if (options.remoteUrl) item.remoteUrl = options.remoteUrl;
	if (status === "failed") item.syncRetries += 1;

	try {
		const db = await openMediaVaultDb();
		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction(MEDIA_ITEMS_STORE, "readwrite");
			tx.onerror = () => reject(tx.error);
			tx.oncomplete = () => resolve();
			tx.objectStore(MEDIA_ITEMS_STORE).put(item);
		});
	} catch (err: unknown) {
		logger.warn(`[OfflineMediaVault] updateMediaSyncStatus IDB write failed for ${mediaId}:`, err);
		setBoundedMediaMap(memoryMediaItems, mediaId, item, MAX_MEMORY_MEDIA_ITEMS);
	}

	return item;
}

/**
 * Оценка дискового пространства и квоты медиа-хранилища
 */
export async function getMediaVaultStorageEstimate(): Promise<MediaVaultQuotaInfo> {
	let usageBytes = 0;
	let quotaBytes = 1024 * 1024 * 1024; // 1 GB fallback
	let totalMediaCount = 0;
	let syncedCount = 0;
	let pendingCount = 0;

	if (
		typeof navigator !== "undefined" &&
		navigator.storage &&
		typeof navigator.storage.estimate === "function"
	) {
		try {
			const est = await navigator.storage.estimate();
			if (typeof est.usage === "number") usageBytes = est.usage;
			if (typeof est.quota === "number") quotaBytes = est.quota;
		} catch (err) {
			logger.warn("[OfflineMediaVault] Storage estimate error", err);
		}
	}

	try {
		const db = await openMediaVaultDb();
		const items = await new Promise<StoredMediaItem[]>((resolve, reject) => {
			const tx = db.transaction(MEDIA_ITEMS_STORE, "readonly");
			tx.onerror = () => reject(tx.error);
			const req = tx.objectStore(MEDIA_ITEMS_STORE).getAll();
			req.onsuccess = () => resolve(req.result || []);
			req.onerror = () => reject(req.error);
		});

		totalMediaCount = items.length;
		for (const it of items) {
			if (it.syncStatus === "synced") syncedCount++;
			else if (it.syncStatus === "pending") pendingCount++;
			if (!usageBytes) usageBytes += it.sizeBytes;
		}
	} catch (err: unknown) {
		logger.warn("[OfflineMediaVault] getMediaVaultStorageEstimate IDB read failed:", err);
		const items = Array.from(memoryMediaItems.values());
		totalMediaCount = items.length;
		for (const it of items) {
			if (it.syncStatus === "synced") syncedCount++;
			else if (it.syncStatus === "pending") pendingCount++;
			usageBytes += it.sizeBytes;
		}
	}

	const usagePercent = quotaBytes > 0 ? (usageBytes / quotaBytes) * 100 : 0;

	return {
		usageBytes,
		quotaBytes,
		usagePercent: Math.min(100, Number(usagePercent.toFixed(2))),
		totalMediaCount,
		syncedCount,
		pendingCount,
	};
}

/**
 * Безопасная очистка кэша: удаляет оригиналы Blob для уже синхронизированных
 * файлов, сохраняя 200x200 превью и клинические метаданные.
 */
export async function evictSyncedMediaCache(params: {
	maxAgeDays?: number | undefined;
	targetFreeBytes?: number | undefined;
} = {}): Promise<{ evictedCount: number; freedBytes: number }> {
	const { maxAgeDays = 7, targetFreeBytes = 50 * 1024 * 1024 } = params;
	const cutoffMs = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;

	let evictedCount = 0;
	let freedBytes = 0;

	try {
		const db = await openMediaVaultDb();
		const items = await new Promise<StoredMediaItem[]>((resolve, reject) => {
			const tx = db.transaction(MEDIA_ITEMS_STORE, "readonly");
			tx.onerror = () => reject(tx.error);
			const req = tx.objectStore(MEDIA_ITEMS_STORE).getAll();
			req.onsuccess = () => resolve(req.result || []);
			req.onerror = () => reject(req.error);
		});

		// Кандидаты: синхронизированные, оригиналы еще не удалены, старше cutoff
		const candidates = items
			.filter((it) => it.syncStatus === "synced" && !it.evictedOriginal)
			.sort((a, b) => a.capturedAtMs - b.capturedAtMs);

		for (const item of candidates) {
			if (item.capturedAtMs > cutoffMs && freedBytes >= targetFreeBytes) {
				break;
			}

			await new Promise<void>((resolve, reject) => {
				const tx = db.transaction(
					[MEDIA_ITEMS_STORE, MEDIA_BLOBS_STORE],
					"readwrite",
				);
				tx.onerror = () => reject(tx.error);
				tx.oncomplete = () => resolve();

				tx.objectStore(MEDIA_BLOBS_STORE).delete(item.originalBlobKey);
				item.evictedOriginal = true;
				tx.objectStore(MEDIA_ITEMS_STORE).put(item);
			});

			evictedCount++;
			freedBytes += item.sizeBytes;
		}
	} catch (err: unknown) {
		logger.warn("[OfflineMediaVault] evictSyncedMediaCache IDB cleanup failed, falling back to memory:", err);
		for (const item of memoryMediaItems.values()) {
			if (item.syncStatus === "synced" && !item.evictedOriginal) {
				memoryMediaBlobs.delete(item.originalBlobKey);
				item.evictedOriginal = true;
				evictedCount++;
				freedBytes += item.sizeBytes;
				if (freedBytes >= targetFreeBytes) break;
			}
		}
	}

	return { evictedCount, freedBytes };
}
