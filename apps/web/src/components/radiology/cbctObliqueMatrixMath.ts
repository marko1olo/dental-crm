/**
 * DENTE CRM — CBCT Oblique Matrix, Vector & Projection Mathematical Engine
 * Standards: DICOM Part 3 / PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 *
 * Capabilities:
 * 1. 3D Axis Oblique Rotation: Axial Angle (yaw), Coronal Tilt (pitch), Sagittal Tilt (roll).
 * 2. 3D Vector & Rotation Matrix Math (Z-Y-X Euler composition).
 * 3. Orthonormal Basis Vector Calculation (u, v, normal) for arbitrary oblique planes.
 * 4. Coordinate Transformation from Transformed Canvas to 3D World Space (mm).
 */

import type {
	CbctVoxelVolume,
	MprPlane,
	Point3D,
} from "./cbctMprMath";
import {
	clampCoordinateToVolume,
	worldMmToSlicePx,
} from "./cbctCoordinateMath";

// ─── 1. OBLIQUE ROTATION & BASIS TYPES ───────────────────────────────────────

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

/**
 * Maps pointer coordinates from a transformed canvas (with zoom & pan) to 3D physical world millimeters,
 * taking into account the oblique plane orientation angles and rotated orthonormal basis vectors (u, v).
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
	if (!volume || volume.isDisposed || !volume.physicalSizeMm || !volume.dimensions || !volume.spacingMm) {
		return crosshairMm ?? { x: 0, y: 0, z: 0 };
	}

	const zoom = Number.isFinite(transform?.zoom) && transform.zoom > 0 ? transform.zoom : 1.0;
	const panX = Number.isFinite(transform?.panX) ? transform.panX : 0;
	const panY = Number.isFinite(transform?.panY) ? transform.panY : 0;

	const cWidth = canvasSize?.width > 0 ? canvasSize.width : 100;
	const cHeight = canvasSize?.height > 0 ? canvasSize.height : 100;

	// Invert viewport pan & zoom to get coordinates in slice pixel space
	const untransformedPxX = (pointerPx.x - panX) / zoom;
	const untransformedPxY = (pointerPx.y - panY) / zoom;

	// Physical millimeter spacing per canvas pixel for each MPR plane
	const sp = volume.spacingMm;
	let pixelSpacingX = sp.x;
	let pixelSpacingY = sp.y;

	switch (plane) {
		case "axial":
			pixelSpacingX = sp.x;
			pixelSpacingY = sp.y;
			break;
		case "coronal":
			pixelSpacingX = sp.x;
			pixelSpacingY = cHeight > 0 && Math.abs(cHeight - volume.dimensions.depth) < 2
				? sp.z
				: (volume.dimensions.depth * sp.z) / (cHeight > 0 ? cHeight : 1);
			break;
		case "sagittal":
			pixelSpacingX = sp.y;
			pixelSpacingY = cHeight > 0 && Math.abs(cHeight - volume.dimensions.depth) < 2
				? sp.z
				: (volume.dimensions.depth * sp.z) / (cHeight > 0 ? cHeight : 1);
			break;
	}

	// Compute pivot coordinate in canvas pixels corresponding to crosshairMm
	const slicePx = worldMmToSlicePx(crosshairMm, plane, volume);
	const expectedW = plane === "sagittal" ? volume.dimensions.height : volume.dimensions.width;
	const expectedH = plane === "axial"
		? volume.dimensions.height
		: Math.max(1, Math.round((volume.dimensions.depth * sp.z) / (plane === "coronal" ? sp.x : sp.y)));
	const scaleX = expectedW > 0 ? cWidth / expectedW : 1.0;
	const scaleY = expectedH > 0 ? cHeight / expectedH : 1.0;
	const pivotPx = {
		x: slicePx.x * scaleX,
		y: slicePx.y * scaleY,
	};

	// Offset from slice center in pixels
	const offsetColPx = untransformedPxX - pivotPx.x;
	const offsetRowPx = untransformedPxY - pivotPx.y;

	// Offset in physical millimeters along slice U and V axes
	const offsetMmU = offsetColPx * pixelSpacingX;
	const offsetMmV = offsetRowPx * pixelSpacingY;

	// Compute rotated orthonormal basis vectors for the oblique plane
	const basis = computeObliquePlaneBasis(plane, crosshairMm, angles ?? DEFAULT_OBLIQUE_ROTATION);

	// Map 2D slice offset to 3D physical world space using basis vectors u and v
	const worldX = crosshairMm.x + offsetMmU * basis.u.x + offsetMmV * basis.v.x;
	const worldY = crosshairMm.y + offsetMmU * basis.u.y + offsetMmV * basis.v.y;
	const worldZ = crosshairMm.z + offsetMmU * basis.u.z + offsetMmV * basis.v.z;

	return clampCoordinateToVolume({ x: worldX, y: worldY, z: worldZ }, volume);
}
