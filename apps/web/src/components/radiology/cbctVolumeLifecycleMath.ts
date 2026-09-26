/**
 * DENTE CRM — CBCT Volume Lifecycle, Pointer Mapping & Crosshair Synchronization
 * Extracted from cbctMprMath.ts according to Mandate 8b.
 */

import type {
	CbctVoxelVolume,
	MprPlane,
	Point3D,
	CbctViewportType,
	ViewportTransform,
} from "./cbctMprMath";
import {
	worldMmToVoxel,
	slicePxToScreenPx,
} from "./cbctCoordinateMath";
import {
	type ObliqueRotationAngles,
	DEFAULT_OBLIQUE_ROTATION,
	DEFAULT_VIEWPORT_TRANSFORM,
	mapCanvasPointerToWorldMmWithTransform,
} from "./cbctObliqueMatrixMath";


/**
 * Creates an empty or flat-field CBCT voxel volume for mathematical coordinate calculations and tests.
 */
export function createEmptyCbctVolume(
	width = 64,
	height = 64,
	depth = 32,
	voxelSpacingMm = 0.5,
	defaultHU = -1000,
): CbctVoxelVolume {
	const totalVoxels = width * height * depth;
	const buffer = new Int16Array(totalVoxels).fill(defaultHU);

	const physW = width * voxelSpacingMm;
	const physH = height * voxelSpacingMm;
	const physD = depth * voxelSpacingMm;

	return {
		id: `empty-cbct-${Date.now()}`,
		dimensions: { width, height, depth },
		spacingMm: { x: voxelSpacingMm, y: voxelSpacingMm, z: voxelSpacingMm },
		originMm: {
			x: -physW / 2,
			y: -physH / 2,
			z: -physD / 2,
		},
		physicalSizeMm: { x: physW, y: physH, z: physD },
		data: buffer,
		minHU: defaultHU,
		maxHU: defaultHU,
		defaultWindowWidth: 2000,
		defaultWindowLevel: 400,
		isDisposed: false,
	};
}

/**
 * Explicitly releases TypedArray buffers to prevent GPU/RAM memory leaks.
 */
export function disposeCbctVolume(volume: CbctVoxelVolume): void {
	if (volume && !volume.isDisposed) {
		volume.data = null;
		(volume as { isDisposed: boolean }).isDisposed = true;
	}
}

/**
 * Calculates the exact un-letterboxed canvas pixel coordinate and normalized 0..1 coordinate
 * from a mouse/pointer event on a canvas styled with object-fit: contain (Fit-to-Viewport).
 */
export function getCanvasPointerPos(
	canvas: HTMLCanvasElement,
	clientX: number,
	clientY: number,
): { x: number; y: number; normX: number; normY: number } {
	const rect = canvas.getBoundingClientRect();
	const elemW = rect.width;
	const elemH = rect.height;
	const bufW = canvas.width;
	const bufH = canvas.height;

	if (elemW <= 0 || elemH <= 0 || bufW <= 0 || bufH <= 0) {
		return { x: 0, y: 0, normX: 0, normY: 0 };
	}

	const elemAspect = elemW / elemH;
	const bufAspect = bufW / bufH;

	let renderedW = elemW;
	let renderedH = elemH;
	let offsetX = 0;
	let offsetY = 0;

	if (elemAspect > bufAspect) {
		// Element is wider than buffer -> vertical fit, horizontal letterbox bars
		renderedH = elemH;
		renderedW = elemH * bufAspect;
		offsetX = (elemW - renderedW) / 2;
	} else {
		// Element is taller than buffer -> horizontal fit, vertical letterbox bars
		renderedW = elemW;
		renderedH = elemW / bufAspect;
		offsetY = (elemH - renderedH) / 2;
	}

	const localX = clientX - rect.left - offsetX;
	const localY = clientY - rect.top - offsetY;

	const normX = Math.max(0, Math.min(1, renderedW > 0 ? localX / renderedW : 0));
	const normY = Math.max(0, Math.min(1, renderedH > 0 ? localY / renderedH : 0));

	return {
		x: normX * (bufW - 1),
		y: normY * (bufH - 1),
		normX,
		normY,
	};
}

