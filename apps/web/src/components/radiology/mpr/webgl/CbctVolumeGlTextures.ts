/**
 * DENTE CRM — WebGL2 3D-Texture Management & MPR Coordinate Utilities (FEAT-010 / GPU Overhaul)
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 * Mandate 8b: Modularized coordinate & texture math decoupling.
 */

import type { CbctVoxelVolume, MprPlane, Point3D, SlabProjectionMode } from "../../cbctMprMath";
import type { Point2D } from "../../cbctCaliperNerveMath";
import { worldMmToSlicePxContinuous } from "../../cbctCoordinateMath";
import {
	type ObliqueRotationAngles,
	type ViewportTransform,
	computeObliquePlaneBasis,
} from "../../cbctObliqueMatrixMath";
import { type RotationHandlePosition, calculateAngleFromHandleDrag } from "../../cbctObliqueMath";
import { calculateCrosshairDragWorldMm } from "../../cbctVolumeLifecycleMath";
import {
	downsampleVolumeBoxFilter,
	downsampleVolumeData as sharedDownsampleVolumeData,
	getTargetMaxDimForTier,
	calculateTextureVramMb,
	type CbctRenderingTier,
	type DownsampledVolumeDataResult,
} from "@dental/shared";
import {
	CBCT_COLORMAP_MODES,
	type CbctColorMapMode,
} from "./cbctMprShaders";

export {
	CBCT_COLORMAP_MODES,
	type CbctColorMapMode,
	downsampleVolumeBoxFilter,
	getTargetMaxDimForTier,
	calculateTextureVramMb,
	type CbctRenderingTier,
	type DownsampledVolumeDataResult,
};

export type CbctInterpolationOption =
	| "nearest"
	| "trilinear"
	| "bilinear"
	| "catmull_rom"
	| "b_spline"
	| "lanczos3"
	| "bilateral";

export const CBCT_INTERPOLATION_CODES = {
	NEAREST: 0,
	BILINEAR: 1, // alias: trilinear
	CATMULL_ROM: 2,
	B_SPLINE: 3,
	LANCZOS3: 4,
	BILATERAL: 5,
} as const;

export function resolveInterpolationCode(method?: CbctInterpolationOption | string): number {
	switch (method) {
		case "nearest":
			return CBCT_INTERPOLATION_CODES.NEAREST;
		case "catmull_rom":
			return CBCT_INTERPOLATION_CODES.CATMULL_ROM;
		case "b_spline":
			return CBCT_INTERPOLATION_CODES.B_SPLINE;
		case "lanczos3":
			return CBCT_INTERPOLATION_CODES.LANCZOS3;
		case "bilateral":
			return CBCT_INTERPOLATION_CODES.BILATERAL;
		case "bilinear":
		case "trilinear":
		default:
			return CBCT_INTERPOLATION_CODES.BILINEAR;
	}
}

export interface GlSliceRenderOptions {
	windowWidth: number;
	windowLevel: number;
	invert?: boolean | undefined;
	slabMode?: SlabProjectionMode | undefined;
	slabThicknessMm?: number | undefined;
	interpolation?: CbctInterpolationOption | undefined;
	expandObliqueDiagonal?: boolean | undefined;
	safeDpr?: number | undefined;
	clampDpr?: boolean | undefined;
	colorMap?: CbctColorMapMode | number | undefined;
	sharpenAmount?: number | undefined;
	gamma?: number | undefined;
	useSoftKnee?: boolean | undefined;
	softKneeCeiling?: number | undefined;
	airCutoffHU?: number | undefined;
}

export function resolveColorMapCode(colorMap?: CbctColorMapMode | number): number {
	if (typeof colorMap === "number") {
		return Math.max(0, Math.min(3, Math.round(colorMap)));
	}
	switch (colorMap) {
		case "bone_density":
			return CBCT_COLORMAP_MODES.BONE_DENSITY;
		case "endo":
			return CBCT_COLORMAP_MODES.ENDO;
		case "inverted":
			return CBCT_COLORMAP_MODES.INVERTED;
		case "grayscale":
		default:
			return CBCT_COLORMAP_MODES.GRAYSCALE;
	}
}

