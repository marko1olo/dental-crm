/**
 * pacsTypes.ts — Типы данных локального хранилища PACS и устойчивости рентген-снимков.
 */

import type { ImagingStudyKind } from "@dental/shared";

export type CloudSyncStatus = "local_only" | "sync_queued" | "syncing" | "synced" | "sync_failed";

export interface LocalRadiologyScanInput {
	readonly organizationId: string;
	readonly patientId: string;
	readonly visitId?: string | null | undefined;
	readonly doctorId?: string | null | undefined;
	readonly kind: ImagingStudyKind;
	readonly title: string;
	readonly toothCode?: string | null | undefined;
	readonly region?: string | null | undefined;
	readonly localFilePath: string;
	readonly fileSizeBytes?: number | undefined;
	readonly dicomStudyUid?: string | null | undefined;
	readonly dicomSeriesUid?: string | null | undefined;
	readonly dicomSopInstanceUid?: string | null | undefined;
	readonly localThumbnailDataUri?: string | null | undefined;
	readonly sourceName?: string | undefined;
	readonly allowImmediateConsultation?: boolean | undefined;
}

export interface LocalRadiologyScanResult {
	readonly studyId: string;
	readonly organizationId: string;
	readonly patientId: string | null;
	readonly visitId: string | null;
	readonly kind: ImagingStudyKind;
	readonly title: string;
	readonly toothCode: string | null;
	readonly region: string | null;
	readonly localFilePath: string;
	readonly localOfflineAvailable: true;
	readonly cloudSyncStatus: CloudSyncStatus;
	readonly canStartConsultationImmediately: true;
	readonly capturedAt: string;
	readonly dicomStudyUid: string | null;
	readonly diagnostics: {
		readonly fileSizeMb: number;
		readonly fileExistsLocally: boolean;
		readonly localReadinessScore: number;
		readonly thumbnailAvailable: boolean;
		readonly isMultiGigabyteScan: boolean;
	};
}

export interface LocalPacsSyncQueueItem {
	readonly studyId: string;
	readonly patientId: string | null;
	readonly title: string;
	readonly localFilePath: string;
	readonly fileSizeBytes: number;
	readonly syncStatus: CloudSyncStatus;
	readonly createdAt: string;
	readonly lastSyncAttemptAt?: string | null | undefined;
	readonly syncError?: string | null | undefined;
}
