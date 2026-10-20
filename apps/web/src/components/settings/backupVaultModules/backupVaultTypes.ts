/**
 * DENTE CRM — Offline Backup Vault Types
 * Comprehensive data contracts for sovereign database backups,
 * AES-GCM-256 encryption, ZSTD compression, and emergency recovery.
 */

import type {
	DatabaseSnapshot,
	DenteBackupHeader,
	DenteBackupItemsCount,
	DryRunRestoreResult,
	OfflineSyncQueueStatus,
} from "@dental/shared";
import type {
	ExportBackupResult,
	LocalVaultSnapshotMeta,
	RestoreBackupResult,
} from "../../../services/offline/offlineBackupService";
import type { OfflineCacheIntegrityReport } from "../../../services/offline/offlineIntegrityService";

export type VaultSnapshotType = "full" | "incremental";

export type VaultEncryptionStatus = "AES-GCM-256" | "UNENCRYPTED";

export interface VaultDatabaseSnapshot {
	readonly id: string;
	readonly timestamp: string;
	readonly timestampMs: number;
	readonly filename: string;
	readonly sizeBytes: number;
	readonly sizeFormatted: string;
	readonly sha256Checksum: string;
	readonly tablesCount: number;
	readonly recordsCount: number;
	readonly snapshotType: VaultSnapshotType;
	readonly encryptionStatus: VaultEncryptionStatus;
	readonly autoSnapshot: boolean;
	readonly notes?: string | undefined;
}

export interface VaultSnapshotVerification {
	readonly valid: boolean;
	readonly hashMatches: boolean;
	readonly verifiedAt: string;
	readonly details?: string | undefined;
	readonly error?: string | undefined;
}

export type BackupScheduleFrequency = "daily_night" | "hourly" | "custom";

export interface BackupScheduleConfigState {
	readonly enabled: boolean;
	readonly scheduleType: BackupScheduleFrequency;
	readonly nightlyDumpTime: string; // e.g. "03:00"
	readonly intervalMinutes: number;
	readonly retentionDays: number; // e.g. 30 days
	readonly compressionAlgorithm: "zstd" | "gzip";
	readonly maxLocalSnapshots: number;
	readonly lastRunAt: string | null;
	readonly nextRunAt: string | null;
}

export interface LocalVaultStorageStats {
	readonly usedBytes: number;
	readonly totalQuotaBytes: number;
	readonly usedFormatted: string;
	readonly quotaFormatted: string;
	readonly usagePercentage: number;
	readonly indexedDbBytes: number;
	readonly sqliteFallbackBytes: number;
	readonly encryptionKeyStatus: "ACTIVE_SOVEREIGN" | "DERIVED_PASSPHRASE" | "MISSING";
	readonly encryptionKeyFingerprint: string;
	readonly storageDriver: "indexeddb" | "sqlite_opfs" | "memory";
}

export type EmergencyRestoreStep =
	| "SELECT_SOURCE"
	| "VERIFY_CHECKSUM"
	| "TRANSACTION_GUARD"
	| "EXECUTE_RESTORE"
	| "COMPLETE";

export interface EmergencyRestoreState {
	readonly step: EmergencyRestoreStep;
	readonly selectedSnapshotId: string | null;
	readonly rawBackupText: string | null;
	readonly fileName: string | null;
	readonly checksumSha256: string | null;
	readonly checksumValid: boolean | null;
	readonly pendingMutationsCount: number;
	readonly preRestoreBackupCreated: boolean;
	readonly isProcessing: boolean;
	readonly error: string | null;
	readonly result: RestoreBackupResult | null;
}

export type {
	DatabaseSnapshot,
	DenteBackupHeader,
	DenteBackupItemsCount,
	DryRunRestoreResult,
	OfflineSyncQueueStatus,
	ExportBackupResult,
	LocalVaultSnapshotMeta,
	RestoreBackupResult,
	OfflineCacheIntegrityReport,
};
