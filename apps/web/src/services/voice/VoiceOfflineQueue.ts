/**
 * VoiceOfflineQueue.ts — Отказоустойчивая персистентная очередь диктовки в IndexedDB.
 *
 * ВОЗМОЖНОСТИ:
 * 1. Персистентное хранилище на базе IndexedDB (`dente_voice_offline_db`), таблица `pending_transcriptions`.
 * 2. Автоматическое сохранение сегментов аудио и распознанного текста при обрыве сети или сбое WebSocket.
 * 3. Автоматическая фоновая отправка накопленных записей при восстановлении сети (событие 'online' / processQueue).
 * 4. Формирование бейджей и уведомлений с правильной русской плюрализацией:
 *    «📡 Восстановлено 1 надиктованное сообщение после обрыва сети».
 * 5. Поддержка сред без IndexedDB (Node.js unit tests / SSR) через встроенный in-memory fallback.
 */

import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";

export type OfflineTranscriptionStatus =
	| "pending"
	| "syncing"
	| "synced"
	| "failed";

export interface OfflineTranscriptionContext {
	visitId?: string | null | undefined;
	patientId?: string | null | undefined;
	organizationId?: string | null | undefined;
	adminSecret?: string | null | undefined;
	[key: string]: unknown;
}

export interface PendingTranscriptionRecord {
	id: string;
	timestamp: number;
	durationMs: number;
	pcmChunks?: number[][] | Int16Array[] | string | undefined;
	wavBlob?: Blob | ArrayBuffer | string | undefined;
	audioBase64?: string | undefined;
	rawText?: string | undefined;
	specialty?: string | undefined;
	context: OfflineTranscriptionContext;
	status: OfflineTranscriptionStatus;
	retryCount: number;
	lastError?: string | null | undefined;
	syncedAt?: number | null | undefined;
}

export interface EnqueueTranscriptionInput {
	id?: string | undefined;
	timestamp?: number | undefined;
	durationMs?: number | undefined;
	pcmChunks?: number[][] | Int16Array[] | string | undefined;
	wavBlob?: Blob | ArrayBuffer | string | undefined;
	audioBase64?: string | undefined;
	rawText?: string | undefined;
	specialty?: string | undefined;
	context?: OfflineTranscriptionContext | undefined;
	status?: OfflineTranscriptionStatus | undefined;
	retryCount?: number | undefined;
	lastError?: string | null | undefined;
}

export interface VoiceOfflineQueueOptions {
	dbName?: string | undefined;
	dbVersion?: number | undefined;
	maxRetries?: number | undefined;
	syncEndpoint?: string | undefined;
	autoSyncIntervalMs?: number | undefined;
	autoProcessOnEnqueue?: boolean | undefined;
	syncHandler?: ((
		record: PendingTranscriptionRecord,
	) => Promise<{ success: boolean; text?: string; error?: string }>) | undefined;
	onSyncSuccess?: ((
		syncedCount: number,
		records: PendingTranscriptionRecord[],
	) => void) | undefined;
	onSyncProgress?: ((
		current: number,
		total: number,
		record: PendingTranscriptionRecord,
	) => void) | undefined;
	onSyncError?: ((
		record: PendingTranscriptionRecord,
		error: Error | string,
	) => void) | undefined;
	onQueueChange?: ((records: PendingTranscriptionRecord[]) => void) | undefined;
	onBadgeMessage?: ((badgeText: string) => void) | undefined;
}

export const VOICE_OFFLINE_DB_NAME = "dente_voice_offline_db";
export const VOICE_OFFLINE_DB_VERSION = 1;
export const VOICE_OFFLINE_STORE_NAME = "pending_transcriptions";

/**
 * Русская плюрализация для бейджа восстановления диктовки
 * «📡 Восстановлено 1 надиктованное сообщение после обрыва сети»
 * «📡 Восстановлено 2 надиктованных сообщения после обрыва сети»
 * «📡 Восстановлено 5 надиктованных сообщений после обрыва сети»
 */
export function formatRestoredDictationsBadge(count: number): string {
	const safeCount = Math.max(0, Math.floor(count));
	const mod10 = safeCount % 10;
	const mod100 = safeCount % 100;

	let phrase: string;
	if (mod100 >= 11 && mod100 <= 19) {
		phrase = "надиктованных сообщений";
	} else if (mod10 === 1) {
		phrase = "надиктованное сообщение";
	} else if (mod10 >= 2 && mod10 <= 4) {
		phrase = "надиктованных сообщения";
	} else {
		phrase = "надиктованных сообщений";
	}

	return `📡 Восстановлено ${safeCount} ${phrase} после обрыва сети`;
}

