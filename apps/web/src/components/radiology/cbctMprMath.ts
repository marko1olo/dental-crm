/**
 * DENTE CRM — CBCT 3D MPR (Multi-Planar Reconstruction) Mathematical Engine
 * Standards: DICOM Part 3 / PS 3.3, Misch (2008), ITI Consensus
 *
 * Capabilities:
 * 1. True 3-Plane Orthogonal MPR: Axial (Z-axis / Horizontal), Coronal (Y-axis / Frontal), Sagittal (X-axis / Profile).
 * 2. Synchronized 3-Plane Crosshair Navigation in Real-World Physical Millimeters (60 FPS).
 * 3. Hounsfield Unit (HU) Window/Level mapping with clinical presets (Bone, Soft Tissue, Enamel, Implant Metal, Airways).
 * 4. Slab Thickness Projection Modes: Single Slice, MIP (Maximum Intensity Projection), MinIP, Average IP (1-30 mm).
 * 5. High-performance zero-GC pixel pipeline with cached typed buffers.
 * 6. Procedural realistic anatomical Dental CBCT voxel volume generator (Mandible, Maxillary Sinus, Alveolar Ridge, Teeth 18..48, Inferior Alveolar Canal).
 */

import {
	type Point2D,
	type Point3D,
	type CbctAngleMeasurement,
	type MeasurementHandleHit,
	type MeasurementObjectHit,
	type CbctMeasurementRuler,
	type CbctProbeMarker,
	CRISP_OVERLAY_PAD_BG,
	CRISP_OVERLAY_BORDER_GOLD,
	CRISP_OVERLAY_BORDER_CYAN,
	CRISP_OVERLAY_BORDER_BLUE,
	calculateAngleBetween3Points2D,
	calculateAngleBetween3Points3D,
	drawMeasurementDeleteButton,
	drawCaliperDeleteButton,
	drawMandibularNerveBadge,
	drawNerveCanalBadge,
	hitTestMeasurementHandle,
	hitTestMeasurementObject,
} from "./cbctCaliperNerveMath";
import {
	type ObliqueRotationAngles,
	type ViewportTransform,
	DEFAULT_OBLIQUE_ROTATION,
	DEFAULT_VIEWPORT_TRANSFORM,
	mapCanvasPointerToWorldMmWithTransform,
} from "./cbctObliqueMatrixMath";

export type MprPlane = "axial" | "coronal" | "sagittal";
export type CbctViewportType = "axial" | "coronal" | "sagittal" | "panoramic" | "cross_section";
export type SlabProjectionMode = "single" | "mip" | "minip" | "average";
export type { Point2D, Point3D, CbctAngleMeasurement, MeasurementHandleHit, MeasurementObjectHit, CbctMeasurementRuler, CbctProbeMarker };
export {
	CRISP_OVERLAY_PAD_BG,
	CRISP_OVERLAY_BORDER_GOLD,
	CRISP_OVERLAY_BORDER_CYAN,
	CRISP_OVERLAY_BORDER_BLUE,
	calculateAngleBetween3Points2D,
	calculateAngleBetween3Points3D,
	drawMeasurementDeleteButton,
	drawCaliperDeleteButton,
	drawMandibularNerveBadge,
	drawNerveCanalBadge,
	hitTestMeasurementHandle,
	hitTestMeasurementObject,
};

export interface VolumeDimensions {
	readonly width: number; // X size (voxels along Sagittal axis)
	readonly height: number; // Y size (voxels along Coronal axis)
	readonly depth: number; // Z size (voxels along Axial axis)
}

export interface VolumeSpacingMm {
	readonly x: number; // mm per voxel (typically 0.15 - 0.3 mm)
	readonly y: number;
	readonly z: number;
}

export interface CbctVoxelVolume {
	readonly id: string;
	readonly dimensions: VolumeDimensions;
	readonly spacingMm: VolumeSpacingMm;
	readonly originMm: Point3D;
	readonly physicalSizeMm: {
		readonly x: number;
		readonly y: number;
		readonly z: number;
	};
	data: Int16Array | null; // Calibrated HU data in 1D contiguous buffer: index = z * (W * H) + y * W + x
	readonly minHU: number;
	readonly maxHU: number;
	readonly rescaleSlope?: number;
	readonly rescaleIntercept?: number;
	readonly defaultWindowWidth?: number;
	readonly defaultWindowLevel?: number;
	readonly isDisposed: boolean;
	readonly isProgressivePreview?: boolean | undefined;
	readonly patientName?: string | undefined;
}

