import type { SpeechChunkUploadInput } from "@dental/shared";
import { showToast } from "../../../components/GlobalToast";
import { actionFailureToast } from "../../../lib/panelStateText";
import {
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
} from "../../../lib/safeLocalStorage";
import { normalizedLocalOrganizationId } from "../../AuthOnboardingHelpers";
import { dicomWorkbenchDraftStoreName, mprWorkbenchDraftStoreName } from "../../ImagingHelpers";
import {
	localSavedAtFresh,
} from "../../localStorageHelpers";
import { logger } from "../../logger";
import {
	openSpeechChunkDb,
	type PendingSpeechChunk as SharedPendingSpeechChunk,
	pendingSpeechChunkQueueKey,
	pendingSpeechChunkQueueLocalKey,
	savePendingSpeechChunksToLocalStorage,
	speechAudioQueueRetentionMs,
	speechChunkIndexedDbAvailable,
	speechChunkStoreName,
} from "../../SpeechHelpers";
import { pendingVisitSaveStoreName } from "../visitDraftHelpers";
import { createLocalQueueId, localQueueOrganizationMatches } from "./domainGuards";
import { int16PcmToBase64, pcmToWavArrayBuffer } from "./pcmAudioUtils";
import type {
	PendingSpeechChunk,
	SpeechPipelineChunkResult,
	SpeechQuantizationConfig,
} from "./types";
import { calculateRmsDb, calculateRmsFromInt16, VadSilenceDetector } from "./vadSilenceDetector";

import {
	isPendingSpeechChunk,
	normalizePendingSpeechChunk,
	normalizeSpeechTranscriptionSource,
	requiredSpeechChunkDbStoreNames,
	sortPendingSpeechChunks,
} from "./speechChunkGuards";
export * from "./speechChunkGuards";

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
				!localSavedAtFresh((value as PendingSpeechChunk).queuedAt, speechAudioQueueRetentionMs))
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

/**
 * Конвейер агрегации непрерывного аудиопотока и нарезки на кванты (SpeechChunkUploadInput).
 * Интегрирован с VAD для завершения чанка по естественной паузе врача.
 */
export class SpeechChunkStreamingPipeline {
	private recordingId: string;
	private language: string;
	private source: SpeechChunkUploadInput["source"];
	private vadDetector: VadSilenceDetector;
	private config: SpeechQuantizationConfig;
	private buffer: Int16Array[] = [];
	private bufferSamplesCount = 0;
	private currentChunkIndex = 0;

	constructor(options: {
		recordingId: string;
		language?: string;
		source?: SpeechChunkUploadInput["source"] | string;
		config?: Partial<SpeechQuantizationConfig>;
	}) {
		this.recordingId = options.recordingId;
		this.language = options.language ?? "ru";
		this.source = normalizeSpeechTranscriptionSource(options.source);
		this.config = {
			targetSampleRate: options.config?.targetSampleRate ?? 16000,
			chunkDurationMs: options.config?.chunkDurationMs ?? 6000,
			maxChunkDurationMs: options.config?.maxChunkDurationMs ?? 20000,
			vadPauseCutoffMs: options.config?.vadPauseCutoffMs ?? 1500,
			channels: 1,
		};
		this.vadDetector = new VadSilenceDetector({
			sampleRate: this.config.targetSampleRate,
			silenceTimeoutMs: this.config.vadPauseCutoffMs,
		});
	}

	/**
	 * Прием фрейма PCM Int16. Возвращает готовый чанк, если наступила пауза или превышен лимит длины.
	 */
	public feedPcmFrame(
		pcm: Int16Array,
		now = Date.now(),
	): SpeechPipelineChunkResult | null {
		this.buffer.push(pcm.slice());
		this.bufferSamplesCount += pcm.length;

		const vadResult = this.vadDetector.processPcmChunk(pcm, now);
		const currentDurationMs = (this.bufferSamplesCount / this.config.targetSampleRate) * 1000;

		const shouldFlushByPause = vadResult.isPauseDetected && currentDurationMs >= 500;
		const shouldFlushByMaxDuration = currentDurationMs >= this.config.maxChunkDurationMs;

		if (shouldFlushByPause || shouldFlushByMaxDuration) {
			return this.flush(false);
		}

		return null;
	}

	/**
	 * Принудительный сброс текущего буфера (например при остановке записи врача).
	 */
	public flush(isFinal = true): SpeechPipelineChunkResult | null {
		if (this.bufferSamplesCount === 0) {
			return null;
		}

		const merged = new Int16Array(this.bufferSamplesCount);
		let offset = 0;
		for (const chunk of this.buffer) {
			merged.set(chunk, offset);
			offset += chunk.length;
		}

		const samplesCount = this.bufferSamplesCount;
		const durationMs = (samplesCount / this.config.targetSampleRate) * 1000;
		const rms = calculateRmsFromInt16(merged);
		const rmsDb = calculateRmsDb(rms);

		// Формируем WAV ArrayBuffer и кодируем в Base64
		const wavBuffer = pcmToWavArrayBuffer(merged, this.config.targetSampleRate, this.config.channels);
		const bytes = new Uint8Array(wavBuffer);
		let binary = "";
		for (let i = 0; i < bytes.byteLength; i += 0x8000) {
			binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 0x8000, bytes.byteLength)));
		}
		const audioBase64 = btoa(binary);

		const chunkPayload: SpeechChunkUploadInput = {
			recordingId: this.recordingId,
			chunkIndex: this.currentChunkIndex,
			mimeType: "audio/wav",
			language: this.language,
			source: this.source,
			audioBase64,
		};

		this.currentChunkIndex += 1;
		this.buffer = [];
		this.bufferSamplesCount = 0;
		this.vadDetector.reset();

		return {
			chunk: chunkPayload,
			durationMs,
			samplesCount,
			isFinal,
			rmsDb,
		};
	}

	public reset(): void {
		this.buffer = [];
		this.bufferSamplesCount = 0;
		this.currentChunkIndex = 0;
		this.vadDetector.reset();
	}
}