/**
 * Calculates updated 3D world millimeter coordinates during real-time crosshair translation dragging.
 * Correctly updates the two free spatial axes of the active plane while preserving the fixed slice axis.
 * Supports zoom & pan viewport transforms.
 */
export function calculateCrosshairDragWorldMm(
	pointerPx: { readonly x: number; readonly y: number },
	canvasSize: { readonly width: number; readonly height: number },
	plane: MprPlane,
	currentCrosshairMm: Point3D,
	angles: ObliqueRotationAngles,
	transform: ViewportTransform,
	volume?: CbctVoxelVolume | null | undefined,
): Point3D {
	if (!volume) return { ...currentCrosshairMm };
	return mapCanvasPointerToWorldMmWithTransform(
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
 * Calculations for synchronized 2D slice pixel and screen pixel crosshair positions across all 5 CBCT viewports
 * (Axial, Coronal, Sagittal, Panoramic, Cross-Section) in real time (60 FPS).
 */
export interface SynchronizedCrosshairProjection {
	readonly axial: {
		readonly centerSlicePx: { readonly x: number; readonly y: number };
		readonly centerScreenPx: { readonly x: number; readonly y: number };
		readonly coronalLineY: number;
		readonly sagittalLineX: number;
		readonly rotationDeg: number;
	};
	readonly coronal: {
		readonly centerSlicePx: { readonly x: number; readonly y: number };
		readonly centerScreenPx: { readonly x: number; readonly y: number };
		readonly axialLineY: number;
		readonly sagittalLineX: number;
		readonly rotationDeg: number;
	};
	readonly sagittal: {
		readonly centerSlicePx: { readonly x: number; readonly y: number };
		readonly centerScreenPx: { readonly x: number; readonly y: number };
		readonly axialLineY: number;
		readonly coronalLineX: number;
		readonly rotationDeg: number;
	};
	readonly panoramic: {
		readonly axialLineY: number;
		readonly crossSectionLineX: number | null;
	};
	readonly crossSection: {
		readonly axialLineY: number;
	};
}

/**
 * Calculates synchronized 2D slice pixel and screen pixel crosshair positions across all 5 CBCT viewports
 * (Axial, Coronal, Sagittal, Panoramic, Cross-Section) in real time (60 FPS).
 */
export function computeSynchronizedCrosshairProjections(
	worldMm: Point3D,
	volume: CbctVoxelVolume,
	obliqueAngles: ObliqueRotationAngles = DEFAULT_OBLIQUE_ROTATION,
	transforms?: Partial<Record<CbctViewportType, ViewportTransform>> | undefined,
	panoramicDimensions?: { readonly widthPx: number; readonly heightPx: number; readonly totalArcLengthMm?: number } | null | undefined,
	activeCrossSection?: { readonly centerPointMm: Point3D; readonly widthMm?: number; readonly pixelSpacingMm?: number } | null | undefined,
): SynchronizedCrosshairProjection {
	const vox = worldMmToVoxel(worldMm, volume);
	const depthMax = Math.max(1, volume.dimensions.depth - 1);
	const zPx = depthMax - vox.z;

	const axialTrans = transforms?.axial ?? DEFAULT_VIEWPORT_TRANSFORM;
	const coronalTrans = transforms?.coronal ?? DEFAULT_VIEWPORT_TRANSFORM;
	const sagittalTrans = transforms?.sagittal ?? DEFAULT_VIEWPORT_TRANSFORM;

	const axialSlice = { x: vox.x, y: vox.y };
	const axialScreen = slicePxToScreenPx(axialSlice, axialTrans);

	const coronalSlice = { x: vox.x, y: zPx };
	const coronalScreen = slicePxToScreenPx(coronalSlice, coronalTrans);

	const sagittalSlice = { x: vox.y, y: zPx };
	const sagittalScreen = slicePxToScreenPx(sagittalSlice, sagittalTrans);

	let panoAxialY = 0;
	let panoCrossX: number | null = null;

	if (panoramicDimensions && panoramicDimensions.heightPx > 0) {
		const zNorm = 1.0 - (vox.z / depthMax);
		panoAxialY = Math.round(zNorm * panoramicDimensions.heightPx);
		if (activeCrossSection && panoramicDimensions.totalArcLengthMm && panoramicDimensions.totalArcLengthMm > 0) {
			const relDist = Math.hypot(activeCrossSection.centerPointMm.x, activeCrossSection.centerPointMm.y);
			const ratio = Math.max(0, Math.min(1, relDist / panoramicDimensions.totalArcLengthMm));
			panoCrossX = Math.round(ratio * (panoramicDimensions.widthPx - 1));
		}
	}

	const csPixelSpacing = activeCrossSection?.pixelSpacingMm ?? 0.25;
	const csAxialY = Math.round(15.0 / (csPixelSpacing > 0 ? csPixelSpacing : 0.25));

	return {
		axial: {
			centerSlicePx: axialSlice,
			centerScreenPx: axialScreen,
			coronalLineY: axialScreen.y,
			sagittalLineX: axialScreen.x,
			rotationDeg: obliqueAngles.axialAngleDeg,
		},
		coronal: {
			centerSlicePx: coronalSlice,
			centerScreenPx: coronalScreen,
			axialLineY: coronalScreen.y,
			sagittalLineX: coronalScreen.x,
			rotationDeg: obliqueAngles.coronalTiltDeg,
		},
		sagittal: {
			centerSlicePx: sagittalSlice,
			centerScreenPx: sagittalScreen,
			axialLineY: sagittalScreen.y,
			coronalLineX: sagittalScreen.x,
			rotationDeg: obliqueAngles.sagittalTiltDeg,
		},
		panoramic: {
			axialLineY: panoAxialY,
			crossSectionLineX: panoCrossX,
		},
		crossSection: {
			axialLineY: csAxialY,
		},
	};
}

/**
 * Composites a base grayscale slice canvas (Layer 1) and an overlay UI canvas (Layer 2)
 * into a single unified canvas for clean PNG export / reporting snapshots without visual loss.
 */
export function getCompositeViewportCanvas(
	baseCanvas: HTMLCanvasElement | null,
	overlayCanvas: HTMLCanvasElement | null,
): HTMLCanvasElement | null {
	if (!baseCanvas && !overlayCanvas) return null;
	if (baseCanvas && !overlayCanvas) return baseCanvas;
	if (!baseCanvas && overlayCanvas) return overlayCanvas;

	if (typeof document === "undefined" || !document.createElement) {
		return baseCanvas || overlayCanvas;
	}

	const w = baseCanvas!.width > 0 ? baseCanvas!.width : (overlayCanvas!.width > 0 ? overlayCanvas!.width : 512);
	const h = baseCanvas!.height > 0 ? baseCanvas!.height : (overlayCanvas!.height > 0 ? overlayCanvas!.height : 512);

	const composite = document.createElement("canvas");
	composite.width = w;
	composite.height = h;

	const ctx = composite.getContext("2d");
	if (ctx) {
		if (baseCanvas && baseCanvas.width > 0 && baseCanvas.height > 0) {
			ctx.drawImage(baseCanvas, 0, 0, w, h);
		}
		if (overlayCanvas && overlayCanvas.width > 0 && overlayCanvas.height > 0) {
			ctx.drawImage(overlayCanvas, 0, 0, w, h);
		}
	}
	return composite;
}

// ─── 5. FORWARDING RE-EXPORTS FOR OBLIQUE MPR ENGINE ────────────────────────