export interface GlSliceCoordinates {
	widthPx: number;
	heightPx: number;
	pixelSpacingX: number;
	pixelSpacingY: number;
	sliceOrigin: [number, number, number];
	axisU: [number, number, number];
	axisV: [number, number, number];
	axisNorm: [number, number, number];
	slabModeCode: number;
	slabSteps: number;
}

export const MAX_SAFE_DEVICE_PIXEL_RATIO = 1.5;

/**
 * Calculates safe device pixel ratio clamped to max 1.5 to protect GPU fillrate on 4K/Retina displays.
 * Prevents integrated GPUs (Intel UHD / Iris Xe) from fillrate collapse on high-DPI screens.
 */
export function getSafeDevicePixelRatio(customDpr?: number): number {
	const rawDpr =
		typeof customDpr === "number" && Number.isFinite(customDpr) && customDpr > 0
			? customDpr
			: typeof window !== "undefined" && typeof window.devicePixelRatio === "number" && window.devicePixelRatio > 0
				? window.devicePixelRatio
				: 1.0;
	return Math.min(rawDpr, MAX_SAFE_DEVICE_PIXEL_RATIO);
}

export interface SafeDprViewportDimensions {
	renderWidth: number;
	renderHeight: number;
	cssWidth: number;
	cssHeight: number;
	safeDpr: number;
}

/**
 * Computes buffer render dimensions and CSS display dimensions with safe DPR clamping (<= 1.5).
 */
export function computeSafeDprDimensions(
	cssWidth: number,
	cssHeight: number,
	customDpr?: number,
): SafeDprViewportDimensions {
	const safeDpr = getSafeDevicePixelRatio(customDpr);
	const renderWidth = Math.max(1, Math.round(cssWidth * safeDpr));
	const renderHeight = Math.max(1, Math.round(cssHeight * safeDpr));
	return {
		renderWidth,
		renderHeight,
		cssWidth,
		cssHeight,
		safeDpr,
	};
}

/**
 * Applies clamped DPR scaling to an HTMLCanvasElement: internal buffer is set to renderWidth/Height,
 * while canvas.style width/height are set to cssWidth/Height (CSS pixels).
 */
export function applySafeDprToCanvas(
	canvas: HTMLCanvasElement,
	cssWidth: number,
	cssHeight: number,
	customDpr?: number,
): SafeDprViewportDimensions {
	const dims = computeSafeDprDimensions(cssWidth, cssHeight, customDpr);
	if (canvas.width !== dims.renderWidth || canvas.height !== dims.renderHeight) {
		canvas.width = dims.renderWidth;
		canvas.height = dims.renderHeight;
	}
	if (canvas.style) {
		canvas.style.width = `${dims.cssWidth}px`;
		canvas.style.height = `${dims.cssHeight}px`;
	}
	return dims;
}

/**
 * Downsamples 3D voxel buffer by integer stride step (e.g. 2x) or targetMaxDim ceiling.
 * Guarantees volumes exceeding gl.MAX_3D_TEXTURE_SIZE (256/512) fit into hardware VRAM without crash.
 */
