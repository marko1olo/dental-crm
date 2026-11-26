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
 * Options for paginated catch-up pull synchronization.
 */
export interface SyncPullOptions {
	limit?: number | undefined;
	cursor?: string | undefined;
}

/**
 * Comprehensive result of pulling changed records for offline catch-up.
 */
export interface SyncPullResult {
	serverTime: string;
	nextCursor: string | null;
	hasMore: boolean;
	limit: number;
	patients: unknown[];
	visits: unknown[];
	visitDiaries: unknown[];
	payments: unknown[];
	appointments: unknown[];
	toothStates: unknown[];
	vectors: unknown[];
	invoices?: unknown[] | undefined;
}

/**
 * Safely converts an entity model to a Record<string, unknown> without double casting.
 */
export function toEntityRecord(entity: unknown): Record<string, unknown> | null {
	if (!entity || typeof entity !== "object" || Array.isArray(entity)) return null;
	const record: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(entity)) {
		record[key] = value;
	}
	return record;
}

/**
 * Safely ensures an entity model is returned as a plain Record<string, unknown>.
 */
export function ensureEntityRecord(entity: unknown): Record<string, unknown> {
	return toEntityRecord(entity) ?? {};
}

