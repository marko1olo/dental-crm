/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL RADIOLOGY & CBCT: CPR SAMPLING & CROSS-SECTION MATH ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 * Pure mathematical algorithms for Curved Planar Reformation (CPR) and
 * orthogonal cross-sections for dental implant planning:
 *  - 3D Trilinear voxel interpolation with CT air sentinel (-1024 HU)
 *  - Boundary safe clamping (preventing 1-pixel dark rim artifacts)
 *  - Orthogonal cross-sectional resections with tilted axis (±30° clinical limit)
 *  - Panoramic curved planar unwrapping with MIP and Average slab projection
 *
 * Adapted from DenCT core/cprMath.ts for dental outpatient chairside care.
 * Pure TypeScript, zero DOM/Cornerstone dependencies, 100% unit-testable.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
	interpolateArchCurve,
	computeCurveNormals,
	totalArcLength,
	resampleByArcLength,
	type Point2,
} from "./archCurve.js";

export type { Point2 };

export interface CPRResult {
	pixelData: Float32Array;
	width: number;
	height: number;
	horizontalSpacing: number;
	verticalSpacing: number;
	zMin: number;
	zMax: number;
}

/**
 * Minimal volume description needed for volumetric 3D sampling.
 */
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
 * Standard CT/CBCT air sentinel value in Hounsfield Units (-1024 HU).
 * Returned when a sample point falls outside the reconstructed volume.
 */
export const AIR_HU = -1024;

/**
 * Maximum permissible cross-section slice tilt in degrees (±30°).
 * Matches clinical dental implantology viewing limits.
 */
export const MAX_CROSS_SECTION_TILT_DEG = 30;

/**
 * High-precision trilinear interpolation over a discrete 3D scalar voxel field.
 *
 * @param getVoxel Discrete voxel lookup function (i, j, k) -> scalar value
 * @param dims Dimensions [nx, ny, nz] of the volume grid
 * @param ci Fractional index coordinate along X
 * @param cj Fractional index coordinate along Y
 * @param ck Fractional index coordinate along Z
 * @returns Interpolated scalar value (e.g. HU) or AIR_HU if out of bounds.
 */
