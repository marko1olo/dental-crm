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
	readonly name?: string;
	readonly toothNumber?: string;
	readonly photoType?: "before" | "after" | "xray" | "periapical";
	readonly width?: number;
	readonly height?: number;
}

export interface OpenDirectRvgDetail {
	readonly imageUrl: string;
	readonly tooth?: string;
	readonly brandName?: string;
	readonly fileName?: string;
}

export type VisiographScanListener = (scan: VisiographDetectedScan, queueLength: number) => void;
