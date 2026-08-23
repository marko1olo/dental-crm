/**
 * DENTE Dental CRM — Hardware Services Data Types & Contracts.
 *
 * Defines statutory 54-FZ fiscal register configurations, LAN socket parameters,
 * KKT device telemetry statuses, and local PACS / Visiograph acquisition models.
 */

import type { ImagingStudyKind } from "@dental/shared";
import type { Ffd12ReceiptPayload } from "../kkt/FiscalReceiptFactory.js";

export type KktModelType = "atol_json_tcp" | "atol_web_server" | "shtrikh_m_tcp" | "emulator";

export interface KktLanConfig {
	readonly host: string;
	readonly port: number;
	readonly model: KktModelType;
	readonly timeoutMs?: number | undefined;
	readonly password?: string | undefined;
	readonly deviceNumber?: number | undefined;
}

export interface KktDeviceStatus {
	readonly online: boolean;
	readonly paperOk: boolean;
	readonly coverClosed: boolean;
	readonly fnPresent: boolean;
	readonly fnFiscalized: boolean;
	readonly fnWarning?: string | null | undefined;
	readonly modelName: string;
	readonly firmwareVersion?: string | undefined;
	readonly fnSerial: string;
	readonly kktSerialNumber: string;
	readonly lastCheckAt: string;
	readonly latencyMs: number;
	readonly error?: string | null | undefined;
}

export interface KktPrintResult {
	readonly success: boolean;
	readonly fiscalDocumentNumber?: string | undefined;
	readonly fiscalSign?: string | undefined;
	readonly fnSerial?: string | undefined;
	readonly ofdVerificationUrl?: string | undefined;
	readonly qrString?: string | undefined;
	readonly receiptIssuedAt: string;
	readonly status: "printed" | "hardware_offline";
	readonly errorCode?: string | undefined;
	readonly errorMessage?: string | undefined;
}

export type CloudSyncStatus = "local_only" | "sync_queued" | "syncing" | "synced" | "sync_failed";

export interface LocalRadiologyScanInput {
	readonly organizationId: string;
	readonly patientId: string;
	readonly visitId?: string | null | undefined;
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
	readonly patientId: string;
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
	readonly patientId: string;
	readonly title: string;
	readonly localFilePath: string;
	readonly fileSizeBytes: number;
	readonly syncStatus: CloudSyncStatus;
	readonly createdAt: string;
	readonly lastSyncAttemptAt?: string | null | undefined;
	readonly syncError?: string | null | undefined;
}