export interface HounsfieldPreset {
	readonly id: string;
	readonly label: string;
	readonly windowWidth: number; // HU range
	readonly windowLevel: number; // HU center
	readonly descriptionRu: string;
}

export const CBCT_HOUNSFIELD_PRESETS: readonly HounsfieldPreset[] = [
	{
		id: "bone_dense",
		label: "Зубы и Кость (Dental)",
		windowWidth: 4400,
		windowLevel: 1300,
		descriptionRu: "Стандарт Romexis/HDXWILL: идеальная видимость пульпы, дентина, эмали и трабекул без засветки",
	},
	{
		id: "enamel_dentin",
		label: "Эндодонтия / Кариес",
		windowWidth: 5500,
		windowLevel: 1600,
		descriptionRu: "Максимальная детализация корневых каналов, апексов, кариозных полостей и периодонтальной щели",
	},
	{
		id: "bone_cortical",
		label: "Кортикал / Гребень",
		windowWidth: 3500,
		windowLevel: 900,
		descriptionRu: "Оценка кортикальных пластинок альвеолярного гребня и плотности по Misch",
	},
	{
		id: "soft_tissue",
		label: "Мягкие ткани",
		windowWidth: 600,
		windowLevel: 50,
		descriptionRu: "Визуализация слизистой оболочки, десны, гайморовой пазухи и мягкотканных тяжей",
	},
	{
		id: "implant_metal",
		label: "Имплантаты / Металл",
		windowWidth: 8000,
		windowLevel: 2500,
		descriptionRu: "Подавление металл-артефактов титановых имплантатов, вкладок и циркониевых коронок",
	},
	{
		id: "airways_sinus",
		label: "Пазухи / ЛОР",
		windowWidth: 1600,
		windowLevel: -400,
		descriptionRu: "Оценка проходимости верхнечелюстных синусов, носоглотки и остиомеатального комплекса",
	},
];

export interface SliceRenderOptions {
	readonly windowWidth: number;
	readonly windowLevel: number;
	readonly invert?: boolean | undefined;
	readonly slabMode?: SlabProjectionMode | undefined;
	readonly slabThicknessMm?: number | undefined;
	readonly outputBuffer?: Uint8ClampedArray | undefined;
}

export interface MprSliceMetadata {
	readonly plane: MprPlane;
	readonly sliceIndex: number;
	readonly maxSliceIndex: number;
	readonly physicalPositionMm: number;
	readonly widthPx: number;
	readonly heightPx: number;
	readonly pixelSpacingX: number;
	readonly pixelSpacingY: number;
	readonly slabThicknessMm: number;
}

export interface MprSliceExtractionResult {
	readonly data: Uint8ClampedArray; // RGBA 8-bit image buffer
	readonly metadata: MprSliceMetadata;
}

// ─── ROMEXIS 6.X & VATECH EZ3D-I STANDARDS & PALETTES ────────────────────────

// ─── TRANSPARENT RE-EXPORTS (ZERO-DOWNTIME CONTRACT - MANDATE 8B) ────────────
export * from "./cbctOverlayDecorationMath";
export * from "./cbctOverlayMeasurementRenderers";
export * from "./cbctLutMath";
export * from "./cbctOrthogonalSliceMath";
export * from "./cbctVolumeLifecycleMath";
export * from "./cbctAnisotropicCaliperMath";
export * from "./cbctCoordinateMath";
export * from "./cbctRoiProfileMath";

// ─── FORWARDING RE-EXPORTS FOR OBLIQUE MPR ENGINE ────────────────────────────
import { drawObliqueCrosshairWithRotationHandles } from "./cbctObliqueMath";
export * from "./cbctObliqueMath";
export const drawMprCrosshair = drawObliqueCrosshairWithRotationHandles;
export const drawCbctCrosshair = drawObliqueCrosshairWithRotationHandles;
