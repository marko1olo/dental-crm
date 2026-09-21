/**
 * DENTE CRM — Offline Storage, Vault Snapshots & Survivability Engine Types
 */

import type { DenteBackupHeader, DenteBackupItemsCount, DenteBackupPayload } from "../sync/backup.js";

export type SnapshotDriverType = "indexeddb" | "sqlite" | "localstorage" | "memory";

export type RestoreIntegrityGrade = "EXCELLENT" | "WARNING" | "CORRUPTED";

export type ReplicationMode = "ONLINE_SYNCED" | "OFFLINE_BUFFERING" | "REPLICATING" | "CONFLICT_PAUSED" | "ERROR";

export interface TableSnapshot<T = unknown> {
	tableName: string;
	rowCount: number;
	tableSha256: string;
	rows: T[];
}

export interface SnapshotMetadata {
	snapshotId: string;
	organizationId?: string | undefined;
	clinicName?: string | undefined;
	createdAtIso: string;
	createdAtMs: number;
	driver: SnapshotDriverType;
	appVersion: string;
	totalRecords: number;
	rootSha256: string;
	notes?: string | undefined;
}

export interface DatabaseSnapshot {
	metadata: SnapshotMetadata;
	tables: {
		mutations: TableSnapshot;
		drafts: TableSnapshot;
		clinicalCache: TableSnapshot;
		schedules?: TableSnapshot | undefined;
		patients?: TableSnapshot | undefined;
		odontograms?: TableSnapshot | undefined;
		pricelists?: TableSnapshot | undefined;
		icd10?: TableSnapshot | undefined;
		payments?: TableSnapshot | undefined;
	};
}

export interface ChecksumValidationResult {
	valid: boolean;
	expectedRootSha256: string;
	calculatedRootSha256: string;
	mismatchedTables: string[];
	checkedTablesCount: number;
	totalRecordsChecked: number;
	errorMessage?: string | undefined;
}

export interface DryRunRestoreOptions {
	passphrase?: string | undefined;
	targetOrganizationId?: string | undefined;
	allowPartialRestore?: boolean | undefined;
	strictChecksumValidation?: boolean | undefined;
}

export interface DryRunRestoreResult {
	dryRunSuccess: boolean;
	integrityGrade: RestoreIntegrityGrade;
	header: DenteBackupHeader | null;
	previewStats: DenteBackupItemsCount;
	checksumVerified: boolean;
	totalRecordsCount: number;
	estimatedPayloadSizeBytes: number;
	warnings: string[];
	errors: string[];
	schemaValidation: {
		mutationsValid: boolean;
		draftsValid: boolean;
		clinicalCacheValid: boolean;
		schedulesValid: boolean;
		patientsValid: boolean;
		odontogramsValid: boolean;
		pricelistsValid: boolean;
		icd10Valid: boolean;
		paymentsValid: boolean;
	};
	executionDurationMs: number;
}

export interface OfflineSyncQueueItem<T = unknown> {
	id: string;
	mutationId: string;
	entityType: string;
	entityId: string;
	action: string;
	timestampIso: string;
	timestampMs: number;
	sequenceNumber: number;
	organizationId?: string | undefined;
	payload: T;
	payloadHash: string;
	status: "pending" | "in_flight" | "failed" | "committed";
	retryCount: number;
	lastError?: string | undefined;
	lockOwner?: string | undefined;
}

export interface OfflineSyncQueueStatus {
	mode: ReplicationMode;
	totalPending: number;
	inFlightCount: number;
	failedCount: number;
	committedCount: number;
	oldestPendingTimestampMs: number | null;
	lastReplicatedTimestampMs: number | null;
	isOnline: boolean;
	storageDriver: SnapshotDriverType;
	survivabilityGrade: "HEALTHY" | "DEGRADED" | "CRITICAL";
	unflushedMemoryBytes: number;
}
