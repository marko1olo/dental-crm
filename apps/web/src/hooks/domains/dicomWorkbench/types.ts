/**
 * DICOM Workbench Types (Layer 0)
 *
 * Core contracts for radiological workspace: CT/CBCT series inspection,
 * Hounsfield Unit (HU) windowing, MPR slice synchronization, 3D measurements.
 */

import type { Dashboard } from "@dental/shared";
import type {
	DicomFirstFramePreviewMetadata,
	DicomFirstFramePreviewOptions,
	LocalImagingFolderDraft,
} from "../../../AppConstants";

export interface DicomAuthContext {
	denteClinicalReadHeaders(
		extra?: Record<string, string>,
	): Record<string, string>;
	denteClinicalMutationHeaders(
		extra?: Record<string, string>,
	): Record<string, string>;
	settingsAccessHeaders(extra?: Record<string, string>): Record<string, string>;
	revokeObjectUrlMap(map: Record<string, string>): void;
	revokeObjectUrlIfNeeded(url: string): void;
}

export interface DicomFirstFramePreviewRequestContext {
	folderPath: string;
	metadata: DicomFirstFramePreviewMetadata;
}

export interface UseDicomWorkbenchParams {
	auth: DicomAuthContext;
	currentView: string;
	visibleImagingStudies: Dashboard["imagingStudies"];
}

export type DicomMprPlane = "axial" | "coronal" | "sagittal";

export interface DicomWindowPresetConfig {
	windowCenter: number;
	windowWidth: number;
	label: string;
	description?: string;
}

export interface DicomPoint2D {
	x: number;
	y: number;
}

export interface DicomPoint3D {
	x: number;
	y: number;
	z: number;
}

export interface RoiHounsfieldStats {
	meanHu: number;
	minHu: number;
	maxHu: number;
	stdDev: number;
	pixelCount: number;
}

export type BoneDensityQualityClass = "D1" | "D2" | "D3" | "D4" | "D5";

export interface DicomMeasurementResult {
	id: string;
	type: "ruler" | "angle" | "roi_hu";
	value: number;
	unit: "mm" | "deg" | "HU";
	points: DicomPoint2D[];
	label?: string;
	boneDensityClass?: BoneDensityQualityClass;
}
