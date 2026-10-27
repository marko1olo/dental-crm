/**
 * types.ts — Типы данных и константы отказоустойчивой очереди диктовки DENTE
 */

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
