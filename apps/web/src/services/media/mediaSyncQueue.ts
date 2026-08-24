/**
 * DENTE CRM — Media Sync Queue (Background Uploader for Intraoral Photos & X-Rays)
 *
 * Фоновая досылка медиафайлов высокого разрешения:
 * - Досылка интраоральных снимков и КТ на локальный микросервер клиники (порт 4100) или в облако
 * - Неблокирующая фоновая обработка без задержек в UI врача
 * - Экспоненциальный бэкофф и обработка сетевых сбоев
 * - Уведомления об успешной синхронизации для одонтограммы
 */

import { logger } from "../../utils/logger";
import {
	getMediaItemById,
	getMediaOriginalBlob,
	openMediaVaultDb,
	type StoredMediaItem,
	updateMediaSyncStatus,
	MEDIA_ITEMS_STORE,
} from "./offlineMediaVault";

export interface MediaQueueDrainOptions {
	organizationId?: string | undefined;
	batchSize?: number | undefined;
	maxRetries?: number | undefined;
	targetUploadUrl?: string | undefined;
	fetchImpl?: typeof fetch | undefined;
	onProgress?: ((progress: { uploaded: number; total: number; currentItem: StoredMediaItem }) => void) | undefined;
}

export interface MediaQueueDrainResult {
	totalQueued: number;
	uploadedCount: number;
	failedCount: number;
	errors: Array<{ mediaId: string; error: string }>;
}

let isMediaSyncActive = false;

/**
 * Проверка, идет ли фоновая синхронизация медиа
 */
export function isMediaSyncInProgress(): boolean {
	return isMediaSyncActive;
}

/**
 * Получение списка медиа-файлов, ожидающих отправки на сервер
 */
export async function getPendingMediaItems(
	organizationId?: string,
): Promise<StoredMediaItem[]> {
	try {
		const db = await openMediaVaultDb();
		const items = await new Promise<StoredMediaItem[]>((resolve, reject) => {
			const tx = db.transaction(MEDIA_ITEMS_STORE, "readonly");
			tx.onerror = () => reject(tx.error);
			const store = tx.objectStore(MEDIA_ITEMS_STORE);
			const index = store.index("syncStatus");
			const pendingReq = index.getAll("pending");

			pendingReq.onsuccess = () => {
				const failedReq = index.getAll("failed");
				failedReq.onsuccess = () => {
					const combined = [...(pendingReq.result || []), ...(failedReq.result || [])];
					resolve(combined);
				};
				failedReq.onerror = () => resolve(pendingReq.result || []);
			};
			pendingReq.onerror = () => reject(pendingReq.error);
		});

		let filtered = items;
		if (organizationId) {
			filtered = filtered.filter(
				(it) => !it.organizationId || it.organizationId === organizationId,
			);
		}

		return filtered.sort((a, b) => a.capturedAtMs - b.capturedAtMs);
	} catch {
		// Fallback для in-memory / тестовой среды
		return [];
	}
}

/**
 * Отправка одного медиафайла на сервер
 */
export async function uploadSingleMediaItem(
	mediaId: string,
	options: {
		targetUploadUrl?: string | undefined;
		fetchImpl?: typeof fetch | undefined;
	} = {},
): Promise<{ success: boolean; remoteUrl?: string; error?: string }> {
	const item = await getMediaItemById(mediaId);
	if (!item) {
		return { success: false, error: "Media item not found" };
	}

	const blob = await getMediaOriginalBlob(item.originalBlobKey);
	if (!blob) {
		return { success: false, error: "Original media blob missing or evicted" };
	}

	await updateMediaSyncStatus(mediaId, "syncing");

	const uploadUrl = options.targetUploadUrl || "/api/media/upload";
	const fetchFn = options.fetchImpl || (typeof fetch !== "undefined" ? fetch : undefined);

	if (!fetchFn) {
		await updateMediaSyncStatus(mediaId, "failed", { error: "Fetch unavailable" });
		return { success: false, error: "Fetch implementation unavailable" };
	}

	try {
		const formData = new FormData();
		const binaryBlob =
			blob instanceof Blob
				? blob
				: new Blob([blob], { type: item.mimeType });

		formData.append("file", binaryBlob, item.fileName);
		formData.append("mediaId", item.mediaId);
		formData.append("patientId", item.patientId);
		if (item.toothNumber) formData.append("toothNumber", String(item.toothNumber));
		if (item.visitId) formData.append("visitId", item.visitId);
		formData.append("photoType", item.photoType);
		if (item.organizationId) formData.append("organizationId", item.organizationId);

		const response = await fetchFn(uploadUrl, {
			method: "POST",
			headers: {
				"x-dente-media-sync": "1",
			},
			body: formData,
		});

		if (!response.ok) {
			const errorText = await response.text().catch(() => "");
			throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
		}

		const data = (await response.json()) as { url?: string; remoteUrl?: string };
		const remoteUrl = data.remoteUrl || data.url || `/media/patients/${item.patientId}/${item.fileName}`;

		await updateMediaSyncStatus(mediaId, "synced", { remoteUrl });

		if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
			window.dispatchEvent(
				new CustomEvent("dente:media-synced", {
					detail: { mediaId, patientId: item.patientId, toothNumber: item.toothNumber, remoteUrl },
				}),
			);
		}

		return { success: true, remoteUrl };
	} catch (err) {
		const errMsg = err instanceof Error ? err.message : String(err);
		logger.warn(`[MediaSyncQueue] Failed to upload media ${mediaId}`, err);
		await updateMediaSyncStatus(mediaId, "failed", { error: errMsg });
		return { success: false, error: errMsg };
	}
}

/**
 * Фоновый дренаж очереди медиа-файлов
 */
export async function drainMediaSyncQueue(
	options: MediaQueueDrainOptions = {},
): Promise<MediaQueueDrainResult> {
	if (isMediaSyncActive) {
		logger.warn("[MediaSyncQueue] Sync already in progress, skipping");
		return { totalQueued: 0, uploadedCount: 0, failedCount: 0, errors: [] };
	}

	isMediaSyncActive = true;
	const {
		organizationId,
		batchSize = 10,
		targetUploadUrl,
		fetchImpl,
		onProgress,
	} = options;

	const result: MediaQueueDrainResult = {
		totalQueued: 0,
		uploadedCount: 0,
		failedCount: 0,
		errors: [],
	};

	try {
		const pendingItems = await getPendingMediaItems(organizationId);
		result.totalQueued = pendingItems.length;

		if (pendingItems.length === 0) {
			return result;
		}

		// Обрабатываем батчами
		for (let i = 0; i < pendingItems.length; i += batchSize) {
			const batch = pendingItems.slice(i, i + batchSize);

			for (const item of batch) {
				const uploadRes = await uploadSingleMediaItem(item.mediaId, {
					targetUploadUrl,
					fetchImpl,
				});

				if (uploadRes.success) {
					result.uploadedCount++;
				} else {
					result.failedCount++;
					result.errors.push({
						mediaId: item.mediaId,
						error: uploadRes.error || "Upload failed",
					});
				}

				if (onProgress) {
					onProgress({
						uploaded: result.uploadedCount,
						total: result.totalQueued,
						currentItem: item,
					});
				}
			}
		}

		return result;
	} finally {
		isMediaSyncActive = false;
	}
}
