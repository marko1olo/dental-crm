/**
 * DENTE CRM — Clinical IndexedDB L2 Type Definitions & Constants
 *
 * Conforms to Mandate 8b (< 500 lines limit).
 */

export const L2_DB_NAME = "dente_clinical_offline_v1";
export const L2_DB_VERSION = 1;

export const L2_STORE_MUTATIONS = "offline_mutations";
export const L2_STORE_PATIENTS = "patient_snapshots";
export const L2_STORE_SCHEDULE = "schedule_cache";

export type L2MutationStatus = "pending" | "synced" | "failed";

export interface L2OfflineMutation<T = unknown> {
	mutationId: string;
	status: L2MutationStatus;
	entityType: string;
	action: string;
	payload: T;
	error?: string | undefined;
	createdAt: string;
	createdAtMs: number;
	syncedAt?: string | undefined;
	organizationId?: string | undefined;
}

export interface PatientSnapshot<T = unknown> {
	patientId: string;
	patientName?: string | undefined;
	emkRecord?: T | undefined;
	odontogram?: unknown | undefined;
	somaticStatus?: unknown | undefined;
	activeVisitId?: string | undefined;
	updatedAt: string;
	updatedAtMs: number;
	organizationId?: string | undefined;
}

export interface ScheduleCacheEntry<T = unknown> {
	scheduleKey: string;
	date: string;
	cabinetId?: string | undefined;
	appointments: T[];
	updatedAt: string;
	updatedAtMs: number;
	organizationId?: string | undefined;
}

export interface L2StorageStatus {
	isReady: boolean;
	isPersisted: boolean;
	storageType: "indexeddb" | "memory_fallback";
	patientSnapshotsCount: number;
	scheduleSnapshotsCount: number;
	pendingMutationsCount: number;
	lastSavedAt: string | null;
	lastHydratedAt: string | null;
}
