/**
 * voiceOfflineQueueCore.ts — Отказоустойчивая очередь диктовки в IndexedDB с in-memory фолбеком
 */

import {
	type EnqueueTranscriptionInput,
	type OfflineTranscriptionStatus,
	type PendingTranscriptionRecord,
	type VoiceOfflineQueueOptions,
	VOICE_OFFLINE_DB_NAME,
	VOICE_OFFLINE_DB_VERSION,
} from "./types";
import type { StorageDriver } from "./storageDriverInterface";
import { InMemoryStorageDriver } from "./inMemoryStorageDriver";
import { IndexedDbStorageDriver } from "./indexedDbStorageDriver";
import { processPendingQueue } from "./offlineQueueProcessor";

export class VoiceOfflineQueue {
	private options: VoiceOfflineQueueOptions;
	private storage: StorageDriver;
	private isSyncing = false;
	private autoSyncTimer: NodeJS.Timeout | null = null;
	private boundOnlineHandler: (() => void) | null = null;
	private isDisposed = false;
	private queueSeq = 0;

	constructor(options: VoiceOfflineQueueOptions = {}) {
		this.options = {
			dbName: options.dbName ?? VOICE_OFFLINE_DB_NAME,
			dbVersion: options.dbVersion ?? VOICE_OFFLINE_DB_VERSION,
			maxRetries: options.maxRetries ?? 5,
			syncEndpoint: options.syncEndpoint ?? "/api/speech/transcribe-chunk",
			autoSyncIntervalMs: options.autoSyncIntervalMs ?? 30000,
			autoProcessOnEnqueue: options.autoProcessOnEnqueue ?? (options.autoSyncIntervalMs !== undefined ? options.autoSyncIntervalMs > 0 : true),
			syncHandler: options.syncHandler,
			onSyncSuccess: options.onSyncSuccess,
			onSyncProgress: options.onSyncProgress,
			onSyncError: options.onSyncError,
			onQueueChange: options.onQueueChange,
			onBadgeMessage: options.onBadgeMessage,
		};

		const hasIdb = typeof window !== "undefined" && "indexedDB" in window && window.indexedDB !== null;
		this.storage = hasIdb ? new IndexedDbStorageDriver(this.options.dbName!, this.options.dbVersion!) : new InMemoryStorageDriver();

		if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
			this.boundOnlineHandler = () => { void this.processQueue(); };
			window.addEventListener("online", this.boundOnlineHandler);
		}
		this.startAutoSync();
	}

	public startAutoSync(): void {
		if (this.autoSyncTimer || this.isDisposed || !this.options.autoSyncIntervalMs) return;
		this.autoSyncTimer = setInterval(() => {
			if (typeof document !== "undefined" && document.hidden) return;
			void this.processQueue();
		}, this.options.autoSyncIntervalMs);
		if (this.autoSyncTimer && typeof this.autoSyncTimer.unref === "function") this.autoSyncTimer.unref();
	}

	public stopAutoSync(): void {
		if (this.autoSyncTimer) { clearInterval(this.autoSyncTimer); this.autoSyncTimer = null; }
	}

	public async enqueue(input: EnqueueTranscriptionInput): Promise<PendingTranscriptionRecord> {
		const record: PendingTranscriptionRecord = {
			id: input.id ?? `voice_off_${Date.now()}_${++this.queueSeq}`,
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
		const all = await this.storage.getAll();
		this.options.onQueueChange?.(all);
		if (this.options.autoProcessOnEnqueue && this.isOnline()) void this.processQueue();
		return record;
	}

	public async get(id: string): Promise<PendingTranscriptionRecord | null> { return this.storage.get(id); }
	public async getAll(): Promise<PendingTranscriptionRecord[]> { return this.storage.getAll(); }
	public async getPending(): Promise<PendingTranscriptionRecord[]> {
		const all = await this.storage.getAll();
		return all.filter((r) => (r.status === "pending" || r.status === "failed") && r.retryCount < (this.options.maxRetries ?? 5));
	}
	public async countPending(): Promise<number> { return (await this.getPending()).length; }

	public async updateStatus(id: string, status: OfflineTranscriptionStatus, extra?: { lastError?: string | null; syncedAt?: number | null; retryCount?: number }): Promise<void> {
		const rec = await this.storage.get(id);
		if (!rec) return;
		const updated: PendingTranscriptionRecord = {
			...rec,
			status,
			lastError: extra?.lastError !== undefined ? extra.lastError : rec.lastError,
			syncedAt: extra?.syncedAt !== undefined ? extra.syncedAt : rec.syncedAt,
			retryCount: extra?.retryCount !== undefined ? extra.retryCount : rec.retryCount,
		};
		await this.storage.put(updated);
		this.options.onQueueChange?.(await this.storage.getAll());
	}

	public async delete(id: string): Promise<void> {
		await this.storage.delete(id);
		this.options.onQueueChange?.(await this.storage.getAll());
	}

	public async clearSynced(olderThanMs = 0): Promise<number> {
		const all = await this.storage.getAll();
		let count = 0;
		for (const r of all) {
			if (r.status === "synced" && (olderThanMs <= 0 || (r.syncedAt && Date.now() - r.syncedAt >= olderThanMs))) {
				await this.storage.delete(r.id);
				count++;
			}
		}
		if (count > 0) this.options.onQueueChange?.(await this.storage.getAll());
		return count;
	}

	public async clearAll(): Promise<void> {
		await this.storage.clear();
		this.options.onQueueChange?.([]);
	}

	public isOnline(): boolean {
		return typeof navigator !== "undefined" && typeof navigator.onLine === "boolean" ? navigator.onLine : true;
	}

	public async processQueue(): Promise<PendingTranscriptionRecord[]> {
		if (this.isSyncing || this.isDisposed || !this.isOnline()) return [];
		this.isSyncing = true;
		try {
			return await processPendingQueue(this.storage, this.options, (id, status, extra) => this.updateStatus(id, status, extra));
		} finally {
			this.isSyncing = false;
		}
	}

	public dispose(): void {
		this.isDisposed = true;
		this.stopAutoSync();
		if (this.boundOnlineHandler && typeof window !== "undefined") {
			window.removeEventListener("online", this.boundOnlineHandler);
			this.boundOnlineHandler = null;
		}
	}
}

export const globalVoiceOfflineQueue = new VoiceOfflineQueue();
