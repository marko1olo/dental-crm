import type {
	FieldConflictDetail,
	MutationVector,
	SyncMutationEnvelope,
	SyncMutationResult,
	SyncMutationStatus,
	SyncPushBatchRequest,
	SyncPushBatchResponse,
} from "@dental/shared";

export type {
	FieldConflictDetail,
	MutationVector,
	SyncMutationEnvelope,
	SyncMutationResult,
	SyncMutationStatus,
	SyncPushBatchRequest,
	SyncPushBatchResponse,
};

/**
 * Standard replication logger contract for audit and telemetry.
 */
export interface SyncLogger {
	info(...args: unknown[]): void;
	warn(...args: unknown[]): void;
	error(...args: unknown[]): void;
}

/**
 * Execution options for batch push operations.
 */
export interface SyncProcessOptions {
	logger?: SyncLogger;
}

/**
 * Replication node status for multi-branch sync topology.
 */
export type SyncNodeStatus =
	| "online"
	| "offline"
	| "syncing"
	| "conflicted"
	| "degraded";

/**
 * Node metadata and heartbeat tracking.
 */
export interface SyncNodeInfo {
	nodeId: string;
	organizationId: string;
	status: SyncNodeStatus;
	lastSeenAt: string;
	pendingMutationsCount: number;
	clientVersion?: string;
}

/**
 * Offline queued mutation task representation.
 */
export interface SyncQueueItem {
	queueId: string;
	organizationId: string;
	mutation: SyncMutationEnvelope;
	enqueuedAt: string;
	retryCount: number;
	lastError?: string;
}

/**
 * Replication queue telemetry metrics.
 */
export interface SyncQueueStats {
	organizationId: string;
	pendingCount: number;
	processingCount: number;
	deadLetterCount: number;
	oldestEnqueuedAt?: string | undefined;
}

/**
 * Security validation result for cryptographic/hash integrity checks.
 */
export interface SyncSecurityValidationResult {
	isValid: boolean;
	error?: string;
}

/**
 * Normalized tooth item structure parsed from odontogram mutation payloads.
 */
export interface OdontogramParsedTooth {
	toothNumber: number;
	state: string;
	surfaces: unknown;
	notes: string | null;
	visitId?: string | null;
}

/**
 * Generic handler result for entity-specific mutation handlers.
 */
export interface EntityMutationHandlerResult {
	status: SyncMutationStatus;
	entity: Record<string, unknown>;
	mergedFields?: string[];
	conflicts?: FieldConflictDetail[];
}

/**
 * Comprehensive result of pulling changed records for offline catch-up.
 */
export interface SyncPullResult {
	serverTime: string;
	patients: unknown[];
	visits: unknown[];
	visitDiaries: unknown[];
	payments: unknown[];
	appointments: unknown[];
	toothStates: unknown[];
	vectors: unknown[];
}