export function downsampleVolumeData(
	srcData: Int16Array,
	srcDim: { width: number; height: number; depth: number },
	targetMaxDimOrStep = 256,
): DownsampledVolumeDataResult {
	const validParam = Number.isFinite(targetMaxDimOrStep) && targetMaxDimOrStep > 0
		? targetMaxDimOrStep
		: 256;

	if (validParam <= 8) {
		const step = Math.max(1, Math.floor(validParam));
		if (step <= 1) {
			return {
				data: srcData,
				width: srcDim.width,
				height: srcDim.height,
				depth: srcDim.depth,
				step: 1,
				minHU: -1000,
				maxHU: 3000,
				vramMb: calculateTextureVramMb(srcDim.width, srcDim.height, srcDim.depth, 2),
			};
		}

		const dstW = Math.max(1, Math.ceil(srcDim.width / step));
		const dstH = Math.max(1, Math.ceil(srcDim.height / step));
		const dstD = Math.max(1, Math.ceil(srcDim.depth / step));
		const dstData = new Int16Array(dstW * dstH * dstD);
		let minHU = 32767;
		let maxHU = -32768;

		for (let dz = 0; dz < dstD; dz++) {
			const srcZOffset = dz * step * srcDim.width * srcDim.height;
			const dstZOffset = dz * dstW * dstH;
			for (let dy = 0; dy < dstH; dy++) {
				const srcYOffset = srcZOffset + dy * step * srcDim.width;
				const dstYOffset = dstZOffset + dy * dstW;
				for (let dx = 0; dx < dstW; dx++) {
					const val = srcData[srcYOffset + dx * step] ?? -1000;
					dstData[dstYOffset + dx] = val;
					if (val < minHU) minHU = val;
					if (val > maxHU) maxHU = val;
				}
			}
		}

		const vramMb = calculateTextureVramMb(dstW, dstH, dstD, 2);
		return {
			data: dstData,
			width: dstW,
			height: dstH,
			depth: dstD,
			step,
			minHU: minHU === 32767 ? -1000 : minHU,
			maxHU: maxHU === -32768 ? 3000 : maxHU,
			vramMb,
		};
	}

	const maxDim = Math.max(srcDim.width, Math.max(srcDim.height, srcDim.depth));
	let step = 1;
	if (maxDim > validParam) {
		step = Math.ceil(maxDim / validParam);
	}

	if (step <= 1) {
		return {
			data: srcData,
			width: srcDim.width,
			height: srcDim.height,
			depth: srcDim.depth,
			step: 1,
			minHU: -1000,
			maxHU: 3000,
			vramMb: calculateTextureVramMb(srcDim.width, srcDim.height, srcDim.depth, 2),
		};
	}

	const filtered = downsampleVolumeBoxFilter(srcData, srcDim, step, step, step);
	const vramMb = calculateTextureVramMb(filtered.width, filtered.height, filtered.depth, 2);
	return {
		data: filtered.data,
		width: filtered.width,
		height: filtered.height,
		depth: filtered.depth,
		step,
		minHU: filtered.minHU,
		maxHU: filtered.maxHU,
		vramMb,
	};
}

/**
 * Pure mathematical calculation of 3D Texture UVW coordinates and spans for an arbitrary MPR slice.
 * Decoupled from WebGL context for deterministic unit testing in any environment.
 */
