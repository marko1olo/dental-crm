import type {
	SlabProjectionMode,
} from "../cbctMprMath";
import type { Point2D, Point3D } from "../cbctCaliperNerveMath";
import type {
	CbctVolumeGlContext,
	GlSliceCoordinates,
} from "../mpr/webgl/CbctVolumeGlContext";

export interface CrossSectionRenderOptions {
	readonly widthMm?: number | undefined;
	readonly heightMm?: number | undefined;
	readonly pixelSpacingMm?: number | undefined;
	readonly slabMode?: SlabProjectionMode | undefined;
	readonly slabThicknessMm?: number | undefined;
	readonly buccoLingualOffsetMm?: number | undefined;
	readonly heightOffsetMm?: number | undefined;
	readonly sliceCenterZMm?: number | undefined;
	readonly windowWidth?: number | undefined;
	readonly windowLevel?: number | undefined;
	readonly invert?: boolean | undefined;
	readonly offsetFromMidlineMm?: number | undefined;
	readonly lut?: Uint8ClampedArray | Uint8Array | undefined;
	readonly glContext?: CbctVolumeGlContext | null | undefined;
	readonly useGpu?: boolean | undefined;
	readonly gamma?: number | undefined;
	readonly airCutoffHU?: number | undefined;
	readonly softKnee?: boolean | import("../cbctLutMath").SoftKneeConfig | undefined;
	readonly outputBuffer?: Uint8ClampedArray | undefined;
	readonly outputRawHu?: Int16Array | undefined;
}

export interface CrossSectionAffineBasis {
	readonly sliceOrigin: [number, number, number];
	readonly axisU: [number, number, number];
	readonly axisV: [number, number, number];
	readonly axisNorm: [number, number, number];
	readonly widthPx: number;
	readonly heightPx: number;
	readonly pixelSpacingX: number;
	readonly pixelSpacingY: number;
	readonly slabModeCode: number;
	readonly slabSteps: number;
	readonly world00: Point3D;
	readonly unitNormal: Point2D;
	readonly unitTangent: Point2D;
	readonly stepVoxU: { readonly x: number; readonly y: number };
	readonly stepVoxVz: number;
	readonly vox00: Point3D;
}

export interface CrossSectionSliceData {
	readonly sliceIndex: number;
	readonly distanceAlongArchMm: number;
	readonly centerPointMm: Point3D;
	readonly normalVector2D: Point2D;
	readonly tangentVector2D: Point2D;
	readonly nearestToothFdi: string;
	readonly toothLabelRu: string;
	readonly sliceLabel?: string;
	readonly offsetFromMidlineMm?: number;
	readonly widthMm: number;
	readonly heightMm: number;
	readonly pixelSpacingMm: number;
	readonly widthPx: number;
	readonly heightPx: number;
	readonly pixelData: Uint8ClampedArray;
	readonly rawHuData?: Int16Array | undefined;
	readonly corticalCrestHeightMm?: number;
	readonly alveolarRidgeWidthMm?: number;
	readonly glCoordinates?: GlSliceCoordinates;
}

export interface CrossSectionSeriesOptions {
	readonly stepMm?: number;
	readonly stepSpacingMm?: number;
	readonly sliceCenterZMm?: number;
	readonly widthMm?: number;
	readonly heightMm?: number;
	readonly pixelSpacingMm?: number;
	readonly windowWidth?: number;
	readonly windowLevel?: number;
	readonly invert?: boolean;
	readonly glContext?: CbctVolumeGlContext | null;
	readonly useGpu?: boolean;
	readonly gamma?: number;
	readonly airCutoffHU?: number;
	readonly softKnee?: boolean | import("../cbctLutMath").SoftKneeConfig | undefined;
	readonly slabMode?: SlabProjectionMode | undefined;
	readonly slabThicknessMm?: number | undefined;
}

export interface AlveolarRidgeMeasurementResult {
	heightMm: number;
	crestWidthMm: number;
	midWidthMm: number;
	baseWidthMm: number;
	isAdequateForImplant: boolean;
	clinicalAdviceRu: string;
}
