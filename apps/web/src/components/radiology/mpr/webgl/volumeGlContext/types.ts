/**
 * DENTE CRM — WebGL2 Hardware GPU 3D-Texture Engine (FEAT-010 / GPU Overhaul)
 * Volume GL Context Core Types & Interfaces (Mandate 8b / Layer 0)
 */

import type { CbctVoxelVolume, MprPlane, Point3D } from "../../../cbctMprMath";
import type { Point2D } from "../../../cbctCaliperNerveMath";
import type { ObliqueRotationAngles, ViewportTransform } from "../../../cbctObliqueMatrixMath";
import type { RotationHandlePosition } from "../../../cbctObliqueMath";
import type { CbctRenderingTier } from "@dental/shared";
import type {
	CbctColorMapMode,
	GlSliceCoordinates,
	GlSliceRenderOptions,
} from "../CbctVolumeGlTextures";

export interface GlUniformLocations {
	volume: WebGLUniformLocation | null;
	volumeDim: WebGLUniformLocation | null;
	sliceOrigin: WebGLUniformLocation | null;
	axisU: WebGLUniformLocation | null;
	axisV: WebGLUniformLocation | null;
	axisNorm: WebGLUniformLocation | null;
	windowWidth: WebGLUniformLocation | null;
	windowLevel: WebGLUniformLocation | null;
	invert: WebGLUniformLocation | null;
	slabMode: WebGLUniformLocation | null;
	slabSteps: WebGLUniformLocation | null;
	trilinear: WebGLUniformLocation | null;
	interpolationMode: WebGLUniformLocation | null;
	colorMap: WebGLUniformLocation | null;
	sharpenAmount: WebGLUniformLocation | null;
	gamma: WebGLUniformLocation | null;
	useSoftKnee: WebGLUniformLocation | null;
	softKneeCeiling: WebGLUniformLocation | null;
	airCutoffHU: WebGLUniformLocation | null;
}

export interface GlVolumeUploadDim {
	width: number;
	height: number;
	depth: number;
}

export interface GlSliceDrawResult {
	coords: GlSliceCoordinates;
	pixelData?: Uint8ClampedArray | undefined;
	renderTimeMs: number;
}

export interface GlCrossSectionRenderOptions extends GlSliceRenderOptions {
	widthMm?: number | undefined;
	heightMm?: number | undefined;
	pixelSpacingMm?: number | undefined;
	slabThicknessMm?: number | undefined;
	readPixels?: boolean | undefined;
}

export interface GlAllPlanesTargets {
	axial?: HTMLCanvasElement | null;
	coronal?: HTMLCanvasElement | null;
	sagittal?: HTMLCanvasElement | null;
}

export interface GlAllPlanesCoordinates {
	axial: GlSliceCoordinates;
	coronal: GlSliceCoordinates;
	sagittal: GlSliceCoordinates;
}

export type {
	CbctVoxelVolume,
	MprPlane,
	Point3D,
	Point2D,
	ObliqueRotationAngles,
	ViewportTransform,
	RotationHandlePosition,
	CbctRenderingTier,
	CbctColorMapMode,
	GlSliceCoordinates,
	GlSliceRenderOptions,
};