export function computeGlSliceCoordinates(
	volume: CbctVoxelVolume,
	plane: MprPlane,
	crosshairMm: Point3D,
	angles: ObliqueRotationAngles,
	options?: GlSliceRenderOptions,
): GlSliceCoordinates {
	const dim = volume.dimensions, sp = volume.spacingMm, origin = volume.originMm;
	let widthPx = 0, heightPx = 0, pixelSpacingX = 0, pixelSpacingY = 0;

	switch (plane) {
		case "axial":
			widthPx = dim.width; heightPx = dim.height;
			pixelSpacingX = sp.x; pixelSpacingY = sp.y;
			break;
		case "coronal":
			widthPx = dim.width; heightPx = Math.max(1, Math.round((dim.depth * sp.z) / (sp.x || 1.0)));
			pixelSpacingX = sp.x; pixelSpacingY = (dim.depth * sp.z) / heightPx;
			break;
		case "sagittal":
			widthPx = dim.height; heightPx = Math.max(1, Math.round((dim.depth * sp.z) / (sp.y || 1.0)));
			pixelSpacingX = sp.y; pixelSpacingY = (dim.depth * sp.z) / heightPx;
			break;
	}

	const basis = computeObliquePlaneBasis(plane, crosshairMm, angles);
	const hasObliqueRotation =
		Math.abs(angles?.axialAngleDeg ?? 0) > 0.01 ||
		Math.abs(angles?.coronalTiltDeg ?? 0) > 0.01 ||
		Math.abs(angles?.sagittalTiltDeg ?? 0) > 0.01;

	const shouldExpandDiagonal = options?.expandObliqueDiagonal ?? true;
	if (hasObliqueRotation && shouldExpandDiagonal) {
		const diagPx = Math.max(1, Math.round(Math.hypot(widthPx, heightPx)));
		widthPx = diagPx;
		heightPx = diagPx;
	}

	const pivotPx = worldMmToSlicePxContinuous(crosshairMm, plane, volume);
	const maxCoordX = Math.max(1, dim.width - 1), maxCoordY = Math.max(1, dim.height - 1), maxCoordZ = Math.max(1, dim.depth - 1);

	const world00X = crosshairMm.x - pivotPx.x * basis.u.x * pixelSpacingX - pivotPx.y * basis.v.x * pixelSpacingY;
	const world00Y = crosshairMm.y - pivotPx.x * basis.u.y * pixelSpacingX - pivotPx.y * basis.v.y * pixelSpacingY;
	const world00Z = crosshairMm.z - pivotPx.x * basis.u.z * pixelSpacingX - pivotPx.y * basis.v.z * pixelSpacingY;

	const vox00X = (world00X - origin.x) / sp.x, vox00Y = (world00Y - origin.y) / sp.y, vox00Z = (world00Z - origin.z) / sp.z;
	const sliceOrigin: [number, number, number] = [vox00X / maxCoordX, vox00Y / maxCoordY, vox00Z / maxCoordZ];

	const totalSpanMmX = widthPx * pixelSpacingX;
	const axisU: [number, number, number] = [
		(basis.u.x * totalSpanMmX) / (sp.x * maxCoordX),
		(basis.u.y * totalSpanMmX) / (sp.y * maxCoordY),
		(basis.u.z * totalSpanMmX) / (sp.z * maxCoordZ),
	];

	const totalSpanMmY = heightPx * pixelSpacingY;
	const axisV: [number, number, number] = [
		(basis.v.x * totalSpanMmY) / (sp.x * maxCoordX),
		(basis.v.y * totalSpanMmY) / (sp.y * maxCoordY),
		(basis.v.z * totalSpanMmY) / (sp.z * maxCoordZ),
	];

	const normalStepMm = Math.min(sp.x, Math.min(sp.y, sp.z));
	const slabMode = options?.slabMode ?? "single";
	const slabThicknessMm = options?.slabThicknessMm ?? 2.0;
	const isSlabActive = slabMode !== "single" && slabThicknessMm > normalStepMm;
	const slabSteps = isSlabActive ? Math.max(1, Math.round(slabThicknessMm / normalStepMm)) : 1;
	const stepMm = isSlabActive ? slabThicknessMm / slabSteps : 0;

	const axisNorm: [number, number, number] = [
		(basis.normal.x * stepMm) / (sp.x * maxCoordX),
		(basis.normal.y * stepMm) / (sp.y * maxCoordY),
		(basis.normal.z * stepMm) / (sp.z * maxCoordZ),
	];

	let slabModeCode = 0;
	if (slabMode === "mip") slabModeCode = 1;
	else if (slabMode === "minip") slabModeCode = 2;
	else if (slabMode === "average") slabModeCode = 3;

	return { widthPx, heightPx, pixelSpacingX, pixelSpacingY, sliceOrigin, axisU, axisV, axisNorm, slabModeCode, slabSteps };
}

/**
 * Pure mathematical calculation of 3D Texture UVW coordinates for a perpendicular
 * transverse cross-section slice (buccal-lingual span) along a dental arch curve.
 * Standards: DICOM Part 3, Misch CE, Buser (24x34 mm span, 0.25 mm/px).
 */
