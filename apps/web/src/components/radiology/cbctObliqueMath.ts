/**
 * DENTE CRM — CBCT Oblique Multi-Planar Reconstruction (Oblique MPR) Mathematical Engine
 * Standards: DICOM Part 3 / PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 *
 * Capabilities:
 * 1. 3D Axis Oblique Rotation: Axial Angle (yaw), Coronal Tilt (pitch), Sagittal Tilt (roll).
 * 2. Orthonormal Basis Vector Calculation for arbitrary oblique slicing planes.
 * 3. High-Precision Sub-Voxel Trilinear & Bilinear HU Interpolation.
 * 4. Oblique Slab Thickness Projections (MIP, MinIP, Average IP).
 * 5. Interactive Mouse W/L (Right-click drag), Cursor-anchored Zoom (0.5x–5.0x), and Pan.
 * 6. Interactive Canvas Rotation Handles & Hit-testing for in-plane crosshair rotation.
 */

import {
	type CbctVoxelVolume,
	type MprPlane,
	type MprSliceExtractionResult,
	type Point3D,
	type SlabProjectionMode,
	type SliceRenderOptions,
	type VolumeSpacingMm,
	ROMEXIS_COLORS,
	clampCoordinateToVolume,
	huToGrayscale,
	sampleVoxelHU,
} from "./cbctMprMath";

// ─── 1. OBLIQUE ROTATION & VIEWPORT TYPES ────────────────────────────────────

export interface ObliqueRotationAngles {
	readonly axialAngleDeg: number; // In-plane rotation around Z axis (Axial viewport)
	readonly coronalTiltDeg: number; // Tilt angle around Y axis (Coronal viewport)
	readonly sagittalTiltDeg: number; // Tilt angle around X axis (Sagittal viewport)
}

export const DEFAULT_OBLIQUE_ROTATION: ObliqueRotationAngles = Object.freeze({
	axialAngleDeg: 0,
	coronalTiltDeg: 0,
	sagittalTiltDeg: 0,
});

/**
 * Returns clinical localized rotation label for the given plane.
 */
export function getObliqueRotationLabel(plane: MprPlane, angleDeg: number): string {
	const safeAngle = Number.isFinite(angleDeg) ? angleDeg : 0;
	const sign = safeAngle > 0 ? "+" : "";
	const formatted = `${sign}${safeAngle.toFixed(1)}°`;
	switch (plane) {
		case "axial":
			return `Поворот: ${formatted}`;
		case "coronal":
			return `Наклон: ${formatted}`;
		case "sagittal":
			return `Наклон: ${formatted}`;
	}
}

/**
 * Resets all 3 oblique rotation angles back to 0.0°.
 */
export function resetObliqueRotationAngles(): ObliqueRotationAngles {
	return { ...DEFAULT_OBLIQUE_ROTATION };
}

/**
 * Resets the oblique rotation angle for a single plane back to 0.0°.
 */
export function resetPlaneObliqueAngle(
	angles: ObliqueRotationAngles,
	plane: MprPlane,
): ObliqueRotationAngles {
	const current = angles ?? DEFAULT_OBLIQUE_ROTATION;
	switch (plane) {
		case "axial":
			return { ...current, axialAngleDeg: 0 };
		case "coronal":
			return { ...current, coronalTiltDeg: 0 };
		case "sagittal":
			return { ...current, sagittalTiltDeg: 0 };
	}
}

export interface ViewportTransform {
	readonly zoom: number; // 0.5 .. 5.0
	readonly panX: number; // Pixel horizontal pan offset
	readonly panY: number; // Pixel vertical pan offset
}

export const DEFAULT_VIEWPORT_TRANSFORM: ViewportTransform = Object.freeze({
	zoom: 1.0,
	panX: 0,
	panY: 0,
});

export interface ObliquePlaneBasis {
	readonly u: Point3D; // Unit vector along slice horizontal (X_slice) in world space (mm)
	readonly v: Point3D; // Unit vector along slice vertical (Y_slice) in world space (mm)
	readonly normal: Point3D; // Unit normal vector perpendicular to slice (Z_slice) in world space (mm)
	readonly centerMm: Point3D; // 3D world center (crosshair location) in mm
}

export type RotationHandlePosition = "u_pos" | "u_neg" | "v_pos" | "v_neg";

export interface RotationHandleInfo {
	readonly position: RotationHandlePosition;
	readonly canvasX: number;
	readonly canvasY: number;
	readonly radiusPx: number;
	readonly plane: MprPlane;
	readonly baseAngleDeg: number;
}