interface StorageDriver {
	get(id: string): Promise<PendingTranscriptionRecord | null>;
	getAll(): Promise<PendingTranscriptionRecord[]>;
	put(record: PendingTranscriptionRecord): Promise<void>;
	delete(id: string): Promise<void>;
	clear(): Promise<void>;
}

class InMemoryStorageDriver implements StorageDriver {
	private records = new Map<string, PendingTranscriptionRecord>();

	public async get(id: string): Promise<PendingTranscriptionRecord | null> {
		const rec = this.records.get(id);
		return rec ? { ...rec } : null;
	}

	public async getAll(): Promise<PendingTranscriptionRecord[]> {
		const items = Array.from(this.records.values()).map((r) => ({ ...r }));
		items.sort((a, b) => a.timestamp - b.timestamp);
		return items;
	}

	public async put(record: PendingTranscriptionRecord): Promise<void> {
		this.records.set(record.id, { ...record });
	}

	public async delete(id: string): Promise<void> {
		this.records.delete(id);
	}

	public async clear(): Promise<void> {
		this.records.clear();
	}
}

class IndexedDbStorageDriver implements StorageDriver {
	private dbName: string;
	private dbVersion: number;
	private dbPromise: Promise<IDBDatabase> | null = null;

	constructor(dbName: string, dbVersion: number) {
		this.dbName = dbName;
		this.dbVersion = dbVersion;
	}

	private getDb(): Promise<IDBDatabase> {
		if (this.dbPromise) return this.dbPromise;

		this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
			if (typeof window === "undefined" || !("indexedDB" in window)) {
				reject(new Error("IndexedDB is not available in current environment"));
				return;
			}

			const request = window.indexedDB.open(this.dbName, this.dbVersion);

			request.onupgradeneeded = () => {
				const db = request.result;
				if (!db.objectStoreNames.contains(VOICE_OFFLINE_STORE_NAME)) {
					const store = db.createObjectStore(VOICE_OFFLINE_STORE_NAME, {
						keyPath: "id",
					});
					store.createIndex("timestamp", "timestamp");
					store.createIndex("status", "status");
					store.createIndex("retryCount", "retryCount");
				}
			};

			request.onsuccess = () => {
				const db = request.result;
				db.onversionchange = () => {
					db.close();
					this.dbPromise = null;
				};
				db.onclose = () => {
					this.dbPromise = null;
				};
				resolve(db);
			};

			request.onerror = () => {
				this.dbPromise = null;
				reject(request.error || new Error("Failed to open IndexedDB"));
			};
		});

		return this.dbPromise;
	}

	public async get(id: string): Promise<PendingTranscriptionRecord | null> {
		const db = await this.getDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction([VOICE_OFFLINE_STORE_NAME], "readonly");
			const store = tx.objectStore(VOICE_OFFLINE_STORE_NAME);
			const request = store.get(id);

			request.onsuccess = () => {
				resolve((request.result as PendingTranscriptionRecord) || null);
			};
			request.onerror = () => {
				reject(request.error || new Error(`Failed to get record ${id}`));
			};
		});
	}

	public async getAll(): Promise<PendingTranscriptionRecord[]> {
		const db = await this.getDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction([VOICE_OFFLINE_STORE_NAME], "readonly");
			const store = tx.objectStore(VOICE_OFFLINE_STORE_NAME);
			const request = store.getAll();

			request.onsuccess = () => {
				const items = (request.result as PendingTranscriptionRecord[]) || [];
				items.sort((a, b) => a.timestamp - b.timestamp);
				resolve(items);
			};
			request.onerror = () => {
				reject(request.error || new Error("Failed to fetch all records"));
			};
		});
	}

	public async put(record: PendingTranscriptionRecord): Promise<void> {
		const db = await this.getDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction([VOICE_OFFLINE_STORE_NAME], "readwrite");
			const store = tx.objectStore(VOICE_OFFLINE_STORE_NAME);
			const request = store.put(record);

			request.onsuccess = () => {
				resolve();
			};
			request.onerror = () => {
				reject(request.error || new Error(`Failed to put record ${record.id}`));
			};
		});
	}

	public async delete(id: string): Promise<void> {
		const db = await this.getDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction([VOICE_OFFLINE_STORE_NAME], "readwrite");
			const store = tx.objectStore(VOICE_OFFLINE_STORE_NAME);
			const request = store.delete(id);

			request.onsuccess = () => {
				resolve();
			};
			request.onerror = () => {
				reject(request.error || new Error(`Failed to delete record ${id}`));
			};
		});
	}

	public async clear(): Promise<void> {
		const db = await this.getDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction([VOICE_OFFLINE_STORE_NAME], "readwrite");
			const store = tx.objectStore(VOICE_OFFLINE_STORE_NAME);
			const request = store.clear();

			request.onsuccess = () => {
				resolve();
			};
			request.onerror = () => {
				reject(request.error || new Error("Failed to clear offline store"));
			};
		});
	}
}

