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
