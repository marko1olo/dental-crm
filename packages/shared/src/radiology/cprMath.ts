/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL RADIOLOGY & CBCT: CURVED PLANAR REFORMATION (CPR) MATH ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 * Pure mathematical algorithms for volumetric 3D sampling, trilinear voxel
 * interpolation, uniform arc-length parameterized curve generation, and
 * cross-sectional resection geometry.
 *
 * Adapted from Dental-CBCT-Viewer reference core/cprMath.ts.
 * Pure TypeScript, zero DOM/Cornerstone dependencies, 100% unit-testable.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
	interpolateArchCurve,
	computeCurveNormals,
	totalArcLength,
	resampleByArcLength,
} from "./panoramicCprMath.js";

export type Point2 = [number, number];

export interface CPRResult {
	pixelData: Float32Array;
	width: number;
	height: number;
	horizontalSpacing: number;
	verticalSpacing: number;
	zMin: number;
	zMax: number;
}

/** Minimal volume description needed for volumetric sampling */
export interface VolumeSamplingData {
	dims: [number, number, number];
	origin: [number, number, number];
	getVoxel: (i: number, j: number, k: number) => number;
	invSx: number;
	invSy: number;
	invSz: number;
	zMin: number;
	zMax: number;
	vSpacing: number;
}

// ── Trilinear Interpolation ────────────────────────────────────

/**
 * -1024 HU ≈ CT air sentinel: returned for out-of-volume samples.
 * Standard dental CBCT/CT air baseline convention.
 */
export const AIR_HU = -1024;

/**
 * High-precision trilinear interpolation over a discrete 3D scalar field.
 * Samples out-of-volume return the AIR_HU sentinel (-1024).
 * Coordinates exactly on the outermost voxel plane (coord == dims - 1)
 * are safely clamped to avoid edge truncation artifacts.
 */
export function trilinear(
	getVoxel: (i: number, j: number, k: number) => number,
	dims: [number, number, number],
	ci: number,
	cj: number,
	ck: number,
): number {
	// Genuinely outside the volume boundary -> air sentinel
	if (
		ci < 0 ||
		ci > dims[0] - 1 ||
		cj < 0 ||
		cj > dims[1] - 1 ||
		ck < 0 ||
		ck > dims[2] - 1
	) {
		return AIR_HU;
	}

	// Clamp a hair inside so the upper neighbor index stays within volume bounds
	const qi = Math.max(0, Math.min(ci, dims[0] - 1 - 1e-6));
	const qj = Math.max(0, Math.min(cj, dims[1] - 1 - 1e-6));
	const qk = Math.max(0, Math.min(ck, dims[2] - 1 - 1e-6));

	const i0 = Math.floor(qi);
	const j0 = Math.floor(qj);
	const k0 = Math.floor(qk);

	const i1 = i0 + 1;
	const j1 = j0 + 1;
	const k1 = k0 + 1;

	const fi = qi - i0;
	const fj = qj - j0;
	const fk = qk - k0;

	const nfi = 1 - fi;
	const nfj = 1 - fj;
	const nfk = 1 - fk;

	return (
		getVoxel(i0, j0, k0) * nfi * nfj * nfk +
		getVoxel(i1, j0, k0) * fi * nfj * nfk +
		getVoxel(i0, j1, k0) * nfi * fj * nfk +
		getVoxel(i1, j1, k0) * fi * fj * nfk +
		getVoxel(i0, j0, k1) * nfi * nfj * fk +
		getVoxel(i1, j0, k1) * fi * nfj * fk +
		getVoxel(i0, j1, k1) * nfi * fj * fk +
		getVoxel(i1, j1, k1) * fi * fj * fk
	);
}

// ── Uniform Curve Construction ─────────────────────────────────

/**
 * Build a dense, arc-length-uniform curve with orthogonal unit normals from 2D control points.
 * Employs Catmull-Rom spline interpolation followed by arc-length reparameterization.
 */
export function buildUniformCurve(
	controlPoints: Point2[],
	numSamples: number,
): {
	curve: Point2[];
	normals: Point2[];
	arcLen: number;
} {
	if (controlPoints.length === 0) {
		return { curve: [], normals: [], arcLen: 0 };
	}

	const numSegments = Math.max(1, controlPoints.length - 1);
	const subsPerSeg = Math.max(10, Math.ceil(numSamples / numSegments) * 2);
	const rawCurve = interpolateArchCurve(controlPoints, subsPerSeg);

	const curve = resampleByArcLength(rawCurve, numSamples);
	if (curve.length === 0) {
		return { curve, normals: [], arcLen: 0 };
	}

	// Degenerate case (e.g., coincident control points): ensure >= 2 points
	const first = curve[0] ?? [0, 0];
	const safeCurve = curve.length < 2 ? [first, first] : curve;
	const normals = computeCurveNormals(safeCurve);
	const arcLen = totalArcLength(safeCurve);

	return { curve: safeCurve, normals, arcLen };
}