export interface ObliqueCrosshairDrawOptions {
	readonly widthPx: number;
	readonly heightPx: number;
	readonly centerPx: { readonly x: number; readonly y: number };
	readonly plane: MprPlane;
	readonly rotationDeg: number;
	readonly handleDistancePx?: number;
	readonly activeHandle?: RotationHandlePosition | null;
	readonly hoveredHandle?: RotationHandlePosition | null;
	readonly showHandles?: boolean;
	readonly showAngleBadge?: boolean;
}

// ─── 2. 3D VECTOR & ROTATION MATRIX MATH ─────────────────────────────────────

export function degToRad(deg: number): number {
	if (!Number.isFinite(deg)) return 0;
	return (deg * Math.PI) / 180.0;
}

export function radToDeg(rad: number): number {
	if (!Number.isFinite(rad)) return 0;
	return (rad * 180.0) / Math.PI;
}

export function normalizeVector3D(v: Point3D): Point3D {
	const len = Math.hypot(v.x, v.y, v.z);
	if (len < 1e-9 || !Number.isFinite(len)) return { x: 0, y: 0, z: 1 };
	return {
		x: v.x / len,
		y: v.y / len,
		z: v.z / len,
	};
}

export function dotProduct3D(a: Point3D, b: Point3D): number {
	return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function crossProduct3D(a: Point3D, b: Point3D): Point3D {
	return {
		x: a.y * b.z - a.z * b.y,
		y: a.z * b.x - a.x * b.z,
		z: a.x * b.y - a.y * b.x,
	};
}

/**
 * Computes a 3x3 rotation matrix using Z-Y-X Euler angle composition:
 * R = R_z(axialAngle) * R_y(coronalTilt) * R_x(sagittalTilt)
 */
export function computeObliqueRotationMatrix(angles: ObliqueRotationAngles): number[][] {
	const rz = degToRad(Number.isFinite(angles?.axialAngleDeg) ? angles.axialAngleDeg : 0);
	const ry = degToRad(Number.isFinite(angles?.coronalTiltDeg) ? angles.coronalTiltDeg : 0);
	const rx = degToRad(Number.isFinite(angles?.sagittalTiltDeg) ? angles.sagittalTiltDeg : 0);

	const cz = Math.cos(rz);
	const sz = Math.sin(rz);
	const cy = Math.cos(ry);
	const sy = Math.sin(ry);
	const cx = Math.cos(rx);
	const sx = Math.sin(rx);

	return [
		[cz * cy, cz * sy * sx - sz * cx, cz * sy * cx + sz * sx],
		[sz * cy, sz * sy * sx + cz * cx, sz * sy * cx - cz * sx],
		[-sy, cy * sx, cy * cx],
	];
}

/**
 * Multiplies a 3x3 matrix by a 3D vector.
 */
export function transformVector3D(matrix: number[][], v: Point3D): Point3D {
	const m0 = matrix[0] ?? [1, 0, 0];
	const m1 = matrix[1] ?? [0, 1, 0];
	const m2 = matrix[2] ?? [0, 0, 1];

	return {
		x: (m0[0] ?? 0) * v.x + (m0[1] ?? 0) * v.y + (m0[2] ?? 0) * v.z,
		y: (m1[0] ?? 0) * v.x + (m1[1] ?? 0) * v.y + (m1[2] ?? 0) * v.z,
		z: (m2[0] ?? 0) * v.x + (m2[1] ?? 0) * v.y + (m2[2] ?? 0) * v.z,
	};
}

/**
 * Computes the orthonormal basis vectors (u, v, normal) for an oblique slice plane
 * given the crosshair center and 3D rotation angles.
 */
export function computeObliquePlaneBasis(
	plane: MprPlane,
	crosshairMm: Point3D,
	angles: ObliqueRotationAngles,
): ObliquePlaneBasis {
	const rotMat = computeObliqueRotationMatrix(angles);

	let baseU: Point3D;
	let baseV: Point3D;
	let baseNormal: Point3D;

	switch (plane) {
		case "axial":
			baseU = { x: 1, y: 0, z: 0 };
			baseV = { x: 0, y: 1, z: 0 };
			baseNormal = { x: 0, y: 0, z: 1 };
			break;
		case "coronal":
			baseU = { x: 1, y: 0, z: 0 };
			baseV = { x: 0, y: 0, z: -1 };
			baseNormal = { x: 0, y: 1, z: 0 };
			break;
		case "sagittal":
			baseU = { x: 0, y: 1, z: 0 };
			baseV = { x: 0, y: 0, z: -1 };
			baseNormal = { x: 1, y: 0, z: 0 };
			break;
	}

	const rotatedU = normalizeVector3D(transformVector3D(rotMat, baseU));
	const rotatedV = normalizeVector3D(transformVector3D(rotMat, baseV));
	const rotatedNormal = normalizeVector3D(transformVector3D(rotMat, baseNormal));

	return {
		u: rotatedU,
		v: rotatedV,
		normal: rotatedNormal,
		centerMm: crosshairMm,
	};
}

// ─── 3. SUB-VOXEL TRILINEAR INTERPOLATION ────────────────────────────────────

/**
 * Evaluates continuous Hounsfield Unit (HU) at non-integer voxel coordinates
 * using 3D Trilinear Interpolation for artifact-free oblique rendering.
 */
export function sampleVoxelHUTrilinear(
	volume: CbctVoxelVolume,
	vx: number,
	vy: number,
	vz: number,
): number {
	if (!volume || !volume.data || volume.isDisposed) return -1000;

	const { width, height, depth } = volume.dimensions;

	// Robust boundary check handling NaN, Infinity, and out-of-volume bounds
	if (!(vx >= 0 && vx <= width - 1 && vy >= 0 && vy <= height - 1 && vz >= 0 && vz <= depth - 1)) {
		return -1000;
	}

	const x0 = Math.floor(vx);
	const y0 = Math.floor(vy);
	const z0 = Math.floor(vz);

	const x1 = Math.min(width - 1, x0 + 1);
	const y1 = Math.min(height - 1, y0 + 1);
	const z1 = Math.min(depth - 1, z0 + 1);

	const tx = vx - x0;
	const ty = vy - y0;
	const tz = vz - z0;

	const data = volume.data;
	const sliceStride = width * height;

	const row00 = z0 * sliceStride + y0 * width;
	const row10 = z0 * sliceStride + y1 * width;
	const row01 = z1 * sliceStride + y0 * width;
	const row11 = z1 * sliceStride + y1 * width;

	const c000 = data[row00 + x0] ?? -1000;
	const c100 = data[row00 + x1] ?? -1000;
	const c010 = data[row10 + x0] ?? -1000;
	const c110 = data[row10 + x1] ?? -1000;
	const c001 = data[row01 + x0] ?? -1000;
	const c101 = data[row01 + x1] ?? -1000;
	const c011 = data[row11 + x0] ?? -1000;
	const c111 = data[row11 + x1] ?? -1000;

	const c00 = c000 * (1.0 - tx) + c100 * tx;
	const c10 = c010 * (1.0 - tx) + c110 * tx;
	const c01 = c001 * (1.0 - tx) + c101 * tx;
	const c11 = c011 * (1.0 - tx) + c111 * tx;

	const c0 = c00 * (1.0 - ty) + c10 * ty;
	const c1 = c01 * (1.0 - ty) + c11 * ty;

	const hu = c0 * (1.0 - tz) + c1 * tz;

	return Math.round(hu);
}

// ─── 4. OBLIQUE SLICE EXTRACTION ENGINE ──────────────────────────────────────

export interface ObliqueSliceRenderOptions extends SliceRenderOptions {
	readonly interpolation?: "nearest" | "trilinear";
}

/**
 * Extracts a 2D slice at an arbitrary 3D oblique orientation from the CBCT volume.
 * Supports Trilinear Interpolation and Slab Thickness MIP / MinIP / Average modes.
 */
export function extractObliqueMprSlice(
	volume: CbctVoxelVolume,
	plane: MprPlane,
	crosshairMm: Point3D,
	angles: ObliqueRotationAngles = DEFAULT_OBLIQUE_ROTATION,
	options?: ObliqueSliceRenderOptions,
): MprSliceExtractionResult {
	const {
		windowWidth = 4400,
		windowLevel = 1300,
		invert = false,
		slabMode = "single",
		slabThicknessMm = 2.0,
		interpolation = "trilinear",
	} = options ?? {};

	const dim = volume.dimensions;
	const sp = volume.spacingMm;
	const origin = volume.originMm;

	let widthPx = 0;
	let heightPx = 0;
	let pixelSpacingX = 0;
	let pixelSpacingY = 0;
	let maxSliceIndex = 0;
	let physicalPosMm = 0;

	switch (plane) {
		case "axial":
			widthPx = dim.width;
			heightPx = dim.height;
			pixelSpacingX = sp.x;
			pixelSpacingY = sp.y;
			maxSliceIndex = dim.depth - 1;
			physicalPosMm = crosshairMm.z;
			break;
		case "coronal":
			widthPx = dim.width;
			heightPx = dim.depth;
			pixelSpacingX = sp.x;
			pixelSpacingY = sp.z;
			maxSliceIndex = dim.height - 1;
			physicalPosMm = crosshairMm.y;
			break;
		case "sagittal":
			widthPx = dim.height;
			heightPx = dim.depth;
			pixelSpacingX = sp.y;
			pixelSpacingY = sp.z;
			maxSliceIndex = dim.width - 1;
			physicalPosMm = crosshairMm.x;
			break;
	}

	const basis = computeObliquePlaneBasis(plane, crosshairMm, angles);
	const totalPixels = widthPx * heightPx;
	const pixelBuffer = new Uint8ClampedArray(totalPixels * 4);

	const halfW = widthPx / 2.0;
	const halfH = heightPx / 2.0;

	const normalStepMm = Math.min(sp.x, Math.min(sp.y, sp.z));
	const isSlabActive = slabMode !== "single" && slabThicknessMm > normalStepMm;
	const halfSlabMm = isSlabActive ? slabThicknessMm / 2.0 : 0;
	const slabSteps = isSlabActive ? Math.max(1, Math.round(slabThicknessMm / normalStepMm)) : 1;
	const stepMm = isSlabActive ? slabThicknessMm / slabSteps : 0;

	const uX = basis.u.x * pixelSpacingX;
	const uY = basis.u.y * pixelSpacingX;
	const uZ = basis.u.z * pixelSpacingX;

	const vX = basis.v.x * pixelSpacingY;
	const vY = basis.v.y * pixelSpacingY;
	const vZ = basis.v.z * pixelSpacingY;

	const nX = basis.normal.x;
	const nY = basis.normal.y;
	const nZ = basis.normal.z;

	const invSpX = 1.0 / sp.x;
	const invSpY = 1.0 / sp.y;
	const invSpZ = 1.0 / sp.z;

	if (!isSlabActive) {
		for (let row = 0; row < heightPx; row++) {
			const offsetRow = row - halfH;
			const baseRowWorldX = crosshairMm.x + offsetRow * vX;
			const baseRowWorldY = crosshairMm.y + offsetRow * vY;
			const baseRowWorldZ = crosshairMm.z + offsetRow * vZ;

			let pIdx = row * widthPx * 4;

			for (let col = 0; col < widthPx; col++) {
				const offsetCol = col - halfW;
				const worldX = baseRowWorldX + offsetCol * uX;
				const worldY = baseRowWorldY + offsetCol * uY;
				const worldZ = baseRowWorldZ + offsetCol * uZ;

				const vx = (worldX - origin.x) * invSpX;
				const vy = (worldY - origin.y) * invSpY;
				const vz = (worldZ - origin.z) * invSpZ;

				let hu: number;
				if (interpolation === "trilinear") {
					hu = sampleVoxelHUTrilinear(volume, vx, vy, vz);
				} else {
					hu = sampleVoxelHU(Math.round(vx), Math.round(vy), Math.round(vz), volume);
				}

				const gray = huToGrayscale(hu, windowWidth, windowLevel, invert);

				pixelBuffer[pIdx] = gray;
				pixelBuffer[pIdx + 1] = gray;
				pixelBuffer[pIdx + 2] = gray;
				pixelBuffer[pIdx + 3] = 255;
				pIdx += 4;
			}
		}
	} else {
		for (let row = 0; row < heightPx; row++) {
			const offsetRow = row - halfH;
			const baseRowWorldX = crosshairMm.x + offsetRow * vX;
			const baseRowWorldY = crosshairMm.y + offsetRow * vY;
			const baseRowWorldZ = crosshairMm.z + offsetRow * vZ;

			let pIdx = row * widthPx * 4;

			for (let col = 0; col < widthPx; col++) {
				const offsetCol = col - halfW;
				const baseWorldX = baseRowWorldX + offsetCol * uX;
				const baseWorldY = baseRowWorldY + offsetCol * uY;
				const baseWorldZ = baseRowWorldZ + offsetCol * uZ;

				let maxHU = -32768;
				let minHU = 32767;
				let sumHU = 0;
				let count = 0;

				for (let s = 0; s <= slabSteps; s++) {
					const normDist = -halfSlabMm + s * stepMm;
					const worldX = baseWorldX + normDist * nX;
					const worldY = baseWorldY + normDist * nY;
					const worldZ = baseWorldZ + normDist * nZ;

					const vx = (worldX - origin.x) * invSpX;
					const vy = (worldY - origin.y) * invSpY;
					const vz = (worldZ - origin.z) * invSpZ;

					let hu: number;
					if (interpolation === "trilinear") {
						hu = sampleVoxelHUTrilinear(volume, vx, vy, vz);
					} else {
						hu = sampleVoxelHU(Math.round(vx), Math.round(vy), Math.round(vz), volume);
					}

					if (hu > maxHU) maxHU = hu;
					if (hu < minHU) minHU = hu;
					sumHU += hu;
					count++;
				}

				let finalHU = maxHU;
				if (slabMode === "minip") finalHU = minHU;
				else if (slabMode === "average") finalHU = count > 0 ? Math.round(sumHU / count) : minHU;

				const gray = huToGrayscale(finalHU, windowWidth, windowLevel, invert);

				pixelBuffer[pIdx] = gray;
				pixelBuffer[pIdx + 1] = gray;
				pixelBuffer[pIdx + 2] = gray;
				pixelBuffer[pIdx + 3] = 255;
				pIdx += 4;
			}
		}
	}

	return {
		data: pixelBuffer,
		metadata: {
			plane,
			sliceIndex: 0,
			maxSliceIndex,
			physicalPositionMm: Number(physicalPosMm.toFixed(2)),
			widthPx,
			heightPx,
			pixelSpacingX,
			pixelSpacingY,
			slabThicknessMm: isSlabActive ? slabThicknessMm : pixelSpacingX,
		},
	};
}

/**
 * Reslices all 3 orthogonal planes synchronously at the given crosshair position and oblique angles.
 */
export function resliceObliqueMprSynchronized(
	volume: CbctVoxelVolume,
	crosshairMm: Point3D,
	angles: ObliqueRotationAngles,
	windowWidth: number,
	windowLevel: number,
	slabMode: SlabProjectionMode = "single",
	slabThicknessMm = 2.0,
	interpolation: "trilinear" | "nearest" = "trilinear",
): Record<MprPlane, MprSliceExtractionResult> {
	const renderOptions: ObliqueSliceRenderOptions = {
		windowWidth,
		windowLevel,
		slabMode,
		slabThicknessMm,
		interpolation,
	};

	return {
		axial: extractObliqueMprSlice(volume, "axial", crosshairMm, angles, renderOptions),
		coronal: extractObliqueMprSlice(volume, "coronal", crosshairMm, angles, renderOptions),
		sagittal: extractObliqueMprSlice(volume, "sagittal", crosshairMm, angles, renderOptions),
	};
}

// ─── 5. INTERACTIVE WINDOW / LEVEL & ZOOM / PAN MATH ─────────────────────────

/**
 * Calculates updated Window Width and Level from mouse drag deltas (Right Click Drag).
 * DeltaX adjusts Window Width (Contrast), DeltaY adjusts Window Level (Brightness).
 */
export function applyWindowLevelDrag(
	currentWW: number,
	currentWL: number,
	deltaX: number,
	deltaY: number,
	sensitivity = 2.0,
): { windowWidth: number; windowLevel: number } {
	const newWW = Math.max(1, Math.min(6000, Math.round(currentWW + deltaX * sensitivity)));
	const newWL = Math.max(-1500, Math.min(3000, Math.round(currentWL - deltaY * sensitivity)));

	return {
		windowWidth: newWW,
		windowLevel: newWL,
	};
}

/**
 * Calculates smooth zoom toward cursor position while preserving the world point under the mouse.
 */
export function applyCursorZoom(
	currentTransform: ViewportTransform,
	cursorPx: { readonly x: number; readonly y: number },
	zoomDelta: number,
	minZoom = 0.5,
	maxZoom = 5.0,
): ViewportTransform {
	const safeMin = Math.max(0.1, minZoom);
	const safeMax = Math.max(safeMin, maxZoom);
	const currentZoom = Number.isFinite(currentTransform?.zoom) && currentTransform.zoom >= safeMin
		? Math.min(safeMax, currentTransform.zoom)
		: 1.0;
	const panX = Number.isFinite(currentTransform?.panX) ? currentTransform.panX : 0;
	const panY = Number.isFinite(currentTransform?.panY) ? currentTransform.panY : 0;

	if (!Number.isFinite(zoomDelta)) {
		return {
			zoom: Number(currentZoom.toFixed(3)),
			panX: Number(panX.toFixed(1)),
			panY: Number(panY.toFixed(1)),
		};
	}

	const zoomFactor = Math.exp(-zoomDelta * 0.0015);
	const newZoom = Math.max(safeMin, Math.min(safeMax, currentZoom * zoomFactor));

	const curX = Number.isFinite(cursorPx?.x) ? cursorPx.x : 0;
	const curY = Number.isFinite(cursorPx?.y) ? cursorPx.y : 0;

	const worldPointX = (curX - panX) / currentZoom;
	const worldPointY = (curY - panY) / currentZoom;

	const newPanX = curX - worldPointX * newZoom;
	const newPanY = curY - worldPointY * newZoom;

	return {
		zoom: Number(newZoom.toFixed(3)),
		panX: Number(newPanX.toFixed(1)),
		panY: Number(newPanY.toFixed(1)),
	};
}

/**
 * Calculates updated pan offset from mouse drag deltas (Middle Click / Pan).
 */
export function applyPanDrag(
	currentTransform: ViewportTransform,
	deltaX: number,
	deltaY: number,
): ViewportTransform {
	const currentZoom = Number.isFinite(currentTransform?.zoom) && currentTransform.zoom > 0 ? currentTransform.zoom : 1.0;
	const currentPanX = Number.isFinite(currentTransform?.panX) ? currentTransform.panX : 0;
	const currentPanY = Number.isFinite(currentTransform?.panY) ? currentTransform.panY : 0;
	const safeDx = Number.isFinite(deltaX) ? deltaX : 0;
	const safeDy = Number.isFinite(deltaY) ? deltaY : 0;

	return {
		zoom: currentZoom,
		panX: Number((currentPanX + safeDx).toFixed(1)),
		panY: Number((currentPanY + safeDy).toFixed(1)),
	};
}

/**
 * Resets viewport zoom and pan to initial 1.0x centered state.
 */
export function resetViewportTransform(): ViewportTransform {
	return { ...DEFAULT_VIEWPORT_TRANSFORM };
}

// ─── 6. INTERACTIVE CANVAS ROTATION HANDLES & HIT-TESTING ───────────────────

/**
 * Computes the 4 rotation handle positions in canvas pixel space relative to the crosshair center.
 */
export function getRotationHandles(
	plane: MprPlane,
	canvasWidth: number,
	canvasHeight: number,
	crosshairCenterPx: { readonly x: number; readonly y: number },
	handleDistancePx = 60,
	rotationDeg = 0,
): RotationHandleInfo[] {
	const rotRad = degToRad(rotationDeg);
	const cosA = Math.cos(rotRad);
	const sinA = Math.sin(rotRad);

	const d = handleDistancePx;
	const rPx = 6.0;

	const positions: { pos: RotationHandlePosition; dx: number; dy: number; baseAngle: number }[] = [
		{ pos: "u_pos", dx: d * cosA, dy: d * sinA, baseAngle: 0 },
		{ pos: "u_neg", dx: -d * cosA, dy: -d * sinA, baseAngle: 180 },
		{ pos: "v_pos", dx: -d * sinA, dy: d * cosA, baseAngle: 90 },
		{ pos: "v_neg", dx: d * sinA, dy: -d * cosA, baseAngle: 270 },
	];

	return positions.map((p) => ({
		position: p.pos,
		canvasX: Math.round(crosshairCenterPx.x + p.dx),
		canvasY: Math.round(crosshairCenterPx.y + p.dy),
		radiusPx: rPx,
		plane,
		baseAngleDeg: p.baseAngle,
	}));
}

/**
 * Hit tests pointer coordinates against rotation handles.
 */
export function hitTestRotationHandle(
	pointerPx: { readonly x: number; readonly y: number },
	handles: readonly RotationHandleInfo[],
	hitTolerancePx = 10,
): RotationHandleInfo | null {
	for (const h of handles) {
		const dist = Math.hypot(pointerPx.x - h.canvasX, pointerPx.y - h.canvasY);
		if (dist <= h.radiusPx + hitTolerancePx) {
			return h;
		}
	}
	return null;
}

/**
 * Calculates new in-plane rotation angle (in degrees) when dragging a rotation handle around the center.
 */
export function calculateAngleFromHandleDrag(
	centerPx: { readonly x: number; readonly y: number },
	currentPointerPx: { readonly x: number; readonly y: number },
	handlePosition: RotationHandlePosition,
): number {
	const dx = currentPointerPx.x - centerPx.x;
	const dy = currentPointerPx.y - centerPx.y;
	if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return 0;
	let angleRad = Math.atan2(dy, dx);

	switch (handlePosition) {
		case "u_pos":
			break;
		case "u_neg":
			angleRad -= Math.PI;
			break;
		case "v_pos":
			angleRad -= Math.PI / 2.0;
			break;
		case "v_neg":
			angleRad += Math.PI / 2.0;
			break;
	}

	let deg = radToDeg(angleRad);
	while (deg > 180) deg -= 360;
	while (deg < -180) deg += 360;

	return Number(deg.toFixed(1));
}

/**
 * Calculates in-plane rotation angle (in degrees) when dragging anywhere on canvas with Shift key held.
 */
export function calculateAngleFromShiftDrag(
	centerPx: { readonly x: number; readonly y: number },
	currentPointerPx: { readonly x: number; readonly y: number },
	startPointerPx: { readonly x: number; readonly y: number },
	initialAngleDeg: number,
): number {
	const dx0 = startPointerPx.x - centerPx.x;
	const dy0 = startPointerPx.y - centerPx.y;
	const dx1 = currentPointerPx.x - centerPx.x;
	const dy1 = currentPointerPx.y - centerPx.y;

	if (Math.hypot(dx0, dy0) < 1e-3 || Math.hypot(dx1, dy1) < 1e-3) {
		return initialAngleDeg;
	}

	const angle0 = Math.atan2(dy0, dx0);
	const angle1 = Math.atan2(dy1, dx1);
	let deltaDeg = radToDeg(angle1 - angle0);

	let newDeg = initialAngleDeg + deltaDeg;
	while (newDeg > 180) newDeg -= 360;
	while (newDeg < -180) newDeg += 360;

	return Number(newDeg.toFixed(1));
}

/**
 * Hit tests pointer coordinates against the central reticle ring (for 1-click or double-click reset).
 */
export function hitTestCrosshairCenter(
	pointerPx: { readonly x: number; readonly y: number },
	centerPx: { readonly x: number; readonly y: number },
	hitTolerancePx = 14,
): boolean {
	const dist = Math.hypot(pointerPx.x - centerPx.x, pointerPx.y - centerPx.y);
	return dist <= hitTolerancePx;
}

// ─── 7. CANVAS OBLIQUE CROSSHAIR & ROTATION HANDLES RENDERER ────────────────

/**
 * Draws rotated crosshair reticles, tick marks, circular sector arc, rotation handles, and angle badges onto the canvas.
 */
export function drawObliqueCrosshairWithRotationHandles(
	ctx: CanvasRenderingContext2D,
	options: ObliqueCrosshairDrawOptions,
): void {
	const {
		widthPx,
		heightPx,
		centerPx,
		plane,
		rotationDeg,
		handleDistancePx = 65,
		activeHandle = null,
		hoveredHandle = null,
		showHandles = true,
		showAngleBadge = true,
	} = options;

	const safeRotationDeg = Number.isFinite(rotationDeg) ? rotationDeg : 0;
	const rotRad = degToRad(safeRotationDeg);
	const cosA = Math.cos(rotRad);
	const sinA = Math.sin(rotRad);

	let axisColor1: string;
	let axisColor2: string;
	let planeAccentColor: string;

	switch (plane) {
		case "axial":
			axisColor1 = ROMEXIS_COLORS.coronal; // Amber
			axisColor2 = ROMEXIS_COLORS.sagittal; // Emerald
			planeAccentColor = ROMEXIS_COLORS.axial; // Cyan
			break;
		case "coronal":
			axisColor1 = ROMEXIS_COLORS.axial; // Cyan
			axisColor2 = ROMEXIS_COLORS.sagittal; // Emerald
			planeAccentColor = ROMEXIS_COLORS.coronal; // Amber
			break;
		case "sagittal":
			axisColor1 = ROMEXIS_COLORS.axial; // Cyan
			axisColor2 = ROMEXIS_COLORS.coronal; // Amber
			planeAccentColor = ROMEXIS_COLORS.sagittal; // Emerald
			break;
	}

	ctx.save();

	const diag = Math.hypot(widthPx, heightPx);

	// 1. Axis 1 (Primary horizontal axis when rotation = 0)
	ctx.strokeStyle = axisColor1;
	ctx.lineWidth = 1.2;
	ctx.beginPath();
	ctx.moveTo(centerPx.x - diag * cosA, centerPx.y - diag * sinA);
	ctx.lineTo(centerPx.x + diag * cosA, centerPx.y + diag * sinA);
	ctx.stroke();

	// 2. Axis 2 (Secondary vertical axis when rotation = 0)
	ctx.strokeStyle = axisColor2;
	ctx.lineWidth = 1.2;
	ctx.beginPath();
	ctx.moveTo(centerPx.x + diag * sinA, centerPx.y - diag * cosA);
	ctx.lineTo(centerPx.x - diag * sinA, centerPx.y + diag * cosA);
	ctx.stroke();

	// 3. Central Reticle Target Ring (Double circle for precision navigation and 1-click reset hit target)
	ctx.strokeStyle = "rgba(15, 23, 42, 0.9)";
	ctx.lineWidth = 3.0;
	ctx.beginPath();
	ctx.arc(centerPx.x, centerPx.y, 4.5, 0, Math.PI * 2);
	ctx.stroke();

	ctx.strokeStyle = "#ffffff";
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.arc(centerPx.x, centerPx.y, 4.5, 0, Math.PI * 2);
	ctx.stroke();

	ctx.fillStyle = planeAccentColor;
	ctx.beginPath();
	ctx.arc(centerPx.x, centerPx.y, 1.5, 0, Math.PI * 2);
	ctx.fill();

	// 4. Rotation Handles & Circular Arc Indicator
	if (showHandles) {
		const handles = getRotationHandles(plane, widthPx, heightPx, centerPx, handleDistancePx, safeRotationDeg);

		// Circular guide track (Dashed background ring)
		ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
		ctx.lineWidth = 1.0;
		ctx.setLineDash([2, 3]);
		ctx.beginPath();
		ctx.arc(centerPx.x, centerPx.y, handleDistancePx, 0, Math.PI * 2);
		ctx.stroke();
		ctx.setLineDash([]);

		// Rotational Arc Sector (Visualizes angle swept from 0 deg to current rotation)
		if (Math.abs(safeRotationDeg) > 0.1) {
			ctx.save();
			ctx.strokeStyle = planeAccentColor;
			ctx.lineWidth = 2.0;
			ctx.shadowColor = planeAccentColor;
			ctx.shadowBlur = 4;
			ctx.beginPath();
			if (safeRotationDeg > 0) {
				ctx.arc(centerPx.x, centerPx.y, handleDistancePx, 0, rotRad, false);
			} else {
				ctx.arc(centerPx.x, centerPx.y, handleDistancePx, rotRad, 0, false);
			}
			ctx.stroke();
			ctx.restore();
		}

		// 4 Handle Knobs at the axis ends
		for (const h of handles) {
			const isActive = activeHandle === h.position;
			const isHovered = hoveredHandle === h.position;
			const color = h.position.startsWith("u") ? axisColor1 : axisColor2;

			ctx.save();
			ctx.beginPath();
			ctx.arc(h.canvasX, h.canvasY, isActive ? 7.0 : isHovered ? 6.0 : 4.5, 0, Math.PI * 2);

			if (isActive) {
				ctx.fillStyle = "#ffffff";
				ctx.shadowColor = color;
				ctx.shadowBlur = 8;
			} else if (isHovered) {
				ctx.fillStyle = color;
				ctx.shadowColor = color;
				ctx.shadowBlur = 6;
			} else {
				ctx.fillStyle = color;
			}

			ctx.fill();
			ctx.strokeStyle = "#ffffff";
			ctx.lineWidth = 1.5;
			ctx.stroke();
			ctx.restore();
		}
	}

	// 5. Real-time Rotation Angle HUD Badge (e.g. "Поворот: +15.0°" or "Наклон: -5.0°")
	if (showAngleBadge && Math.abs(safeRotationDeg) > 0.1) {
		const badgeText = getObliqueRotationLabel(plane, safeRotationDeg);
		ctx.font = "bold 10px monospace";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		const badgeDist = handleDistancePx + 24;
		const badgeX = centerPx.x + badgeDist * cosA;
		const badgeY = centerPx.y + badgeDist * sinA;

		ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
		ctx.strokeStyle = "rgba(56, 189, 248, 0.5)";
		ctx.lineWidth = 1.0;

		const textW = ctx.measureText(badgeText).width;
		ctx.beginPath();
		ctx.roundRect(badgeX - textW / 2 - 5, badgeY - 9, textW + 10, 18, 4);
		ctx.fill();
		ctx.stroke();

		ctx.fillStyle = "#38bdf8";
		ctx.fillText(badgeText, badgeX, badgeY);
	}

	ctx.restore();
}

/**
 * Maps pointer coordinates from a transformed canvas (with zoom & pan) to 3D physical world millimeters.
 */
export function mapCanvasPointerToWorldMmWithTransform(
	pointerPx: { readonly x: number; readonly y: number },
	canvasSize: { readonly width: number; readonly height: number },
	plane: MprPlane,
	crosshairMm: Point3D,
	angles: ObliqueRotationAngles,
	transform: ViewportTransform,
	volume: CbctVoxelVolume,
): Point3D {
	if (!volume || volume.isDisposed || !volume.physicalSizeMm) {
		return crosshairMm ?? { x: 0, y: 0, z: 0 };
	}

	const zoom = Number.isFinite(transform?.zoom) && transform.zoom > 0 ? transform.zoom : 1.0;
	const panX = Number.isFinite(transform?.panX) ? transform.panX : 0;
	const panY = Number.isFinite(transform?.panY) ? transform.panY : 0;

	const cWidth = canvasSize?.width > 0 ? canvasSize.width : 100;
	const cHeight = canvasSize?.height > 0 ? canvasSize.height : 100;

	const untransformedPxX = (pointerPx.x - panX) / zoom;
	const untransformedPxY = (pointerPx.y - panY) / zoom;

	const normX = untransformedPxX / cWidth;
	const normY = untransformedPxY / cHeight;

	const halfX = volume.physicalSizeMm.x / 2.0;
	const halfY = volume.physicalSizeMm.y / 2.0;
	const halfZ = volume.physicalSizeMm.z / 2.0;

	let newX = crosshairMm.x;
	let newY = crosshairMm.y;
	let newZ = crosshairMm.z;

	switch (plane) {
		case "axial":
			newX = (normX - 0.5) * 2.0 * halfX;
			newY = (normY - 0.5) * 2.0 * halfY;
			break;
		case "coronal":
			newX = (normX - 0.5) * 2.0 * halfX;
			newZ = (0.5 - normY) * 2.0 * halfZ;
			break;
		case "sagittal":
			newY = (normX - 0.5) * 2.0 * halfY;
			newZ = (0.5 - normY) * 2.0 * halfZ;
			break;
	}

	return clampCoordinateToVolume({ x: newX, y: newY, z: newZ }, volume);
}
