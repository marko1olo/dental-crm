/**
 * DENTE CRM — Offline Backup & Vault Types
 * Layer 0: Data Contracts, Transfer Objects & Storage Keys
 */

import type {
	DatabaseSnapshot,
	DenteBackupHeader,
	DenteBackupItemsCount,
	DenteBackupPayload,
	DenteBackupValidationResult,
	DryRunRestoreResult,
} from "@dental/shared";
import type {
	CachedActiveSchedule,
	CachedIcd10Dictionary,
	CachedOdontogram,
	CachedPatientCard,
	CachedPriceList804n,
	OfflineDraft,
	OfflineMutation,
} from "../types";

export type {
	DatabaseSnapshot,
	DenteBackupHeader,
	DenteBackupItemsCount,
	DenteBackupPayload,
	DenteBackupValidationResult,
	DryRunRestoreResult,
	CachedActiveSchedule,
	CachedIcd10Dictionary,
	CachedOdontogram,
	CachedPatientCard,
	CachedPriceList804n,
	OfflineDraft,
	OfflineMutation,
};

export interface CachedClinicalItem {
	cacheKey: string;
	entityKind: string;
	entityId: string;
	data: unknown;
	organizationId?: string | undefined;
}

export interface ExportBackupOptions {
	passphrase?: string | undefined;
	organizationId?: string | undefined;
	filename?: string | undefined;
	autoDownload?: boolean | undefined;
	encryptionAlgorithm?: "AES-GCM-256" | "DENTE-STREAM-XOR" | undefined;
	preferFileSystemPicker?: boolean | undefined;
	meta?: DenteBackupPayload["meta"] | undefined;
}

export interface ExportBackupResult {
	backupString: string;
	filename: string;
	header: DenteBackupHeader;
	stats: DenteBackupItemsCount;
	savedDirectlyToDisk?: boolean | undefined;
}

export interface RestoreBackupResult {
	success: boolean;
	header: DenteBackupHeader;
	restoredCount: {
		mutations: number;
		drafts: number;
		clinicalCache: number;
		schedules: number;
		patients: number;
		odontograms: number;
		pricelists: number;
		icd10: number;
	};
	errors: string[];
}

export interface LocalVaultSnapshotMeta {
	id: string;
	timestamp: string;
	timestampMs: number;
	filename: string;
	sizeBytes: number;
	organizationId?: string | undefined;
	itemsCount: DenteBackupItemsCount;
	payloadSha256: string;
	autoSnapshot: boolean;
}

export interface AutoBackupScheduleOptions {
	intervalMinutes?: number | undefined;
	organizationId?: string | undefined;
	passphrase?: string | undefined;
	maxLocalSnapshots?: number | undefined;
	onBackupComplete?: ((result: ExportBackupResult) => void) | undefined;
	onBackupError?: ((error: Error) => void) | undefined;
}

export interface AutoBackupScheduleStatus {
	isRunning: boolean;
	intervalMinutes: number;
	lastBackupAt: string | null;
	lastBackupStatus: "success" | "error" | null;
	lastBackupFilename: string | null;
	totalSnapshotsInVault: number;
	nextScheduledRunAt: string | null;
}

export const LOCAL_VAULT_STORAGE_KEY = "dente_vault_snapshots_v1";
export const LOCAL_VAULT_MAX_DEFAULT_SNAPSHOTS = 12;