export function trilinear(
	getVoxel: (i: number, j: number, k: number) => number,
	dims: [number, number, number],
	ci: number,
	cj: number,
	ck: number,
): number {
	// Genuinely outside the volume -> air sentinel
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

	// Samples exactly ON the outermost voxel plane (coord == dims - 1)
	// must interpolate real data instead of returning the air sentinel.
	// Clamping a hair inside keeps the upper neighbor index in range.
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
 * Builds a dense, arc-length-uniform curve with unit normals from control points.
 */
export function buildUniformCurve(
	controlPoints: Point2[],
	numSamples: number,
): { curve: Point2[]; normals: Point2[]; arcLen: number } {
	if (controlPoints.length === 0) {
		return { curve: [], normals: [], arcLen: 0 };
	}

	// 1. Dense Catmull-Rom interpolation
	const numSegments = Math.max(1, controlPoints.length - 1);
	const subsPerSeg = Math.max(10, Math.ceil(numSamples / numSegments) * 2);
	const rawCurve = interpolateArchCurve(controlPoints, subsPerSeg);

	// 2. Resample uniformly by cumulative arc length
	const curve = resampleByArcLength(rawCurve, numSamples);
	if (curve.length === 0) {
		return { curve, normals: [], arcLen: 0 };
	}

	// Degenerate single point fallback: replicate to length 2
	const safeCurve = curve.length < 2 ? [curve[0]!, curve[0]!] : curve;
	const normals = computeCurveNormals(safeCurve);
	const arcLen = totalArcLength(safeCurve);

	return { curve: safeCurve, normals, arcLen };
}

// ── Cross-Section Resection ────────────────────────────────────

export interface CrossSectionGeometryParams {
	controlPoints: Point2[];
	/** Normalized position along the dental arch curve [0, 1] */
	position: number;
	/** Tilt angle of the cross-section slice vertical axis along the curve in degrees (clamped to ±30°) */
	tiltDeg: number;
	/** Total width of the cross-section slice in mm */
	widthMm: number;
	/** Sampling resolution in mm per pixel */
	resolution: number;
}

/** 3D spatial coordinate frame of an orthogonal cross-section slice */
export interface CrossSectionFrame {
	/** Curve point in the axial XY plane */
	point: Point2;
	/** Buccolingual unit normal vector in the XY plane */
	normal: Point2;
	/** Unit tangent vector toward increasing arch position */
	tangent: Point2;
	/** 3D plane origin: curve point at mid-Z elevation */
	origin: [number, number, number];
	/** Horizontal in-plane unit basis axis (buccolingual normal direction) */
	eU: [number, number, number];
	/** Vertical in-plane unit basis axis (tilted along tangent) */
	eV: [number, number, number];
}

/**
 * Computes the 3D world-space coordinate frame for an orthogonal cross-section slice.
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
	const point = curve[idx]!;
	const normal = normals[idx]!;

	// normal = [-ty, tx] -> tangent is [ny, -nx]
	const tangent: Point2 = [normal[1], -normal[0]];

	// Clamp tilt angle to clinical safety limit of ±30°
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
 * Computes an orthogonal cross-section slice through the 3D volume perpendicular to the dental arch curve.
 *
 * The cross-section plane is parameterized as:
 *  - Horizontal U axis: buccolingual normal direction
 *  - Vertical V axis: Z axis tilted by tiltDeg along the arch tangent, pivoting at mid-Z
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
	const height = Math.max(
		1,
		Math.round(Math.abs(vol.zMax - vol.zMin) / vol.vSpacing),
	);
	const hSpacing = params.widthMm / Math.max(1, width - 1);
	const zMid = (vol.zMin + vol.zMax) / 2;

	const pixelData = new Float32Array(width * height);

	for (let y = 0; y < height; y++) {
		// Signed mm along the slice vertical axis, 0 at the mid-Z pivot
		const v = vol.zMax - y * vol.vSpacing - zMid;
		const bx = origin[0] + eV[0] * v;
		const by = origin[1] + eV[1] * v;
		const ck = (origin[2] + eV[2] * v - vol.origin[2]) * vol.invSz;

		for (let x = 0; x < width; x++) {
			const offset = -halfW + x * hSpacing;
			const ci = (bx + eU[0] * offset - vol.origin[0]) * vol.invSx;
			const cj = (by + eU[1] * offset - vol.origin[1]) * vol.invSy;
			pixelData[y * width + x] = trilinear(
				vol.getVoxel,
				vol.dims,
				ci,
				cj,
				ck,
			);
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

// ── Panoramic CPR Reformation ──────────────────────────────────

export interface PanoramicReformationParams {
	controlPoints: Point2[];
	slabWidthMm?: number;
	projection?: "MIP" | "average";
	resolution?: number; // mm per pixel along curve
	resolutionMm?: number; // alias for resolution
}

/**
 * Computes a Panoramic Curved Planar Reformation (OPG-like view) from the volume along the dental arch.
 */
export function computePanoramicCPR(
	vol: VolumeSamplingData,
	params: PanoramicReformationParams,
): CPRResult | null {
	const slabWidth = params.slabWidthMm ?? 1.0;
	const projection = params.projection ?? "MIP";
	const resolution = params.resolution ?? params.resolutionMm ?? 0.5;

	const roughCurve = interpolateArchCurve(params.controlPoints, 10);
	const arcEstimate = totalArcLength(roughCurve);
	const targetWidth = Math.max(50, Math.round(arcEstimate / resolution));

	const { curve, normals, arcLen } = buildUniformCurve(
		params.controlPoints,
		targetWidth,
	);
	if (curve.length < 2) return null;

	const width = curve.length;
	const height = Math.max(
		1,
		Math.round(Math.abs(vol.zMax - vol.zMin) / vol.vSpacing),
	);
	const hSpacing = arcLen / Math.max(1, width - 1);

	const halfSlab = slabWidth / 2;
	const SLAB_STEP_MM = 1.0;
	const numSlab = Math.max(1, Math.round(slabWidth / SLAB_STEP_MM));
	const isMIP = projection === "MIP";

	const pixelData = new Float32Array(width * height);

	for (let x = 0; x < width; x++) {
		const [cx, cy] = curve[x]!;
		const [nx, ny] = normals[x]!;

		for (let y = 0; y < height; y++) {
			const wz = vol.zMax - y * vol.vSpacing;

			if (numSlab <= 1) {
				const ci = (cx - vol.origin[0]) * vol.invSx;
				const cj = (cy - vol.origin[1]) * vol.invSy;
				const ck = (wz - vol.origin[2]) * vol.invSz;
				pixelData[y * width + x] = trilinear(
					vol.getVoxel,
					vol.dims,
					ci,
					cj,
					ck,
				);
			} else {
				let acc = isMIP ? -Infinity : 0;
				for (let s = 0; s < numSlab; s++) {
					const offset = -halfSlab + (s / (numSlab - 1)) * slabWidth;
					const wx = cx + nx * offset;
					const wy = cy + ny * offset;
					const ci = (wx - vol.origin[0]) * vol.invSx;
					const cj = (wy - vol.origin[1]) * vol.invSy;
					const ck = (wz - vol.origin[2]) * vol.invSz;
					const val = trilinear(vol.getVoxel, vol.dims, ci, cj, ck);
					if (isMIP) {
						if (val > acc) acc = val;
					} else {
						acc += val;
					}
				}
				if (!isMIP) acc /= numSlab;
				pixelData[y * width + x] = acc;
			}
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