export function computeGlCrossSectionCoordinates(
	volume: CbctVoxelVolume,
	centerMm: Point3D,
	normal2D: Point2D,
	options?: { widthMm?: number | undefined; heightMm?: number | undefined; pixelSpacingMm?: number | undefined; slabMode?: SlabProjectionMode | undefined; slabThicknessMm?: number | undefined },
): GlSliceCoordinates {
	const dim = volume.dimensions, sp = volume.spacingMm, origin = volume.originMm;
	const widthMm = Number.isFinite(options?.widthMm) && (options?.widthMm ?? 0) > 0 ? options!.widthMm! : 24.0;
	const heightMm = Number.isFinite(options?.heightMm) && (options?.heightMm ?? 0) > 0 ? options!.heightMm! : 34.0;
	const pixelSpacingMm = Number.isFinite(options?.pixelSpacingMm) && (options?.pixelSpacingMm ?? 0) > 0 ? options!.pixelSpacingMm! : 0.25;

	const widthPx = Math.max(1, Math.round(widthMm / pixelSpacingMm));
	const heightPx = Math.max(1, Math.round(heightMm / pixelSpacingMm));
	const pixelSpacingX = pixelSpacingMm, pixelSpacingY = pixelSpacingMm;
	const halfW = widthMm / 2.0, halfH = heightMm / 2.0;

	const nLen = Math.hypot(normal2D.x, normal2D.y);
	const unitNormal: Point2D = Number.isFinite(nLen) && nLen > 1e-6 ? { x: normal2D.x / nLen, y: normal2D.y / nLen } : { x: 0, y: 1 };
	const unitTangent: Point2D = { x: unitNormal.y === 0 ? 0 : unitNormal.y, y: unitNormal.x === 0 ? 0 : -unitNormal.x };

	const maxCoordX = Math.max(1, dim.width - 1), maxCoordY = Math.max(1, dim.height - 1), maxCoordZ = Math.max(1, dim.depth - 1);
	const world00X = centerMm.x - unitNormal.x * halfW, world00Y = centerMm.y - unitNormal.y * halfW, world00Z = centerMm.z + halfH;
	const vox00X = (world00X - origin.x) / sp.x, vox00Y = (world00Y - origin.y) / sp.y, vox00Z = (world00Z - origin.z) / sp.z;

	const sliceOrigin: [number, number, number] = [vox00X / maxCoordX, vox00Y / maxCoordY, vox00Z / maxCoordZ];
	const uX = (unitNormal.x * widthMm) / (sp.x * maxCoordX), uY = (unitNormal.y * widthMm) / (sp.y * maxCoordY);
	const axisU: [number, number, number] = [uX === 0 ? 0 : uX, uY === 0 ? 0 : uY, 0];
	const axisV: [number, number, number] = [0, 0, -heightMm / (sp.z * maxCoordZ)];

	const normalStepMm = Math.min(sp.x, Math.min(sp.y, sp.z));
	const slabMode = options?.slabMode ?? "single";
	const slabThicknessMm = options?.slabThicknessMm ?? 2.0;
	const isSlabActive = slabMode !== "single" && slabThicknessMm > normalStepMm;
	const slabSteps = isSlabActive ? Math.max(1, Math.round(slabThicknessMm / normalStepMm)) : 1;
	const stepMm = isSlabActive ? slabThicknessMm / slabSteps : 0;
	const nX = (unitTangent.x * stepMm) / (sp.x * maxCoordX), nY = (unitTangent.y * stepMm) / (sp.y * maxCoordY);
	const axisNorm: [number, number, number] = [nX === 0 ? 0 : nX, nY === 0 ? 0 : nY, 0];

	let slabModeCode = 0;
	if (slabMode === "mip") slabModeCode = 1;
	else if (slabMode === "minip") slabModeCode = 2;
	else if (slabMode === "average") slabModeCode = 3;

	return { widthPx, heightPx, pixelSpacingX, pixelSpacingY, sliceOrigin, axisU, axisV, axisNorm, slabModeCode, slabSteps };
}

