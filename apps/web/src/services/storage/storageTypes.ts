/**
 * DENTE CRM — Client Storage & Clinical Cache Type Definitions
 *
 * Types for:
 * - Offline Outbox & Mutations (IndexedDB Store: mutations)
 * - Clinical Drafts (IndexedDB Store: drafts)
 * - Cached Clinical Entities (IndexedDB Store: clinical_cache)
 * - Persistent Storage & Quota Management
 */

import type {
	EnqueueMutationInput,
	MutationAction,
	MutationEntityType,
	MutationStatus,
	OfflineDraft,
	OfflineMutation,
	OfflineQueueMetrics,
	SyncBatchDrainOptions,
	SyncBatchDrainResult,
	SyncConflictEvent,
	SyncEventListener,
} from "../offline/types";

export type {
	EnqueueMutationInput,
	MutationAction,
	MutationEntityType,
	MutationStatus,
	OfflineDraft,
	OfflineMutation,
	OfflineQueueMetrics,
	SyncBatchDrainOptions,
	SyncBatchDrainResult,
	SyncConflictEvent,
	SyncEventListener,
};

export type CachedEntityKind =
	| "patient"
	| "visit"
	| "appointment"
	| "odontogram"
	| "payment"
	| "pricelist"
	| "inventory"
	| "prescription"
	| "catalog_804n"
	| "catalog_icd10"
	| "catalog_templates";

export interface ClinicalCachedEntity<T = unknown> {
	cacheKey: string;
	entityKind: CachedEntityKind | string;
	entityId: string;
	data: T;
	cachedAt: string;
	cachedAtMs: number;
	organizationId?: string | undefined;
	version?: number | undefined;
}

export interface ClientStorageQuotaInfo {
	usageBytes: number;
	quotaBytes: number;
	percentUsed: number;
	isPersistent: boolean;
	indexedDbAvailable: boolean;
}

export interface StoragePruneReport {
	prunedAt: string;
	ttlDays: number;
	prunedClinicalCacheCount: number;
	prunedDraftsCount: number;
	prunedMutationsCount: number;
	prunedSchedulesCount: number;
	prunedLocalStorageCount: number;
	totalPrunedCount: number;
}

export interface VisitStatusChangedPayload {
	visitId: string;
	status: string;
	previousStatus?: string | undefined;
	patientId?: string | undefined;
	patientName?: string | undefined;
	doctorId?: string | undefined;
	updatedAt: string;
	sourceTabId: string;
}

export interface PatientBalanceChangedPayload {
	patientId: string;
	patientName?: string | undefined;
	balanceRub?: number | undefined;
	balanceKopecks?: number | undefined;
	deltaRub?: number | undefined;
	reason?: string | undefined;
	updatedAt: string;
	sourceTabId: string;
}

export interface ClinicalEntityChangedPayload {
	entityKind?: string | undefined;
	entityType?: string | undefined;
	entityId: string;
	patientId?: string | undefined;
	version?: number | undefined;
	updatedAt: string;
	sourceTabId: string;
}

export type CrossTabSyncEventType =
	| "visit_status_changed"
	| "patient_balance_changed"
	| "clinical_entity_changed";

export interface CrossTabSyncEvent<T = unknown> {
	eventId: string;
	type: CrossTabSyncEventType;
	payload: T;
	timestamp: number;
	sourceTabId: string;
}

