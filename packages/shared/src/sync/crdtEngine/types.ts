/**
 * DENTE CRM — Offline CRDT Synchronization Engine: Domain Types & Contracts
 * Layer 0: Pure interfaces, types and Zod schemas (0 runtime side effects).
 */

import { z } from "zod";
import type {
	FieldConflictDetail,
	MutationVector,
	SyncMutationAction,
	SyncMutationEntityKind,
	SyncMutationEnvelope,
	SyncPushBatchRequest,
	SyncPushBatchResponse,
	SyncTierMode,
	VectorClock,
} from "../types.js";

export type {
	FieldConflictDetail,
	MutationVector,
	SyncMutationAction,
	SyncMutationEntityKind,
	SyncMutationEnvelope,
	SyncPushBatchRequest,
	SyncPushBatchResponse,
	SyncTierMode,
	VectorClock,
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. LWW CRDT Records & Serialization Contracts
// ─────────────────────────────────────────────────────────────────────────────

export interface LwwElementRecord<T> {
	readonly element: T;
	readonly timestamp: number;
	readonly lamportTime: number;
	readonly authorId?: string | undefined;
}

export interface SerializedLwwElementSet<T = unknown> {
	addSet: Array<{
		key: string;
		element: T;
		timestamp: number;
		lamportTime: number;
		authorId?: string | undefined;
	}>;
	removeSet: Array<{
		key: string;
		element: T;
		timestamp: number;
		lamportTime: number;
		authorId?: string | undefined;
	}>;
}

export interface LwwMapEntry<V> {
	readonly value: V;
	readonly timestamp: number;
	readonly lamportTime: number;
	readonly authorId?: string | undefined;
	readonly version: number;
	readonly isDeleted: boolean;
}

export interface SerializedLwwMap<V = unknown> {
	entries: Array<{
		key: string;
		value: V;
		timestamp: number;
		lamportTime: number;
		authorId?: string | undefined;
		version: number;
		isDeleted: boolean;
	}>;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Clinical Domain Schemas & SOAP Diary Contracts
// ─────────────────────────────────────────────────────────────────────────────

export const dentalToothStatusSchema = z.enum([
	"healthy",
	"caries",
	"pulpitis",
	"periodontitis",
	"filling",
	"crown",
	"implant",
	"extracted",
	"extracted_absent",
	"absent",
	"fracture",
	"root",
	"veneer",
	"recession",
	"temporary_filling",
	"inlay",
	"mobility",
]);
export type DentalToothStatus = z.infer<typeof dentalToothStatusSchema>;

export const dentalSurfaceSchema = z.enum([
	"O",
	"M",
	"D",
	"V",
	"B",
	"L",
	"P",
	"R",
	"C",
]);
export type DentalSurface = z.infer<typeof dentalSurfaceSchema>;

export interface SoapMedicalDiaryRecord {
	id: string;
	visitId?: string | undefined;
	patientId?: string | undefined;
	doctorId?: string | undefined;
	subjective?: {
		complaints?: string | undefined;
		anamnesisMorbi?: string | undefined;
		anamnesisVitae?: string | undefined;
		allergies?: string[] | undefined;
		somaticStatus?: string | undefined;
	} | undefined;
	objective?: {
		externalExam?: string | undefined;
		bite?: string | undefined;
		statusLocalis?: string | undefined;
		hygieneIndex?: number | undefined;
		perioPocketMm?: number | undefined;
		xrayFindings?: string | undefined;
	} | undefined;
	assessment?: {
		diagnosisIcd10?: string | undefined;
		diagnosisText?: string | undefined;
		differentialDiagnosis?: string | undefined;
	} | undefined;
	plan?: {
		treatmentProtocol?: string[] | undefined;
		servicesRendered804n?: string[] | undefined;
		prescriptions?: string[] | undefined;
		postOpRecommendations?: string | undefined;
		nextVisitDateIso?: string | undefined;
	} | undefined;
	complaints?: string | undefined;
	statusLocalis?: string | undefined;
	treatmentProtocol?: string[] | undefined;
	prescriptions?: string[] | undefined;
	updatedAt?: string | undefined;
	authorUserId?: string | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Outbox Queue & Sync Engine Operational Types
// ─────────────────────────────────────────────────────────────────────────────

export type CrdtOutboxStatus = "pending" | "in_flight" | "committed" | "failed";

export interface CrdtOutboxQueueItem<T = unknown> {
	readonly id: string;
	readonly mutationId: string;
	readonly idempotencyKey: string;
	readonly entityKind: SyncMutationEntityKind;
	readonly entityId: string;
	readonly action: SyncMutationAction;
	readonly payload: T;
	readonly payloadHash: string;
	readonly lamportTime: number;
	readonly vectorClock?: VectorClock | undefined;
	readonly mutationVector?: MutationVector | undefined;
	readonly authorUserId?: string | undefined;
	readonly clientId: string;
	readonly organizationId?: string | undefined;
	status: CrdtOutboxStatus;
	retryCount: number;
	lastError?: string | undefined;
	lockOwner?: string | undefined;
	readonly createdAtIso: string;
	readonly createdAtMs: number;
	updatedAtIso: string;
}

export interface CrdtSyncEngineStatus {
	readonly mode: "ONLINE_SYNCED" | "OFFLINE_BUFFERING" | "REPLICATING" | "ERROR";
	readonly isOnline: boolean;
	readonly totalPending: number;
	readonly inFlightCount: number;
	readonly failedCount: number;
	readonly committedCount: number;
	readonly bufferedRecordsCount: {
		appointments: number;
		odontograms: number;
		diaries: number;
		patients: number;
		payments: number;
	};
	readonly oldestPendingTimestampMs: number | null;
	readonly lastSyncTimestampIso: string | null;
	readonly lastSyncError: string | null;
	readonly clockSkewMs: number;
	readonly lamportTime: number;
	readonly activeTier: SyncTierMode;
	readonly survivabilityGrade: "HEALTHY" | "DEGRADED" | "CRITICAL";
	readonly storageDriver: string;
}

export interface CrdtBatchApplyResult {
	readonly processedCount: number;
	readonly appliedCount: number;
	readonly duplicateCount: number;
	readonly mergedCount: number;
	readonly rejectedCount: number;
	readonly conflicts: FieldConflictDetail[];
	readonly errors: string[];
}

export interface CrdtSyncSummary {
	readonly pushedBatch: CrdtBatchApplyResult;
	readonly serverTime?: string | undefined;
	readonly syncedAtIso: string;
	readonly success: boolean;
}

export type CrdtSyncEngineEventType =
	| "status_changed"
	| "mutation_enqueued"
	| "sync_start"
	| "sync_complete"
	| "sync_error"
	| "conflict_resolved";

export type CrdtSyncEngineListener = (event: {
	type: CrdtSyncEngineEventType;
	status?: CrdtSyncEngineStatus | undefined;
	mutation?: CrdtOutboxQueueItem | undefined;
	conflicts?: FieldConflictDetail[] | undefined;
	error?: string | undefined;
}) => void;

// ─────────────────────────────────────────────────────────────────────────────
// 4. Storage Driver & Engine Option Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface CrdtStorageDriver {
	readonly name: string;
	isAvailable(): boolean;
	saveEntity<T>(kind: SyncMutationEntityKind, id: string, data: T, vector?: MutationVector | undefined): Promise<void>;
	loadEntity<T>(kind: SyncMutationEntityKind, id: string): Promise<{ data: T; vector?: MutationVector | undefined } | null>;
	listEntities<T>(kind: SyncMutationEntityKind): Promise<Array<{ id: string; data: T; vector?: MutationVector | undefined }>>;
	deleteEntity(kind: SyncMutationEntityKind, id: string): Promise<void>;
	enqueueOutbox(item: CrdtOutboxQueueItem): Promise<void>;
	getPendingOutbox(): Promise<CrdtOutboxQueueItem[]>;
	getOutboxItem(id: string): Promise<CrdtOutboxQueueItem | null>;
	updateOutboxStatus(id: string, status: CrdtOutboxStatus, error?: string | undefined, lockOwner?: string | undefined): Promise<void>;
	pruneCommittedOutbox(): Promise<number>;
	saveKv(key: string, value: unknown): Promise<void>;
	loadKv<T>(key: string): Promise<T | null>;
	clear(): Promise<void>;
}

export interface CrdtSyncEngineOptions {
	nodeId?: string | undefined;
	organizationId?: string | undefined;
	storageDriver?: CrdtStorageDriver | undefined;
	initialOnline?: boolean | undefined;
	autoSyncIntervalMs?: number | undefined;
}