/**
 * Calculates updated oblique rotation angles when dragging a rotation handle around the center.
 * Handles Axial (axialAngleDeg), Coronal (coronalTiltDeg), and Sagittal (sagittalTiltDeg).
 */
export function calculateObliqueRotationFromHandle(
	plane: MprPlane,
	handle: RotationHandlePosition,
	centerPx: { readonly x: number; readonly y: number },
	pointerPx: { readonly x: number; readonly y: number },
	currentAngles: ObliqueRotationAngles,
): { newAngles: ObliqueRotationAngles; angleDeg: number } {
	const angleDeg = calculateAngleFromHandleDrag(centerPx, pointerPx, handle);
	let newAngles: ObliqueRotationAngles;
	switch (plane) {
		case "axial":
			newAngles = { ...currentAngles, axialAngleDeg: angleDeg };
			break;
		case "coronal":
			newAngles = { ...currentAngles, coronalTiltDeg: angleDeg };
			break;
		case "sagittal":
			newAngles = { ...currentAngles, sagittalTiltDeg: angleDeg };
			break;
	}
	return { newAngles, angleDeg };
}

/**
 * Computes updated 3D crosshair position when dragging crosshair center in any MPR viewport plane.
 */
export function calculateCrosshairCenterDrag(
	plane: MprPlane,
	pointerPx: { readonly x: number; readonly y: number },
	canvasSize: { readonly width: number; readonly height: number },
	currentCrosshairMm: Point3D,
	angles: ObliqueRotationAngles,
	transform: ViewportTransform,
	volume: CbctVoxelVolume,
): Point3D {
	return calculateCrosshairDragWorldMm(
		pointerPx,
		canvasSize,
		plane,
		currentCrosshairMm,
		angles,
		transform,
		volume,
	);
}

/**
 * Computes synchronized slice coordinates (origins and basis vectors) for all 3 MPR planes
 * when crosshair moves in 3D or oblique angles change.
 */
export function computeSynchronizedMprGlCoordinates(
	volume: CbctVoxelVolume,
	crosshairMm: Point3D,
	angles: ObliqueRotationAngles,
	options?: GlSliceRenderOptions,
): {
	axial: GlSliceCoordinates;
	coronal: GlSliceCoordinates;
	sagittal: GlSliceCoordinates;
} {
	return {
		axial: computeGlSliceCoordinates(volume, "axial", crosshairMm, angles, options),
		coronal: computeGlSliceCoordinates(volume, "coronal", crosshairMm, angles, options),
		sagittal: computeGlSliceCoordinates(volume, "sagittal", crosshairMm, angles, options),
	};
}

export interface VolumeTextureUploadResult {
	texture: WebGLTexture;
	uploadDim: { width: number; height: number; depth: number };
	downsampleStep: number;
}

export interface UploadVolumeOptions {
	max3dSize?: number | undefined;
	targetMaxDim?: number | undefined;
	tier?: CbctRenderingTier | undefined;
}

/**
 * Uploads 16-bit signed HU volume to GPU VRAM as 3D Texture (gl.R16I / gl.SHORT).
 * Progressively downsamples 2x/4x/8x if dimensions exceed GPU limits, targetMaxDim, or allocation fails.
 * Guarantees zero out-of-memory crash on Potato / Low / Balanced tiers.
 */