interface InternalVoiceOfflineQueueOptions {
	dbName: string;
	dbVersion: number;
	maxRetries: number;
	syncEndpoint: string;
	autoSyncIntervalMs: number;
	autoProcessOnEnqueue: boolean;
	syncHandler?: ((
		record: PendingTranscriptionRecord,
	) => Promise<{ success: boolean; text?: string; error?: string }>) | undefined;
	onSyncSuccess?: ((
		syncedCount: number,
		records: PendingTranscriptionRecord[],
	) => void) | undefined;
	onSyncProgress?: ((
		current: number,
		total: number,
		record: PendingTranscriptionRecord,
	) => void) | undefined;
	onSyncError?: ((
		record: PendingTranscriptionRecord,
		error: Error | string,
	) => void) | undefined;
	onQueueChange?: ((records: PendingTranscriptionRecord[]) => void) | undefined;
	onBadgeMessage?: ((badgeText: string) => void) | undefined;
}

export class VoiceOfflineQueue {
	private options: InternalVoiceOfflineQueueOptions;
	private storage: StorageDriver;
	private isSyncing = false;
	private autoSyncTimer: NodeJS.Timeout | null = null;
	private boundOnlineHandler: (() => void) | null = null;
	private boundOfflineHandler: (() => void) | null = null;
	private isDisposed = false;

	constructor(options: VoiceOfflineQueueOptions = {}) {
		this.options = {
			dbName: options.dbName ?? VOICE_OFFLINE_DB_NAME,
			dbVersion: options.dbVersion ?? VOICE_OFFLINE_DB_VERSION,
			maxRetries: options.maxRetries ?? 5,
			syncEndpoint: options.syncEndpoint ?? "/api/speech/transcribe-chunk",
			autoSyncIntervalMs: options.autoSyncIntervalMs ?? 30000,
			autoProcessOnEnqueue:
				options.autoProcessOnEnqueue ??
				(options.autoSyncIntervalMs !== undefined
					? options.autoSyncIntervalMs > 0
					: true),
			syncHandler: options.syncHandler,
			onSyncSuccess: options.onSyncSuccess,
			onSyncProgress: options.onSyncProgress,
			onSyncError: options.onSyncError,
			onQueueChange: options.onQueueChange,
			onBadgeMessage: options.onBadgeMessage,
		};

		const hasIndexedDb =
			typeof window !== "undefined" &&
			"indexedDB" in window &&
			window.indexedDB !== null;

		if (hasIndexedDb) {
			this.storage = new IndexedDbStorageDriver(
				this.options.dbName,
				this.options.dbVersion,
			);
		} else {
			this.storage = new InMemoryStorageDriver();
		}

		this.initNetworkListeners();
		this.startAutoSync();
	}

