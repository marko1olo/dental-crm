/**
 * DENTE CRM — Offline-First & Multi-Level Sync Type Definitions
 *
 * Строго типизированные контракты:
 * - Локальная очередь мутаций (Outbox) в IndexedDB / LocalStorage
 * - Черновики клинических форм (043/у, одонтограмма, 107-1/у, документы, чеки)
 * - Пакетный шлюз синхронизации (Sync Gateway) с векторными часами
 * - Стратегии разрешения конфликтов Field-Level LWW / CRDT
 * - Экспоненциальный бэкофф и метрики непрерывности рабочего пространства
 */

import type {
	FieldConflictDetail,
	MutationVector,
	SyncMutationAction,
	SyncMutationEntityKind,
	SyncMutationStatus,
} from "@dental/shared";

export type MutationEntityType =
	| "DIARY_043_DRAFT"
	| "ODONTOGRAM_STATUS"
	| "PRESCRIPTION_107_DRAFT"
	| "DOCUMENT_DRAFT"
	| "CASH_RECEIPT_DRAFT"
	| "APPOINTMENT_BOOKING_DRAFT"
	| "TREATMENT_PLAN_DRAFT"
	| "PATIENT_DRAFT"
	| "GENERIC"
	| "odontogram"
	| "treatment_plan"
	| "visit"
	| "patient"
	| "patient_card_043"
	| "payment"
	| "appointment"
	| "pricelist"
	| "inventory"
	| "prescription"
	| SyncMutationEntityKind;


export type MutationAction = SyncMutationAction | "sync";

export type MutationStatus = "pending" | "syncing" | "synced" | "failed";

export interface OfflineMutation<T = unknown> {
	mutationId: string;
	idempotencyKey?: string | undefined;
	payloadHash?: string | undefined;
	entityType: MutationEntityType;
	entityId: string;
	action: MutationAction;
	payload: T;
	timestamp: string; // ISO 8601 with milliseconds (e.g. 2026-08-23T08:30:00.123Z)
	timestampMs: number;
	organizationId?: string | undefined;
	mutationVector?: MutationVector | undefined;
	authorUserId?: string | undefined;
	status: MutationStatus;
	retryCount: number;
	lastError?: string | undefined;
}

export interface OfflineDraft<T = unknown> {
	draftKey: string;
	entityType: MutationEntityType;
	entityId: string;
	data: T;
	updatedAt: string; // ISO 8601 with milliseconds
	updatedAtMs: number;
	organizationId?: string | undefined;
	version: number;
}

export interface EnqueueMutationInput<T = unknown> {
	mutationId?: string | undefined;
	idempotencyKey?: string | undefined;
	entityType: MutationEntityType;
	entityId: string;
	action?: MutationAction | undefined;
	payload: T;
	timestamp?: string | undefined;
	organizationId?: string | undefined;
	mutationVector?: MutationVector | undefined;
	authorUserId?: string | undefined;
}

export interface OfflineQueueMetrics {
	pendingCount: number;
	syncingCount: number;
	failedCount: number;
	syncedCount: number;
	totalDrafts: number;
}

export interface SyncBatchDrainOptions {
	batchSize?: number | undefined;
	maxRetries?: number | undefined;
	baseBackoffMs?: number | undefined;
	maxBackoffMs?: number | undefined;
	jitter?: boolean | undefined;
	organizationId?: string | undefined;
	gatewayUrl?: string | undefined;
	headers?: Record<string, string> | undefined;
	fetchImpl?: typeof fetch | undefined;
}

export interface SyncBatchDrainResult {
	processedCount: number;
	appliedCount: number;
	duplicateCount: number;
	mergedCount: number;
	rejectedCount: number;
	failedCount: number;
	conflicts: FieldConflictDetail[];
	errors: Array<{ mutationId: string; error: string }>;
	serverTime?: string | undefined;
}

export interface SyncConflictEvent {
	mutationId: string;
	entityKind: SyncMutationEntityKind;
	entityId: string;
	conflicts: FieldConflictDetail[];
	appliedAt: string;
}

export type SyncEventListener = (event: {
	type: "progress" | "complete" | "conflict" | "error" | "slow_drain";
	data: unknown;
}) => void;
