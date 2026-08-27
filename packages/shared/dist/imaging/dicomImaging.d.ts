/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL DENTAL DICOM / RVG IMAGING ENGINE
 * Math, Touch Gestures, Calibrated Subpixel Measurements & WebGL Lifecycles
 * ═══════════════════════════════════════════════════════════════════════════
 */
export interface Point2D {
    readonly x: number;
    readonly y: number;
}
export type RadiographyModality = "RVG" | "OPTG" | "CBCT_SLICE" | "TWAIN" | "INTRAORAL_PHOTO";
export interface DicomImageMetadata {
    readonly modality: RadiographyModality;
    readonly width: number;
    readonly height: number;
    readonly bitDepth: 8 | 12 | 16;
    readonly pixelSpacingMm?: number | undefined;
    readonly defaultWindowWidth: number;
    readonly defaultWindowCenter: number;
    readonly patientId?: string | undefined;
    readonly studyDate?: string | undefined;
    readonly toothFdiCode?: string | undefined;
    readonly sensorModel?: string | undefined;
    readonly kv?: number | undefined;
    readonly ma?: number | undefined;
    readonly exposureSec?: number | undefined;
}
export type ImagingActiveTool = "pan" | "zoom" | "window_level" | "ruler" | "angle" | "root_canal_tracer" | "bone_caliper" | "roi_density";
export interface DicomViewportState {
    readonly zoom: number;
    readonly panX: number;
    readonly panY: number;
    readonly windowWidth: number;
    readonly windowCenter: number;
    readonly invert: boolean;
    readonly sharpen: number;
    readonly emboss: boolean;
    readonly gamma: number;
    readonly activeTool: ImagingActiveTool;
    readonly calibrationMmPerPixel: number;
}
export declare const DEFAULT_DICOM_VIEWPORT_STATE: DicomViewportState;
/** ─── 1. ТАЧ-ЖЕСТЫ ДЛЯ ПЛАНШЕТОВ (Pinch-to-zoom, 1-finger Pan, 2-finger Window/Level) ─── */
export declare function calculatePinchDistance(p1: {
    readonly clientX: number;
    readonly clientY: number;
}, p2: {
    readonly clientX: number;
    readonly clientY: number;
}): number;
export declare function calculatePinchCenter(p1: {
    readonly clientX: number;
    readonly clientY: number;
}, p2: {
    readonly clientX: number;
    readonly clientY: number;
}): Point2D;
export declare function calculatePinchZoom(initialDistance: number, currentDistance: number, initialZoom: number, minZoom?: number, maxZoom?: number): number;
export declare function calculate1FingerPan(startPos: Point2D, currentPos: Point2D, initialPan: Point2D): Point2D;
export declare function calculate2FingerWindowLevel(deltaX: number, deltaY: number, initialWw: number, initialWl: number, sensitivity?: number): {
    readonly windowWidth: number;
    readonly windowCenter: number;
};
/** ─── 2. КАЛИБРОВАННАЯ ЛИНЕЙКА И СУБПИКСЕЛЬНЫЕ ИЗМЕРЕНИЯ В ММ ─── */
export interface CalibratedRulerMeasurement {
    readonly id: string;
    readonly p1: Point2D;
    readonly p2: Point2D;
    readonly lengthPx: number;
    readonly lengthMm: number;
    readonly calibrationMmPerPixel: number;
    readonly labelRu: string;
    readonly clinicalType?: "bone_height" | "bone_width" | "root_canal_length" | "implant_site" | "general";
}
export declare function calibrateMmPerPixel(p1: Point2D, p2: Point2D, knownPhysicalMm: number): number;
export declare function measureDistanceMm(p1: Point2D, p2: Point2D, mmPerPixel: number): {
    readonly distancePx: number;
    readonly distanceMm: number;
};
export declare function measureRootCanalWorkingLength(points: readonly Point2D[], mmPerPixel: number): {
    readonly totalLengthPx: number;
    readonly totalLengthMm: number;
    readonly segments: readonly number[];
};
export declare function measureBoneHeightAndWidth(crestPoint: Point2D, basePoint: Point2D, buccalPoint: Point2D, lingualPoint: Point2D, mmPerPixel: number): {
    readonly heightMm: number;
    readonly widthMm: number;
    readonly isImplantCandidate: boolean;
};
/** ─── 3. ФИЛЬТРЫ: ИНВЕРСИЯ (НЕГАТИВ), РЕЗКОСТЬ (SHARPEN) И РЕЛЬЕФ (EMBOSS) ─── */
export declare const SHARPEN_KERNEL_3X3: readonly (readonly number[])[];
export declare const EMBOSS_SHADOW_KERNEL_3X3: readonly (readonly number[])[];
export declare function buildDicomTonalLUT(options: {
    readonly windowWidth: number;
    readonly windowCenter: number;
    readonly invert?: boolean;
    readonly gamma?: number;
}): Uint8Array;
export declare function apply2DConvolutionFilter(srcPixels: Uint8ClampedArray, width: number, height: number, kernel: readonly (readonly number[])[], offset?: number): Uint8ClampedArray;
/** ─── 4. УТИЛИЗАЦИЯ И ОЧИСТКА РЕСУРСОВ WEBGL / CANVAS (0 УТЕЧЕК ПАМЯТИ) ─── */
export interface WebGlDisposalStats {
    readonly texturesDisposed: number;
    readonly buffersDisposed: number;
    readonly programsDisposed: number;
    readonly contextLostTriggered: boolean;
}
export declare function disposeWebGlRenderingContext(gl: any, resources?: {
    readonly textures?: readonly any[];
    readonly buffers?: readonly any[];
    readonly programs?: readonly any[];
}): WebGlDisposalStats;