	private initNetworkListeners(): void {
		if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
			this.boundOnlineHandler = () => {
				void this.processQueue();
			};
			this.boundOfflineHandler = () => {
				// Оффлайн состояние зафиксировано
			};

			window.addEventListener("online", this.boundOnlineHandler);
			window.addEventListener("offline", this.boundOfflineHandler);
		}
	}

	public startAutoSync(): void {
		if (this.autoSyncTimer || this.isDisposed) return;
		if (this.options.autoSyncIntervalMs > 0) {
			this.autoSyncTimer = setInterval(() => {
				void this.processQueue();
			}, this.options.autoSyncIntervalMs);
			if (this.autoSyncTimer && typeof this.autoSyncTimer.unref === "function") {
				this.autoSyncTimer.unref();
			}
		}
	}

	public stopAutoSync(): void {
		if (this.autoSyncTimer) {
			clearInterval(this.autoSyncTimer);
			this.autoSyncTimer = null;
		}
	}

	/**
	 * Добавление фрагмента аудио или текста в персистентную очередь
	 */
	public async enqueue(
		input: EnqueueTranscriptionInput,
	): Promise<PendingTranscriptionRecord> {
		const recordId =
			input.id ??
			`voice_off_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

		const record: PendingTranscriptionRecord = {
			id: recordId,
			timestamp: input.timestamp ?? Date.now(),
			durationMs: input.durationMs ?? 0,
			pcmChunks: input.pcmChunks,
			wavBlob: input.wavBlob,
			audioBase64: input.audioBase64,
			rawText: input.rawText ?? "",
			specialty: input.specialty ?? "therapy",
			context: input.context ?? {},
			status: input.status ?? "pending",
			retryCount: input.retryCount ?? 0,
			lastError: input.lastError ?? null,
			syncedAt: null,
		};

		await this.storage.put(record);

		const allRecords = await this.storage.getAll();
		this.options.onQueueChange?.(allRecords);

		// Если разрешена автоматическая отправка при добавлении и сеть доступна
		if (this.options.autoProcessOnEnqueue && this.isOnline()) {
			void this.processQueue();
		}

		return record;
	}

	public async get(id: string): Promise<PendingTranscriptionRecord | null> {
		return this.storage.get(id);
	}

	public async getAll(): Promise<PendingTranscriptionRecord[]> {
		return this.storage.getAll();
	}

	public async getPending(): Promise<PendingTranscriptionRecord[]> {
		const all = await this.storage.getAll();
		return all.filter(
			(r) =>
				(r.status === "pending" || r.status === "failed") &&
				r.retryCount < this.options.maxRetries,
		);
	}

	public async countPending(): Promise<number> {
		const pending = await this.getPending();
		return pending.length;
	}

	public async updateStatus(
		id: string,
		status: OfflineTranscriptionStatus,
		extra?: {
			lastError?: string | null | undefined;
			syncedAt?: number | null | undefined;
			retryCount?: number | undefined;
		},
	): Promise<void> {
		const existing = await this.storage.get(id);
		if (!existing) return;

		const updated: PendingTranscriptionRecord = {
			...existing,
			status,
			lastError:
				extra?.lastError !== undefined ? extra.lastError : existing.lastError,
			syncedAt:
				extra?.syncedAt !== undefined ? extra.syncedAt : existing.syncedAt,
			retryCount:
				extra?.retryCount !== undefined ? extra.retryCount : existing.retryCount,
		};

		await this.storage.put(updated);
		const all = await this.storage.getAll();
		this.options.onQueueChange?.(all);
	}

	public async delete(id: string): Promise<void> {
		await this.storage.delete(id);
		const all = await this.storage.getAll();
		this.options.onQueueChange?.(all);
	}

	public async clearSynced(olderThanMs = 0): Promise<number> {
		const all = await this.storage.getAll();
		const now = Date.now();
		let deletedCount = 0;

		for (const record of all) {
			if (record.status === "synced") {
				const isOldEnough =
					olderThanMs <= 0 ||
					(record.syncedAt && now - record.syncedAt >= olderThanMs);
				if (isOldEnough) {
					await this.storage.delete(record.id);
					deletedCount++;
				}
			}
		}

		if (deletedCount > 0) {
			const remaining = await this.storage.getAll();
			this.options.onQueueChange?.(remaining);
		}

		return deletedCount;
	}

	public async clearAll(): Promise<void> {
		await this.storage.clear();
		this.options.onQueueChange?.([]);
	}

	public isOnline(): boolean {
		if (
			typeof navigator !== "undefined" &&
			typeof navigator.onLine === "boolean"
		) {
			return navigator.onLine;
		}
		return true;
	}

	/**
	 * Запуск фонового процесса отправки накопленных в IndexedDB записей на бэкенд
	 */
	public async processQueue(): Promise<PendingTranscriptionRecord[]> {
		if (this.isSyncing || this.isDisposed) return [];
		if (!this.isOnline()) return [];

		this.isSyncing = true;
		const syncedRecords: PendingTranscriptionRecord[] = [];

		try {
			const pendingList = await this.getPending();
			if (pendingList.length === 0) {
				return [];
			}

			const total = pendingList.length;

			for (let i = 0; i < pendingList.length; i++) {
				const record = pendingList[i];
				if (!record) continue;

				this.options.onSyncProgress?.(i + 1, total, record);
				await this.updateStatus(record.id, "syncing");

				try {
					const syncResult = this.options.syncHandler
						? await this.options.syncHandler(record)
						: await this.defaultSyncHandler(record);

					if (syncResult.success) {
						const syncedRec: PendingTranscriptionRecord = {
							...record,
							status: "synced",
							syncedAt: Date.now(),
							lastError: null,
							rawText: syncResult.text || record.rawText,
						};
						await this.storage.put(syncedRec);
						syncedRecords.push(syncedRec);
					} else {
						const nextRetry = record.retryCount + 1;
						const nextStatus: OfflineTranscriptionStatus =
							nextRetry >= this.options.maxRetries ? "failed" : "pending";
						const errorMsg = syncResult.error || "Неизвестная ошибка синхронизации";

						await this.updateStatus(record.id, nextStatus, {
							retryCount: nextRetry,
							lastError: errorMsg,
						});
						this.options.onSyncError?.(record, errorMsg);
					}
				} catch (err) {
					const errorObj =
						err instanceof Error ? err : new Error(String(err));
					const nextRetry = record.retryCount + 1;
					const nextStatus: OfflineTranscriptionStatus =
						nextRetry >= this.options.maxRetries ? "failed" : "pending";

					await this.updateStatus(record.id, nextStatus, {
						retryCount: nextRetry,
						lastError: errorObj.message,
					});
					this.options.onSyncError?.(record, errorObj);
				}
			}

			if (syncedRecords.length > 0) {
				const badgeMsg = formatRestoredDictationsBadge(syncedRecords.length);
				this.options.onSyncSuccess?.(syncedRecords.length, syncedRecords);
				this.options.onBadgeMessage?.(badgeMsg);
			}

			const allRemaining = await this.storage.getAll();
			this.options.onQueueChange?.(allRemaining);

			return syncedRecords;
		} finally {
			this.isSyncing = false;
		}
	}

	/**
	 * Стандартный обработчик отправки записи на бэкенд Speech API
	 */
	private async defaultSyncHandler(
		record: PendingTranscriptionRecord,
	): Promise<{ success: boolean; text?: string; error?: string }> {
		if (typeof fetch === "undefined") {
			return { success: false, error: "fetch API is not available" };
		}

		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			...denteAdminSecretRequestHeaders({}, record.context?.adminSecret ?? undefined),
		};

		// 1. Если есть закодированное аудио — отправляем в transcribe-chunk
		if (record.audioBase64) {
			const payload = {
				recordingId: record.id,
				chunkIndex: 0,
				mimeType: "audio/wav",
				audioBase64: record.audioBase64,
				durationMs: record.durationMs,
				organizationId: record.context.organizationId || null,
				patientId: record.context.patientId || null,
				visitId: record.context.visitId || null,
				specialty: record.specialty || "therapy",
				language: "ru",
			};

			const response = await fetch(this.options.syncEndpoint, {
				method: "POST",
				headers,
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				return {
					success: false,
					error: `Бэкенд вернул статус ${response.status}`,
				};
			}

			const data = (await response.json()) as { text?: string };
			const textResult = data?.text || record.rawText;
			return {
				success: true,
				...(textResult ? { text: textResult } : {}),
			};
		}

		// 2. Если есть готовый rawText — отправляем на полировку или сохранение
		if (record.rawText && record.rawText.trim()) {
			const polishPayload = {
				transcript: record.rawText,
				specialty: record.specialty || "therapy",
				patientId: record.context.patientId || null,
				visitId: record.context.visitId || null,
				organizationId: record.context.organizationId || null,
			};

			try {
				const response = await fetch("/api/speech/polish-transcript", {
					method: "POST",
					headers,
					body: JSON.stringify(polishPayload),
				});

				if (response.ok) {
					const data = (await response.json()) as {
						polishedTranscript?: string;
					};
					return {
						success: true,
						text: data?.polishedTranscript || record.rawText,
					};
				}
			} catch {
				// Если полировка недоступна, сохраняем сырой текст
			}

			return {
				success: true,
				text: record.rawText,
			};
		}

		return {
			success: true,
			text: record.rawText || "",
		};
	}

	public dispose(): void {
		this.isDisposed = true;
		this.stopAutoSync();

		if (
			typeof window !== "undefined" &&
			typeof window.removeEventListener === "function"
		) {
			if (this.boundOnlineHandler) {
				window.removeEventListener("online", this.boundOnlineHandler);
				this.boundOnlineHandler = null;
			}
			if (this.boundOfflineHandler) {
				window.removeEventListener("offline", this.boundOfflineHandler);
				this.boundOfflineHandler = null;
			}
		}
	}
}

export const globalVoiceOfflineQueue = new VoiceOfflineQueue();