// ── Cross-Section Resection Sampling ───────────────────────────

export interface CrossSectionGeometryParams {
	controlPoints: Point2[];
	position: number; // 0-1 normalized position along the arch curve
	tiltDeg: number; // degrees: lean of slice vertical axis along the curve tangent
	widthMm: number; // total width of cross-section in mm
	resolution: number; // mm per pixel
}

/** World-space 3D coordinate frame of the cross-section plane */
export interface CrossSectionFrame {
	point: Point2; // Curve point (XY)
	normal: Point2; // Buccolingual unit normal
	tangent: Point2; // Unit tangent toward increasing arch position
	origin: [number, number, number]; // Plane origin: curve point at mid-Z
	eU: [number, number, number]; // In-plane horizontal unit vector (normal dir)
	eV: [number, number, number]; // In-plane vertical unit vector (tilted vertical axis)
}

/** Maximum allowed clinical tilt angle in degrees (±30°) */
export const MAX_CROSS_SECTION_TILT_DEG = 30;

/**
 * Calculates the world-space orthonormal coordinate frame for a cross-sectional slice.
 */
export function crossSectionFrame(
	controlPoints: Point2[],
	position: number,
	tiltDeg: number,
	zMin: number,
	zMax: number,
): CrossSectionFrame | null {
	const { curve, normals } = buildUniformCurve(controlPoints, 500);
	if (curve.length < 2) return null;

	const clampedPos = Math.max(0, Math.min(1, position));
	const idx = Math.round(clampedPos * (curve.length - 1));
	const point = curve[idx];
	const normal = normals[idx];
	if (!point || !normal) return null;

	// normal = tangent rotated 90° CW ([-ty, tx]), so tangent is [ny, -nx]
	const tangent: Point2 = [normal[1], -normal[0]];

	const clampedTiltDeg = Math.max(
		-MAX_CROSS_SECTION_TILT_DEG,
		Math.min(MAX_CROSS_SECTION_TILT_DEG, tiltDeg),
	);
	const tiltRad = (clampedTiltDeg * Math.PI) / 180;
	const sinT = Math.sin(tiltRad);
	const cosT = Math.cos(tiltRad);
	const zMid = (zMin + zMax) / 2;

	return {
		point,
		normal,
		tangent,
		origin: [point[0], point[1], zMid],
		eU: [normal[0], normal[1], 0],
		eV: [tangent[0] * sinT, tangent[1] * sinT, cosT],
	};
}

/**
 * Sample a cross-section slice perpendicular to the arch curve.
 * Horizontal axis: curve normal (buccolingual).
 * Vertical axis: Z axis leaned by tiltDeg toward curve tangent, pivoting at mid-Z.
 */
export function computeCrossSection(
	vol: VolumeSamplingData,
	params: CrossSectionGeometryParams,
): CPRResult | null {
	const frame = crossSectionFrame(
		params.controlPoints,
		params.position,
		params.tiltDeg,
		vol.zMin,
		vol.zMax,
	);
	if (!frame) return null;
	const { origin, eU, eV } = frame;

	const halfW = params.widthMm / 2;
	const width = Math.max(1, Math.round(params.widthMm / params.resolution));
	const height = Math.max(1, Math.round((vol.zMax - vol.zMin) / vol.vSpacing));
	const hSpacing = params.widthMm / Math.max(1, width - 1);
	const zMid = (vol.zMin + vol.zMax) / 2;

	const pixelData = new Float32Array(width * height);

	for (let y = 0; y < height; y++) {
		const v = vol.zMax - y * vol.vSpacing - zMid;
		const bx = origin[0] + eV[0] * v;
		const by = origin[1] + eV[1] * v;
		const ck = (origin[2] + eV[2] * v - vol.origin[2]) * vol.invSz;

		for (let x = 0; x < width; x++) {
			const offset = -halfW + x * hSpacing;
			const ci = (bx + eU[0] * offset - vol.origin[0]) * vol.invSx;
			const cj = (by + eU[1] * offset - vol.origin[1]) * vol.invSy;
			pixelData[y * width + x] = trilinear(vol.getVoxel, vol.dims, ci, cj, ck);
		}
	}

	return {
		pixelData,
		width,
		height,
		horizontalSpacing: hSpacing,
		verticalSpacing: vol.vSpacing,
		zMin: vol.zMin,
		zMax: vol.zMax,
	};
}
