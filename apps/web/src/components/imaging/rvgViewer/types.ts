/**
 * types.ts — Типы и константы цветов для RVG просмотрщика (Мандат 8b <= 120 строк).
 */

export {
	DEFAULT_DICOM_VIEWPORT_STATE,
	EMBOSS_SHADOW_KERNEL_3X3,
	SHARPEN_KERNEL_3X3,
	apply2DConvolutionFilter,
	buildDicomTonalLUT,
	calculate1FingerPan,
	calculate2FingerWindowLevel,
	calculatePinchCenter,
	calculatePinchDistance,
	calculatePinchZoom,
	calibrateMmPerPixel,
	disposeWebGlRenderingContext,
	measureBoneHeightAndWidth,
	measureDistanceMm,
	measureRootCanalWorkingLength,
	type CalibratedRulerMeasurement,
	type DicomImageMetadata,
	type DicomViewportState,
	type ImagingActiveTool,
	type Point2D,
} from "@dental/shared";

export const CLINICAL_IMAGING_COLORS = {
	pulpRed: "#ef4444",
	pulpRedDark: "#dc2626",
	pulpHighlight: "#f87171",
	rulerCyan: "#38bdf8",
	rulerDraftAmber: "#f59e0b",
	viewportDarkBg: "#020617",
	panelDarkBg: "#0f172a",
} as const;

export interface HuProfileSample {
	readonly distanceMm: number;
	readonly hu: number;
	readonly mischClass: "D1" | "D2" | "D3" | "D4" | "D5";
	readonly intensity: number;
}

export interface HuProfileStats {
	readonly samples: readonly HuProfileSample[];
	readonly meanHu: number;
	readonly minHu: number;
	readonly maxHu: number;
	readonly dominantClass: "D1" | "D2" | "D3" | "D4" | "D5";
	readonly lengthMm: number;
}

export type BoneDensityProfileStats = HuProfileStats;