export function uploadVolumeTo3DTexture(
	gl: WebGL2RenderingContext,
	volume: CbctVoxelVolume,
	max3dSizeOrOptions: number | UploadVolumeOptions = 2048,
): VolumeTextureUploadResult | null {
	if (typeof gl.isContextLost === "function" && gl.isContextLost()) return null;
	if (!volume.data || volume.isDisposed) return null;
	const rawData = volume.data;
	const texture = gl.createTexture();
	if (!texture) return null;

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_3D, texture);
	gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

	const opts: UploadVolumeOptions = typeof max3dSizeOrOptions === "number"
		? { max3dSize: max3dSizeOrOptions }
		: (max3dSizeOrOptions ?? {});

	const max3dSize = opts.max3dSize ?? 2048;
	let targetCeiling = max3dSize;
	if (opts.targetMaxDim && opts.targetMaxDim > 0) {
		targetCeiling = Math.min(targetCeiling, opts.targetMaxDim);
	}
	if (opts.tier) {
		const tierCeiling = getTargetMaxDimForTier(opts.tier);
		targetCeiling = Math.min(targetCeiling, tierCeiling);
	}

	let step = 1;

	// Mandate 8l & User Order: On mobile devices (phones & touch tablets with limited VRAM),
	// automatically enforce Progressive LOD 2x (300x300x156 = 28 MB instead of 224 MB)
	// to prevent WebKit webglcontextlost, tab crashes, and ensure instant 60 FPS rendering!
	const isMobileOrTablet = typeof window !== "undefined" && (
		window.innerWidth < 768 ||
		(typeof navigator !== "undefined" && navigator.maxTouchPoints > 0 && window.innerWidth < 1024)
	);
	if (isMobileOrTablet && step < 2) {
		step = 2;
	}

	while (
		Math.ceil(volume.dimensions.width / step) > targetCeiling ||
		Math.ceil(volume.dimensions.height / step) > targetCeiling ||
		Math.ceil(volume.dimensions.depth / step) > targetCeiling
	) {
		step *= 2;
	}

	let uploadData: Int16Array = rawData;
	let uploadWidth = volume.dimensions.width;
	let uploadHeight = volume.dimensions.height;
	let uploadDepth = volume.dimensions.depth;

	if (step > 1) {
		console.warn(`[CbctVolumeGlTextures] Volume downsampled ${step}x with 3D box-filter for GPU limits (${targetCeiling}).`);
		const downsampled = downsampleVolumeBoxFilter(rawData, volume.dimensions, step, step, step);
		uploadData = downsampled.data;
		uploadWidth = downsampled.width;
		uploadHeight = downsampled.height;
		uploadDepth = downsampled.depth;
	}

	gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0);
	gl.pixelStorei(gl.UNPACK_IMAGE_HEIGHT, 0);
	gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0);
	gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0);
	gl.pixelStorei(gl.UNPACK_SKIP_IMAGES, 0);
	gl.pixelStorei(gl.UNPACK_ALIGNMENT, 2);

	let uploadSuccess = false;
	while (step <= 8) {
		try {
			gl.texImage3D(
				gl.TEXTURE_3D,
				0,
				gl.R16I,
				uploadWidth,
				uploadHeight,
				uploadDepth,
				0,
				gl.RED_INTEGER,
				gl.SHORT,
				uploadData,
			);
			uploadSuccess = true;
			break;
		} catch (err) {
			console.warn(
				`[CbctVolumeGlTextures] gl.texImage3D failed at ${uploadWidth}x${uploadHeight}x${uploadDepth} (step ${step}x), retrying with progressive 2x downsample:`,
				err,
			);
			step *= 2;
			if (step > 8) {
				break;
			}
			const downsampled = downsampleVolumeBoxFilter(rawData, volume.dimensions, step, step, step);
			uploadData = downsampled.data;
			uploadWidth = downsampled.width;
			uploadHeight = downsampled.height;
			uploadDepth = downsampled.depth;
		}
	}

	if (!uploadSuccess) {
		console.error("[CbctVolumeGlTextures] gl.texImage3D failed after progressive downsampling.");
		gl.deleteTexture(texture);
		return null;
	}

	return {
		texture,
		uploadDim: { width: uploadWidth, height: uploadHeight, depth: uploadDepth },
		downsampleStep: step,
	};
}
