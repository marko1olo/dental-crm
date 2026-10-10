import type {
	BrowserSpeechRecognition,
	BrowserWindowWithSpeech,
	PendingSpeechChunk,
} from "./types.js";
import type {
	AcceptVisitDraftResponse,
	SpeechChunkUploadInput,
	SpeechGatewayStatus,
	SpeechProviderConnector,
	SpeechTranscriptionResponse,
	VisitNoteDraft,
} from "@dental/shared";
import { buildRuleBasedVisitDraftFromTranscript } from "@dental/shared";
import { showToast } from "../components/GlobalToast";
import {
	localConvenienceRetentionMs,
	localSavedAtFresh,
	organizationScopedLocalStorageKey,
} from "../utils/localStorageHelpers";
import {
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../lib/safeLocalStorage";
import { logger } from "../utils/logger";
import { actionFailureToast } from "../lib/panelStateText";
import {
	offlineDraftOrganizationKey,
	normalizedLocalOrganizationId,
	localQueueOrganizationMatches,
	createLocalQueueId,
} from "./uiFormatters.js";

export function speechGatewayCanUpload(
	status: SpeechGatewayStatus | null,
): boolean {
	return Boolean(
		status?.serverTranscriptionCurrentlyAvailable ??
			status?.serverTranscriptionEnabled,
	);
}

export const speechAudioQueueRetentionMs = 48 * 60 * 60 * 1000;

export const speechQualityLabels: Record<
	SpeechTranscriptionResponse["chunk"]["quality"]["level"],
	string
> = {
	clear: "чисто",
	review: "проверить",
	empty: "пусто",
	failed: "сбой",
};

export const pendingVisitSaveQueueKey = "dental-crm:pending-visit-saves";

export const pendingSpeechChunkQueueKey = "dental-crm:pending-speech-chunks";

export const speechChunkDbName = "dental-crm-offline";

export const speechChunkDbVersion = 4;

export const pendingVisitSaveStoreName = "pendingVisitSaves";

export const dicomWorkbenchDraftStoreName = "dicomWorkbenchDrafts";

export const mprWorkbenchDraftStoreName = "mprWorkbenchDrafts";

export const speechChunkStoreName = "pendingSpeechChunks";

export const speechLocalStorageFallbackMaxBytes = 4_000_000;

export const requiredSpeechChunkDbStoreNames = [
	pendingVisitSaveStoreName,
	dicomWorkbenchDraftStoreName,
	mprWorkbenchDraftStoreName,
	speechChunkStoreName,
] as const;

export let speechChunkDbPromise: Promise<IDBDatabase> | null = null;

export function pendingSpeechChunkQueueLocalKey(
	organizationId: string | null | undefined = null,
): string {
	return organizationScopedLocalStorageKey(
		pendingSpeechChunkQueueKey,
		organizationId,
	);
}

export function normalizeSpeechAppendText(value: string): string {
	return value
		.toLowerCase()
		.replace(/ё/g, "е")
		.replace(/[^\p{L}\p{N}]+/gu, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export function appendSpeechTextWithoutDuplicateTail(
	current: string,
	next: string,
	dedupeWindowChars = 600,
): string {
	const cleanNext = next.trim();
	const cleanCurrent = current.trim();
	if (!cleanNext) return current;
	if (!cleanCurrent) return cleanNext;

	const currentTail = cleanCurrent.slice(-dedupeWindowChars);
	const normalizedCurrent = normalizeSpeechAppendText(currentTail);
	const normalizedNext = normalizeSpeechAppendText(cleanNext);
	if (!normalizedNext) return current;
	if (
		normalizedCurrent.endsWith(normalizedNext) ||
		normalizedCurrent.includes(normalizedNext)
	)
		return current;

	const currentWords = (normalizedCurrent ?? "").split(" ").filter(Boolean);
	const nextWords = (normalizedNext ?? "").split(" ").filter(Boolean);
	const originalNextWords = (cleanNext ?? "").split(/\s+/).filter(Boolean);
	const maxOverlap = Math.min(
		14,
		currentWords.length,
		nextWords.length,
		originalNextWords.length,
	);
	for (let size = maxOverlap; size >= 3; size -= 1) {
		const currentSuffix = currentWords.slice(-size).join(" ");
		const nextPrefix = nextWords.slice(0, size).join(" ");
		if (currentSuffix === nextPrefix) {
			const remainingNext = originalNextWords.slice(size).join(" ").trim();
			return remainingNext ? `${cleanCurrent}\n${remainingNext}` : cleanCurrent;
		}
	}

	return `${cleanCurrent}\n${cleanNext}`;
}

export function isPendingSpeechChunk(
	value: unknown,
): value is PendingSpeechChunk {
	if (!value || typeof value !== "object") return false;
	const candidate = value as Partial<PendingSpeechChunk>;
	return (
		candidate.version === 1 &&
		typeof candidate.id === "string" &&
		typeof candidate.queuedAt === "string" &&
		typeof candidate.recordingId === "string" &&
		typeof candidate.chunkIndex === "number" &&
		Number.isInteger(candidate.chunkIndex) &&
		typeof candidate.mimeType === "string" &&
		typeof candidate.language === "string" &&
		typeof candidate.source === "string" &&
		(typeof candidate.audioBase64 === "string" ||
			typeof candidate.localTranscript === "string")
	);
}

export function normalizePendingSpeechChunk(
	value: unknown,
	activeOrganizationId: string | null | undefined,
	legacyOrganizationFallback: string | null | undefined = null,
): PendingSpeechChunk | null {
	if (!isPendingSpeechChunk(value)) return null;
	const organizationId =
		normalizedLocalOrganizationId(value.organizationId) ??
		normalizedLocalOrganizationId(legacyOrganizationFallback);
	if (!localQueueOrganizationMatches(organizationId, activeOrganizationId))
		return null;
	if (!localSavedAtFresh(value.queuedAt, speechAudioQueueRetentionMs))
		return null;
	return { ...value, organizationId };
}

export function sortPendingSpeechChunks(
	queue: PendingSpeechChunk[],
): PendingSpeechChunk[] {
	return queue
		.slice()
		.sort((left, right) => left.queuedAt.localeCompare(right.queuedAt));
}

export function loadPendingSpeechChunksFromLocalStorage(
	organizationId: string | null | undefined = null,
): PendingSpeechChunk[] {
	if (typeof window === "undefined") return [];
	try {
		const normalizedOrganizationId =
			normalizedLocalOrganizationId(organizationId);
		const localKey = pendingSpeechChunkQueueLocalKey(normalizedOrganizationId);
		const scopedRaw = safeLocalStorageGetItem(localKey);
		const legacyRaw = normalizedOrganizationId
			? safeLocalStorageGetItem(pendingSpeechChunkQueueKey)
			: null;
		const byId = new Map<string, PendingSpeechChunk>();
		for (const raw of [scopedRaw, legacyRaw]) {
			if (!raw) continue;
			const parsed = JSON.parse(raw);
			if (!Array.isArray(parsed)) continue;
			for (const item of parsed) {
				const normalized = normalizePendingSpeechChunk(
					item,
					normalizedOrganizationId,
					raw === legacyRaw ? normalizedOrganizationId : null,
				);
				if (normalized) byId.set(normalized.id, normalized);
			}
		}
		const queue = sortPendingSpeechChunks(Array.from(byId.values()));
		if (normalizedOrganizationId && legacyRaw) {
			savePendingSpeechChunksToLocalStorage(queue, normalizedOrganizationId);
			safeLocalStorageRemoveItem(pendingSpeechChunkQueueKey);
		}
		return queue;
	} catch {
		return [];
	}
}

export function savePendingSpeechChunksToLocalStorage(
	queue: PendingSpeechChunk[],
	organizationId: string | null | undefined = null,
): void {
	if (typeof window === "undefined") return;
	const normalizedOrganizationId =
		normalizedLocalOrganizationId(organizationId);
	const localKey = pendingSpeechChunkQueueLocalKey(normalizedOrganizationId);
	const scopedQueue = sortPendingSpeechChunks(
		queue
			.map((item) => ({
				...item,
				organizationId:
					normalizedLocalOrganizationId(item.organizationId) ??
					normalizedOrganizationId,
			}))
			.filter(
				(item) =>
					localQueueOrganizationMatches(
						item.organizationId,
						normalizedOrganizationId,
					) && localSavedAtFresh(item.queuedAt, speechAudioQueueRetentionMs),
			),
	);
	if (!scopedQueue.length) {
		safeLocalStorageRemoveItem(localKey);
		return;
	}
	const payload = JSON.stringify(scopedQueue);
	if (payload.length > speechLocalStorageFallbackMaxBytes) {
		throw new Error(
			"Память для аудио на этом устройстве переполнена; освободите место или отправьте текущую запись.",
		);
	}
	safeLocalStorageSetItem(localKey, payload);
}

export function speechChunkIndexedDbAvailable(): boolean {
	return typeof window !== "undefined" && "indexedDB" in window;
}

export function pendingVisitSaveIndexedDbAvailable(): boolean {
	return speechChunkIndexedDbAvailable();
}

export function assertSpeechChunkDbStores(db: IDBDatabase): void {
	const missingStores = requiredSpeechChunkDbStoreNames.filter(
		(storeName) => !db.objectStoreNames.contains(storeName),
	);
	if (missingStores.length) {
		throw new Error(
			`Offline IndexedDB schema is missing stores: ${missingStores.join(", ")}`,
		);
	}
}

export function openSpeechChunkDb(): Promise<IDBDatabase> {
	if (!speechChunkIndexedDbAvailable())
		return Promise.reject(
			new Error("Браузер не дает сохранить аудио для отправки позже"),
		);
	if (speechChunkDbPromise) return speechChunkDbPromise;
	speechChunkDbPromise = new Promise((resolve, reject) => {
		const request = window.indexedDB.open(
			speechChunkDbName,
			speechChunkDbVersion,
		);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(pendingVisitSaveStoreName)) {
				const store = db.createObjectStore(pendingVisitSaveStoreName, {
					keyPath: "id",
				});
				store.createIndex("queuedAt", "queuedAt");
				store.createIndex("organizationId", "organizationId");
				store.createIndex("visitId", "visitId");
			}
			if (!db.objectStoreNames.contains(dicomWorkbenchDraftStoreName)) {
				const store = db.createObjectStore(dicomWorkbenchDraftStoreName, {
					keyPath: "storageKey",
				});
				store.createIndex("organizationId", "organizationId");
				store.createIndex("seriesKey", "seriesKey");
				store.createIndex("clientSavedAt", "clientSavedAt");
			}
			if (!db.objectStoreNames.contains(mprWorkbenchDraftStoreName)) {
				const store = db.createObjectStore(mprWorkbenchDraftStoreName, {
					keyPath: "storageKey",
				});
				store.createIndex("organizationId", "organizationId");
				store.createIndex("seriesKey", "seriesKey");
				store.createIndex("clientSavedAt", "clientSavedAt");
			}
			if (!db.objectStoreNames.contains(speechChunkStoreName)) {
				const store = db.createObjectStore(speechChunkStoreName, {
					keyPath: "id",
				});
				store.createIndex("queuedAt", "queuedAt");
			}
		};
		request.onsuccess = () => {
			const db = request.result;
			// БЫЛО: при смене версии соединение закрывалось, но КЭШ промиса оставался
			// указывать на закрытый дескриптор. Сценарий: открыта вторая вкладка после
			// обновления версии хранилища — первая закрывала своё соединение, а все
			// последующие db.transaction(...) бросали InvalidStateError. Сохранение
			// приёма падало на запасной путь в localStorage, который к тому моменту
			// уже очищен, и очередь неотправленных записей приёма перезаписывалась
			// пустой — при том, что интерфейс сообщал «сохранено локально».
			// Сбрасываем кэш, чтобы следующий вызов открыл соединение заново.
			db.onversionchange = () => {
				speechChunkDbPromise = null;
				db.close();
			};
			db.onclose = () => {
				speechChunkDbPromise = null;
			};
			try {
				assertSpeechChunkDbStores(db);
				resolve(db);
			} catch (error) {
				logger.warn("Offline IndexedDB stores assert failed, closing db", error);
				db.close();
				speechChunkDbPromise = null;
				reject(
					error instanceof Error
						? error
						: new Error("Offline IndexedDB schema is incomplete"),
				);
			}
		};
		request.onerror = () => {
			speechChunkDbPromise = null;
			reject(request.error ?? new Error("Хранилище аудио не открылось"));
		};
		request.onblocked = () => {
			speechChunkDbPromise = null;
			reject(new Error("Хранилище аудио заблокировано другой вкладкой"));
		};
	});
	return speechChunkDbPromise;
}

export async function readPendingSpeechChunksFromIndexedDb(
	organizationId: string | null | undefined = null,
): Promise<PendingSpeechChunk[]> {
	const db = await openSpeechChunkDb();
	const normalizedOrganizationId =
		normalizedLocalOrganizationId(organizationId);
	const values = await new Promise<unknown[]>((resolve, reject) => {
		const transaction = db.transaction(speechChunkStoreName, "readonly");
		const request = transaction.objectStore(speechChunkStoreName).getAll();
		request.onsuccess = () => {
			resolve(Array.isArray(request.result) ? request.result : []);
		};
		request.onerror = () =>
			reject(request.error ?? new Error("Хранилище аудио не прочитано"));
		transaction.onerror = () =>
			reject(
				transaction.error ??
					new Error("Операция с хранилищем аудио не выполнена"),
			);
	});
	const queue: PendingSpeechChunk[] = [];
	const staleIds: string[] = [];
	for (const value of values) {
		const id =
			value &&
			typeof value === "object" &&
			typeof (value as Partial<PendingSpeechChunk>).id === "string"
				? (value as Partial<PendingSpeechChunk>).id
				: null;
		const normalized = normalizePendingSpeechChunk(
			value,
			normalizedOrganizationId,
			normalizedOrganizationId,
		);
		if (normalized) {
			queue.push(normalized);
		} else if (
			id &&
			(!isPendingSpeechChunk(value) ||
				!localSavedAtFresh(value.queuedAt, speechAudioQueueRetentionMs))
		) {
			staleIds.push(id);
		}
	}
	if (staleIds.length) {
		await Promise.allSettled(
			staleIds.map((id) => deletePendingSpeechChunkFromIndexedDb(id)),
		);
	}
	return sortPendingSpeechChunks(queue);
}

export async function savePendingSpeechChunksToIndexedDb(
	queue: PendingSpeechChunk[],
	organizationId: string | null | undefined = null,
): Promise<void> {
	const db = await openSpeechChunkDb();
	const normalizedOrganizationId =
		normalizedLocalOrganizationId(organizationId);
	const scopedQueue = sortPendingSpeechChunks(
		queue
			.map((item) => ({
				...item,
				organizationId:
					normalizedLocalOrganizationId(item.organizationId) ??
					normalizedOrganizationId,
			}))
			.filter(
				(item) =>
					localQueueOrganizationMatches(
						item.organizationId,
						normalizedOrganizationId,
					) && localSavedAtFresh(item.queuedAt, speechAudioQueueRetentionMs),
			),
	);
	await new Promise<void>((resolve, reject) => {
		const transaction = db.transaction(speechChunkStoreName, "readwrite");
		const store = transaction.objectStore(speechChunkStoreName);
		for (const chunk of scopedQueue) {
			store.put(chunk);
		}
		transaction.oncomplete = () => resolve();
		transaction.onerror = () =>
			reject(
				transaction.error ??
					new Error("Аудио не сохранено в локальное хранилище"),
			);
		transaction.onabort = () =>
			reject(
				transaction.error ?? new Error("Сохранение аудио отменено браузером"),
			);
	});
}

export async function putPendingSpeechChunkToIndexedDb(
	chunk: PendingSpeechChunk,
): Promise<void> {
	const db = await openSpeechChunkDb();
	await new Promise<void>((resolve, reject) => {
		const transaction = db.transaction(speechChunkStoreName, "readwrite");
		transaction.objectStore(speechChunkStoreName).put(chunk);
		transaction.oncomplete = () => resolve();
		transaction.onerror = () =>
			reject(transaction.error ?? new Error("Очередь аудио не обновлена"));
		transaction.onabort = () =>
			reject(
				transaction.error ??
					new Error("Обновление очереди аудио отменено браузером"),
			);
	});
}

export async function deletePendingSpeechChunkFromIndexedDb(
	id: string,
): Promise<void> {
	const db = await openSpeechChunkDb();
	await new Promise<void>((resolve, reject) => {
		const transaction = db.transaction(speechChunkStoreName, "readwrite");
		transaction.objectStore(speechChunkStoreName).delete(id);
		transaction.oncomplete = () => resolve();
		transaction.onerror = () =>
			reject(
				transaction.error ?? new Error("Аудио не удалено из локальной очереди"),
			);
		transaction.onabort = () =>
			reject(
				transaction.error ??
					new Error("Удаление аудио из очереди отменено браузером"),
			);
	});
}

export async function migrateSpeechChunksFromLocalStorage(
	organizationId: string | null | undefined = null,
): Promise<void> {
	const normalizedOrganizationId =
		normalizedLocalOrganizationId(organizationId);
	const legacyQueue = loadPendingSpeechChunksFromLocalStorage(
		normalizedOrganizationId,
	);
	if (!legacyQueue.length || !speechChunkIndexedDbAvailable()) return;
	const existing = await readPendingSpeechChunksFromIndexedDb(
		normalizedOrganizationId,
	).catch((err) => {
		logger.error("[Dente] read speech chunks error:", err);
		showToast(
			actionFailureToast(
				"Ошибка чтения очереди аудиофрагментов",
				(err as { status?: number })?.status ?? null,
			),
			"error",
		);
		return [];
	});
	const byId = new Map<string, PendingSpeechChunk>();
	for (const chunk of [...existing, ...legacyQueue]) {
		byId.set(chunk.id, chunk);
	}
	await savePendingSpeechChunksToIndexedDb(
		sortPendingSpeechChunks(Array.from(byId.values())),
		normalizedOrganizationId,
	);
	safeLocalStorageRemoveItem(
		pendingSpeechChunkQueueLocalKey(normalizedOrganizationId),
	);
	if (normalizedOrganizationId)
		safeLocalStorageRemoveItem(pendingSpeechChunkQueueKey);
}

export async function loadPendingSpeechChunks(
	organizationId: string | null | undefined = null,
): Promise<PendingSpeechChunk[]> {
	if (!speechChunkIndexedDbAvailable())
		return loadPendingSpeechChunksFromLocalStorage(organizationId);
	try {
		await migrateSpeechChunksFromLocalStorage(organizationId);
		return await readPendingSpeechChunksFromIndexedDb(organizationId);
	} catch {
		return loadPendingSpeechChunksFromLocalStorage(organizationId);
	}
}

export async function queuePendingSpeechChunk(
	chunk: SpeechChunkUploadInput,
	organizationId: string | null | undefined = null,
): Promise<PendingSpeechChunk | null> {
	if (typeof window === "undefined") return null;
	const normalizedOrganizationId =
		normalizedLocalOrganizationId(organizationId);
	const queued: PendingSpeechChunk = {
		...chunk,
		version: 1,
		id: createLocalQueueId(),
		organizationId: normalizedOrganizationId,
		queuedAt: new Date().toISOString(),
	};
	if (speechChunkIndexedDbAvailable()) {
		try {
			await migrateSpeechChunksFromLocalStorage(normalizedOrganizationId);
			await putPendingSpeechChunkToIndexedDb(queued);
			safeLocalStorageRemoveItem(
				pendingSpeechChunkQueueLocalKey(normalizedOrganizationId),
			);
			if (normalizedOrganizationId)
				safeLocalStorageRemoveItem(pendingSpeechChunkQueueKey);
			return queued;
		} catch {
			// Fall through to the small legacy fallback. It may reject instead of silently dropping audio.
		}
	}
	try {
		await savePendingSpeechChunksToLocalStorage(
			[
				...loadPendingSpeechChunksFromLocalStorage(normalizedOrganizationId),
				queued,
			],
			normalizedOrganizationId,
		);
		return queued;
	} catch {
		return null;
	}
}

export async function removePendingSpeechChunkById(
	id: string,
	organizationId: string | null | undefined = null,
): Promise<void> {
	if (speechChunkIndexedDbAvailable()) {
		try {
			await deletePendingSpeechChunkFromIndexedDb(id);
			return;
		} catch {
			// Legacy fallback below keeps retry cleanup working when browser audio storage is unavailable mid-session.
		}
	}
	savePendingSpeechChunksToLocalStorage(
		loadPendingSpeechChunksFromLocalStorage(organizationId).filter(
			(chunk) => chunk.id !== id,
		),
		organizationId,
	);
}

export const speechProviderConnectorLabels: Record<
	SpeechProviderConnector,
	string
> = {
	client_only: "браузер",
	server_wired: "сервер",
	server_cataloged: "каталог",
	local_bridge: "локальный модуль",
	local_planned: "локально",
};
