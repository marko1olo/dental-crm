/**
 * visiographHotFolderTypes.ts — Canonical Types for Visiograph Hot Folder Hardware Subsystem.
 *
 * Implements Mandates 8e (Doctor Autonomy, zero sensor lock-in), 8s (Domain Authority).
 * Strictly conforms to monorepo length limits (<500 lines).
 */

import type { SensorBrandId } from "../components/radiology/sensorGateway/types";

export interface VisiographDetectedScan {
	readonly id: string;
	readonly fileName: string;
	readonly fileSize: number;
	readonly formattedSize: string;
	readonly fileType: string;
	readonly brand: SensorBrandId;
	readonly brandName: string;
	readonly modelId: string;
	readonly modelName: string;
	readonly folderPath: string;
	readonly detectedAtIso: string;
	readonly thumbnailUrl?: string | undefined;
	readonly file?: File | Blob | undefined;
	readonly detectedTooth?: string | undefined;
	readonly confidence: number;
	readonly studyId?: string | undefined;
}

export interface HotFolderWatcherConfig {
	readonly pollIntervalMs?: number;
	readonly debounceWindowMs?: number;
	readonly allowedExtensions?: readonly string[];
	readonly defaultBrand?: SensorBrandId;
}

export interface HotFolderScanSimulatedDetail {
	readonly fileName: string;
	readonly fileSize?: number;
	readonly folderPath?: string;
	readonly imageUrl?: string;
	readonly tooth?: string;
	readonly brand?: SensorBrandId;
	readonly modelId?: string;
}

export interface SensorFileDroppedDetail {
	readonly file: File;
	readonly folderPath?: string;
	readonly tooth?: string;
}

export interface AttachPhotoToVisitDetail {
	readonly url: string;
	readonly name?: string | undefined;
	readonly toothNumber?: string | undefined;
	readonly photoType?: "before" | "after" | "xray" | "periapical" | undefined;
	readonly width?: number | undefined;
	readonly height?: number | undefined;
	readonly studyId?: string | undefined;
}

export interface OpenDirectRvgDetail {
	readonly imageUrl: string;
	readonly tooth?: string | undefined;
	readonly brandName?: string | undefined;
	readonly fileName?: string | undefined;
	readonly studyId?: string | undefined;
}

export type VisiographScanListener = (scan: VisiographDetectedScan | null, queueLength: number) => void;
