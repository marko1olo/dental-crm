/**
 * types.ts — Константы и интерфейсы IndexedDB офлайн-хранилища DICOM (Мандат 8b <= 120 строк).
 */

export const DICOM_OFFLINE_DB_NAME = "dente-dicom-offline-cache";
export const DICOM_OFFLINE_DB_VERSION = 2;

export const DICOM_OFFLINE_STORE_NAME = "pending_studies";
export const DICOM_STUDIES_STORE_NAME = "local_studies";
export const DICOM_SLICES_STORE_NAME = "local_slices";

export type DicomSyncStatus = "pending_sync" | "synced" | "sync_failed";

export function generateRecordId(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	return `id_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export interface OfflineDicomRecord {
	id: string;
	fileName: string;
	data: ArrayBuffer;
	size: number;
	savedAt: string;
	syncStatus: "pending_sync";
	syncStatusLabel: "Ожидает синхронизации";
	studyInstanceUid?: string;
	patientId?: string | null;
}

export interface LocalDicomStudyRecord {
	studyInstanceUid: string;
	seriesUid: string;
	patientId: string | null;
	sliceCount: number;
	dimensions: { width: number; height: number; depth: number };
	voxelSpacing: { x: number; y: number; z: number };
	studyDate: string;
	title: string;
	savedAt: string;
	syncedAt: string | null;
	syncStatus: DicomSyncStatus;
	syncStatusLabel: string;
	syncError?: string | null;
}

export interface LocalDicomSliceRecord {
	id: string;
	studyInstanceUid: string;
	seriesUid: string;
	sopInstanceUid: string;
	sliceIndex: number;
	fileName: string;
	data: ArrayBuffer;
	size: number;
	syncStatus: "pending_sync" | "synced";
	savedAt: string;
}

export interface SaveLocalDicomStudyInput {
	studyInstanceUid: string;
	seriesUid?: string | undefined;
	patientId?: string | null | undefined;
	sliceCount?: number | undefined;
	dimensions?: { width: number; height: number; depth: number } | undefined;
	voxelSpacing?: { x: number; y: number; z: number } | undefined;
	studyDate?: string | undefined;
	title?: string | undefined;
	slices: Array<{
		name: string;
		buffer: ArrayBuffer;
		sopInstanceUid?: string | undefined;
	}>;
}

export interface ParsedDicomHeaderInfo {
	studyInstanceUid: string;
	seriesUid?: string | undefined;
	sopInstanceUid?: string | undefined;
	patientName?: string | undefined;
	patientId?: string | undefined;
	studyDate?: string | undefined;
}
