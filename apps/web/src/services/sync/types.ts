/**
 * DENTE CRM — Client-Side Bidirectional Synchronization Types
 *
 * Contracts for:
 * 1. Bidirectional synchronization engine (Push & Pull)
 * 2. Field-Level Last-Write-Wins (LWW) and multi-entity CRDT conflict resolution
 * 3. Idempotency Key validation (RFC 9562 UUIDv7 + SHA-256 state payload hash)
 * 4. Multi-tier network transitions (Cloud VPS <-> Wi-Fi Local Mesh <-> Autonomous Offline)
 */

import type {
	ConflictResolutionStrategy,
	FieldConflictDetail,
	LanMeshNode,
	LanNodeRole,
	MutationVector,
	SyncMutationAction,
	SyncMutationEntityKind,
	SyncMutationEnvelope,
	SyncMutationResult,
	SyncMutationStatus,
	SyncPushBatchRequest,
	SyncPushBatchResponse,
	SyncTierMode,
	VectorClock,
} from "@dental/shared";

export type {
	ConflictResolutionStrategy,
	FieldConflictDetail,
	LanMeshNode,
	LanNodeRole,
	MutationVector,
	SyncMutationAction,
	SyncMutationEntityKind,
	SyncMutationEnvelope,
	SyncMutationResult,
	SyncMutationStatus,
	SyncPushBatchRequest,
	SyncPushBatchResponse,
	SyncTierMode,
	VectorClock,
};

export interface SyncEngineOptions {
	gatewayUrl?: string | undefined;
	batchSize?: number | undefined;
	maxRetries?: number | undefined;
	baseBackoffMs?: number | undefined;
	maxBackoffMs?: number | undefined;
	jitter?: boolean | undefined;
	autoSyncOnReconnect?: boolean | undefined;
	autoSyncIntervalMs?: number | undefined;
	organizationId?: string | undefined;
	fetchImpl?: typeof fetch | undefined;
	headers?: Record<string, string> | undefined;
}

export interface SyncProgressState {
	isSyncing: boolean;
	totalPending: number;
	processedCount: number;
	appliedCount: number;
	duplicateCount: number;
	mergedCount: number;
	failedCount: number;
	lastSyncTimestampIso: string | null;
	lastSyncError: string | null;
	activeTier: SyncTierMode;
}

export interface BidirectionalSyncResult {
	pushedBatch: {
		processedCount: number;
		appliedCount: number;
		duplicateCount: number;
		mergedCount: number;
		rejectedCount: number;
		failedCount: number;
		conflicts: FieldConflictDetail[];
		errors: Array<{ mutationId: string; error: string }>;
	};
	pulledChanges: {
		receivedCount: number;
		appliedLocallyCount: number;
		conflicts: FieldConflictDetail[];
	};
	serverTime?: string | undefined;
	syncedAtIso: string;
}

export interface ConflictAuditRecord {
	conflictId: string;
	entityKind: SyncMutationEntityKind;
	entityId: string;
	mutationId: string;
	field: string;
	clientValue: unknown;
	serverValue: unknown;
	resolvedValue: unknown;
	strategy: ConflictResolutionStrategy;
	winner: "client" | "server" | "merged";
	resolvedAtIso: string;
	reason: string;
}

export type SyncEngineEventListener = (event: {
	type:
		| "sync_start"
		| "sync_progress"
		| "sync_complete"
		| "sync_error"
		| "conflict_detected"
		| "tier_changed";
	data: unknown;
}) => void;
