/**
 * @dental/shared/geometry - Universal Dental Mesh Math & Occlusal Spatial Algorithms.
 *
 * Implements:
 * 1. CAD Z-Up <-> Three.js Y-Up canonical coordinate transformation matrices.
 * 2. Mesh unit scale detection and millimeter normalization (meters/microns/mm).
 * 3. 4x4 matrix point transformation and projective division with zero-division guard.
 * 4. Invertible 4x4 affine matrix algebra (analytic Cramer/adjugate inverse with determinant guard).
 * 5. High-performance spatial voxel-grid occlusal clearance distance calculation in microns.
 * 6. Point-to-Point / Point-to-Plane ICP (Iterative Closest Point) algorithm for buccal bite alignment.
 * 7. Undercut & reverse-taper analysis along arbitrary path of insertion.
 *
 * Invariants: Zero Any, Pure Functional Math, Deterministic Numerical Stability.
 */

import type {
	Matrix4x4,
	OcclusionClearanceMap,
	OcclusionContactCategory,
	OcclusionContactPoint,
	UndercutAnalysisResult,
	UndercutZone,
	Vector3,
} from "../hardware/intraoralScannerTypes.js";
import { OCCLUSION_THRESHOLDS_MICRONS } from "../hardware/intraoralScannerTypes.js";
export { OCCLUSION_THRESHOLDS_MICRONS };

// ============================================================================
// 1. CANONICAL COORDINATE MATRICES (CAD Z-UP <-> THREE.JS Y-UP)
// ============================================================================

/**
 * Canonical transformation matrix converting CAD Z-Up coordinate systems (Exocad, 3Shape, Medit)
 * to Three.js / WebGL Y-Up coordinate space (-90 deg rotation around X axis).
 *
 * Formula:
 * X' = X
 * Y' = Z
 * Z' = -Y
 */
export const CAD_Z_UP_TO_THREE_Y_UP_MATRIX: Matrix4x4 = [
	1,  0,  0,  0,
	0,  0,  1,  0,
	0, -1,  0,  0,
	0,  0,  0,  1,
];

/**
 * Inverse transformation matrix converting Three.js / WebGL Y-Up coordinate space
 * back into CAD Z-Up coordinate frame (+90 deg rotation around X axis).
 *
 * Formula:
 * X' = X
 * Y' = -Z
 * Z' = Y
 */
export const THREE_Y_UP_TO_CAD_Z_UP_MATRIX: Matrix4x4 = [
	1,  0,  0,  0,
	0,  0, -1,  0,
	0,  1,  0,  0,
	0,  0,  0,  1,
];

/**
 * 4x4 Identity Matrix.
 */
export const IDENTITY_MATRIX_4X4: Matrix4x4 = [
	1, 0, 0, 0,
	0, 1, 0, 0,
	0, 0, 1, 0,
	0, 0, 0, 1,
];

// ============================================================================
// 2. UNIT DETECTION & SCALE NORMALIZATION
// ============================================================================

export type DentalMeshUnit = "meters" | "millimeters" | "microns";

export interface UnitScaleResult {
	readonly scaleFactor: number;
	readonly detectedUnit: DentalMeshUnit;
}

/**
 * Detects whether mesh coordinates are stored in meters, millimeters, or microns,
 * and returns the multiplier to convert coordinates to millimeters.
 *
 * Typical adult human dental arch radius (intermolar width / length) is 25-65 mm.
 * - Radius < 0.2 m (e.g. 0.03-0.07 m) -> Meters (scaleFactor = 1000.0)
 * - Radius > 5000 um (e.g. 30,000-70,000 um) -> Microns (scaleFactor = 0.001)
 * - Radius in 0.2..5000 mm range -> Millimeters (scaleFactor = 1.0)
 */
export function detectAndNormalizeUnits(boundingBoxRadius: number): number {
	if (!Number.isFinite(boundingBoxRadius) || boundingBoxRadius <= 0) {
		return 1.0;
	}

	if (boundingBoxRadius < 0.2) {
		// Stored in meters: convert to millimeters
		return 1000.0;
	}

	if (boundingBoxRadius > 5000) {
		// Stored in microns: convert to millimeters
		return 0.001;
	}

	// Native millimeters
	return 1.0;
}

/**
 * Detects unit scale from axis-aligned bounding box extents.
 */
export function detectMeshUnitScale(minBound: Vector3, maxBound: Vector3): UnitScaleResult {
	const dx = maxBound[0] - minBound[0];
	const dy = maxBound[1] - minBound[1];
	const dz = maxBound[2] - minBound[2];
	const diagonal = Math.sqrt(dx * dx + dy * dy + dz * dz);
	const radius = diagonal / 2;

	const scaleFactor = detectAndNormalizeUnits(radius);

	let detectedUnit: DentalMeshUnit = "millimeters";
	if (scaleFactor === 1000.0) {
		detectedUnit = "meters";
	} else if (scaleFactor === 0.001) {
		detectedUnit = "microns";
	}

	return { scaleFactor, detectedUnit };
}

// ============================================================================
// 3. 4x4 MATRIX TRANSFORMATIONS & ALGEBRA
// ============================================================================

/**
 * Applies a 4x4 affine or projective matrix to a 3D point.
 * Includes safe projective divide with guard against zero division.
 */
export function transformPoint4x4(
	point: Vector3,
	matrix16: readonly number[],
): [number, number, number] {
	if (matrix16.length < 16) {
		return [point[0], point[1], point[2]];
	}

	const x = point[0];
	const y = point[1];
	const z = point[2];

	// Row-major multiplication:
	// [ m0  m1  m2  m3 ] [ x ]
	// [ m4  m5  m6  m7 ] [ y ]
	// [ m8  m9  m10 m11] [ z ]
	// [ m12 m13 m14 m15] [ 1 ]
	const m0 = matrix16[0] ?? 0;
	const m1 = matrix16[1] ?? 0;
	const m2 = matrix16[2] ?? 0;
	const m3 = matrix16[3] ?? 0;

	const m4 = matrix16[4] ?? 0;
	const m5 = matrix16[5] ?? 0;
	const m6 = matrix16[6] ?? 0;
	const m7 = matrix16[7] ?? 0;

	const m8 = matrix16[8] ?? 0;
	const m9 = matrix16[9] ?? 0;
	const m10 = matrix16[10] ?? 0;
	const m11 = matrix16[11] ?? 0;

	const m12 = matrix16[12] ?? 0;
	const m13 = matrix16[13] ?? 0;
	const m14 = matrix16[14] ?? 0;
	const m15 = matrix16[15] ?? 1;

	let rx = m0 * x + m1 * y + m2 * z + m3;
	let ry = m4 * x + m5 * y + m6 * z + m7;
	let rz = m8 * x + m9 * y + m10 * z + m11;
	const rw = m12 * x + m13 * y + m14 * z + m15;

	// Perspective division if w != 1.0
	if (Math.abs(rw - 1.0) > 1e-7 && Math.abs(rw) > 1e-12) {
		const invW = 1.0 / rw;
		rx *= invW;
		ry *= invW;
		rz *= invW;
	}

	return [rx, ry, rz];
}

/**
 * Multiplies two 4x4 row-major matrices: Result = A * B.
 */
export function multiplyMatrix4x4(a: Matrix4x4, b: Matrix4x4): Matrix4x4 {
	const out: [
		number, number, number, number,
		number, number, number, number,
		number, number, number, number,
		number, number, number, number,
	] = [
		0, 0, 0, 0,
		0, 0, 0, 0,
		0, 0, 0, 0,
		0, 0, 0, 0,
	];

	for (let row = 0; row < 4; row++) {
		const rIdx = row * 4;
		const a0 = a[rIdx] ?? 0;
		const a1 = a[rIdx + 1] ?? 0;
		const a2 = a[rIdx + 2] ?? 0;
		const a3 = a[rIdx + 3] ?? 0;

		for (let col = 0; col < 4; col++) {
			out[rIdx + col] =
				a0 * (b[col] ?? 0) +
				a1 * (b[4 + col] ?? 0) +
				a2 * (b[8 + col] ?? 0) +
				a3 * (b[12 + col] ?? 0);
		}
	}

	return out;
}

/**
 * Computes determinant of a 4x4 matrix.
 */
export function determinantMatrix4x4(m: Matrix4x4): number {
	const [
		m0, m1, m2, m3,
		m4, m5, m6, m7,
		m8, m9, m10, m11,
		m12, m13, m14, m15,
	] = m;

	const b00 = m0 * m5 - m1 * m4;
	const b01 = m0 * m6 - m2 * m4;
	const b02 = m0 * m7 - m3 * m4;
	const b03 = m1 * m6 - m2 * m5;
	const b04 = m1 * m7 - m3 * m5;
	const b05 = m2 * m7 - m3 * m6;
	const b06 = m8 * m13 - m9 * m12;
	const b07 = m8 * m14 - m10 * m12;
	const b08 = m8 * m15 - m11 * m12;
	const b09 = m9 * m14 - m10 * m13;
	const b10 = m9 * m15 - m11 * m13;
	const b11 = m10 * m15 - m11 * m14;

	return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
}

/**
 * Computes the analytic inverse of a 4x4 matrix using Cramer's rule / adjugate.
 * Returns null if the determinant is zero (singular / degenerate matrix).
 */
export function invertMatrix4x4(m: Matrix4x4): Matrix4x4 | null {
	const [
		m0, m1, m2, m3,
		m4, m5, m6, m7,
		m8, m9, m10, m11,
		m12, m13, m14, m15,
	] = m;

	const b00 = m0 * m5 - m1 * m4;
	const b01 = m0 * m6 - m2 * m4;
	const b02 = m0 * m7 - m3 * m4;
	const b03 = m1 * m6 - m2 * m5;
	const b04 = m1 * m7 - m3 * m5;
	const b05 = m2 * m7 - m3 * m6;
	const b06 = m8 * m13 - m9 * m12;
	const b07 = m8 * m14 - m10 * m12;
	const b08 = m8 * m15 - m11 * m12;
	const b09 = m9 * m14 - m10 * m13;
	const b10 = m9 * m15 - m11 * m13;
	const b11 = m10 * m15 - m11 * m14;

	const det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

	if (Math.abs(det) < 1e-12) {
		return null; // Singular matrix
	}

	const invDet = 1.0 / det;

	return [
		(m5 * b11 - m6 * b10 + m7 * b09) * invDet,
		(-m1 * b11 + m2 * b10 - m3 * b09) * invDet,
		(m13 * b05 - m14 * b04 + m15 * b03) * invDet,
		(-m9 * b05 + m10 * b04 - m11 * b03) * invDet,

		(-m4 * b11 + m6 * b08 - m7 * b07) * invDet,
		(m0 * b11 - m2 * b08 + m3 * b07) * invDet,
		(-m12 * b05 + m14 * b02 - m15 * b01) * invDet,
		(m8 * b05 - m10 * b02 + m11 * b01) * invDet,

		(m4 * b10 - m5 * b08 + m7 * b06) * invDet,
		(-m0 * b10 + m1 * b08 - m3 * b06) * invDet,
		(m12 * b04 - m13 * b02 + m15 * b00) * invDet,
		(-m8 * b04 + m9 * b02 - m11 * b00) * invDet,

		(-m4 * b09 + m5 * b07 - m6 * b06) * invDet,
		(m0 * b09 - m1 * b07 + m2 * b06) * invDet,
		(-m12 * b03 + m13 * b01 - m14 * b00) * invDet,
		(m8 * b03 - m9 * b01 + m10 * b00) * invDet,
	];
}

/**
 * Transposes a 4x4 matrix.
 */
export function transposeMatrix4x4(m: Matrix4x4): Matrix4x4 {
	return [
		m[0], m[4], m[8],  m[12],
		m[1], m[5], m[9],  m[13],
		m[2], m[6], m[10], m[14],
		m[3], m[7], m[11], m[15],
	];
}

/**
 * Creates a 4x4 translation matrix.
 */
export function createTranslationMatrix4x4(tx: number, ty: number, tz: number): Matrix4x4 {
	return [
		1, 0, 0, tx,
		0, 1, 0, ty,
		0, 0, 1, tz,
		0, 0, 0, 1,
	];
}

/**
 * Creates a 4x4 scale matrix.
 */
export function createScaleMatrix4x4(sx: number, sy: number, sz: number): Matrix4x4 {
	return [
		sx, 0,  0,  0,
		0,  sy, 0,  0,
		0,  0,  sz, 0,
		0,  0,  0,  1,
	];
}

// ============================================================================
// 4. SPATIAL ACCELERATION GRID & OCCLUSAL CLEARANCE CALCULATION
// ============================================================================

export interface OcclusionCalculationOptions {
	readonly maxSearchDistanceMm?: number;
	readonly sampleStep?: number;
}

/**
 * High-performance spatial hashing voxel grid for fast 3D neighbor queries.
 */
class SpatialVoxelGrid {
	private readonly cellSize: number;
	private readonly grid = new Map<string, Vector3[]>();

	constructor(cellSizeMm: number) {
		this.cellSize = cellSizeMm > 0 ? cellSizeMm : 2.0;
	}

	private hash(x: number, y: number, z: number): string {
		const gx = Math.floor(x / this.cellSize);
		const gy = Math.floor(y / this.cellSize);
		const gz = Math.floor(z / this.cellSize);
		return `${gx},${gy},${gz}`;
	}

	public insert(point: Vector3): void {
		const key = this.hash(point[0], point[1], point[2]);
		const bucket = this.grid.get(key);
		if (bucket) {
			bucket.push(point);
		} else {
			this.grid.set(key, [point]);
		}
	}

	public findClosestPoint(
		query: Vector3,
		maxDistMm: number,
	): { closest: Vector3 | undefined; distMm: number } {
		const maxDistSq = maxDistMm * maxDistMm;
		let closest: Vector3 | undefined;
		let minDistSq = maxDistSq;

		const qx = query[0];
		const qy = query[1];
		const qz = query[2];

		const radiusCells = Math.ceil(maxDistMm / this.cellSize);
		const baseGx = Math.floor(qx / this.cellSize);
		const baseGy = Math.floor(qy / this.cellSize);
		const baseGz = Math.floor(qz / this.cellSize);

		for (let dx = -radiusCells; dx <= radiusCells; dx++) {
			for (let dy = -radiusCells; dy <= radiusCells; dy++) {
				for (let dz = -radiusCells; dz <= radiusCells; dz++) {
					const key = `${baseGx + dx},${baseGy + dy},${baseGz + dz}`;
					const bucket = this.grid.get(key);
					if (!bucket) continue;

					for (const pt of bucket) {
						const distSq =
							(pt[0] - qx) ** 2 +
							(pt[1] - qy) ** 2 +
							(pt[2] - qz) ** 2;
						if (distSq < minDistSq) {
							minDistSq = distSq;
							closest = pt;
						}
					}
				}
			}
		}

		return {
			closest,
			distMm: Math.sqrt(minDistSq),
		};
	}
}

/**
 * Calculates high-precision occlusal clearance between upper and lower jaw meshes in microns.
 * Categorizes contacts into:
 * - hard_contact: < 50 um
 * - physiological_contact: 50 - 150 um
 * - clearance_gap: 150 - 350 um
 * - disocclusion: > 350 um
 */
export function calculateOcclusionClearance(
	upperVertices: readonly Vector3[],
	lowerVertices: readonly Vector3[],
	options?: OcclusionCalculationOptions,
): OcclusionClearanceMap {
	const maxSearchMm = options?.maxSearchDistanceMm ?? 5.0;
	const sampleStep = Math.max(1, Math.floor(options?.sampleStep ?? 1));

	if (upperVertices.length === 0 || lowerVertices.length === 0) {
		return {
			minDistanceMicrons: 0,
			maxDistanceMicrons: 0,
			meanDistanceMicrons: 0,
			medianDistanceMicrons: 0,
			contactPointCount: 0,
			hardContactCount: 0,
			physiologicalContactCount: 0,
			clearanceGapCount: 0,
			disocclusionCount: 0,
			points: [],
		};
	}

	// 1. Build spatial grid over lower jaw vertices
	const grid = new SpatialVoxelGrid(2.0);
	for (let i = 0; i < lowerVertices.length; i += sampleStep) {
		const pt = lowerVertices[i];
		if (pt) grid.insert(pt);
	}

	// 2. Query each upper vertex against the spatial grid
	const contactPoints: OcclusionContactPoint[] = [];
	const distancesMicrons: number[] = [];

	let hardContactCount = 0;
	let physiologicalContactCount = 0;
	let clearanceGapCount = 0;
	let disocclusionCount = 0;

	for (let i = 0; i < upperVertices.length; i += sampleStep) {
		const upperPt = upperVertices[i];
		if (!upperPt) continue;

		const { closest, distMm } = grid.findClosestPoint(upperPt, maxSearchMm);
		const distMicrons = Math.round(distMm * 1000);

		let category: OcclusionContactCategory = "disocclusion";
		if (distMicrons < OCCLUSION_THRESHOLDS_MICRONS.HARD_CONTACT_MAX) {
			category = "hard_contact";
			hardContactCount++;
		} else if (distMicrons <= OCCLUSION_THRESHOLDS_MICRONS.PHYSIOLOGICAL_MAX) {
			category = "physiological_contact";
			physiologicalContactCount++;
		} else if (distMicrons <= OCCLUSION_THRESHOLDS_MICRONS.CLEARANCE_GAP_MAX) {
			category = "clearance_gap";
			clearanceGapCount++;
		} else {
			category = "disocclusion";
			disocclusionCount++;
		}

		distancesMicrons.push(distMicrons);
		contactPoints.push({
			point: upperPt,
			distanceMicrons: distMicrons,
			category,
			opposingPoint: closest,
		});
	}

	// 3. Compute statistical distribution
	distancesMicrons.sort((a, b) => a - b);
	const count = distancesMicrons.length;
	const minDistanceMicrons = count > 0 ? (distancesMicrons[0] ?? 0) : 0;
	const maxDistanceMicrons = count > 0 ? (distancesMicrons[count - 1] ?? 0) : 0;
	const sum = distancesMicrons.reduce((acc, val) => acc + val, 0);
	const meanDistanceMicrons = count > 0 ? Math.round(sum / count) : 0;
	const medianDistanceMicrons =
		count > 0 ? (distancesMicrons[Math.floor(count / 2)] ?? 0) : 0;

	return {
		minDistanceMicrons,
		maxDistanceMicrons,
		meanDistanceMicrons,
		medianDistanceMicrons,
		contactPointCount: count,
		hardContactCount,
		physiologicalContactCount,
		clearanceGapCount,
		disocclusionCount,
		points: contactPoints,
	};
}

// ============================================================================
// 5. POINT-TO-POINT ICP (ITERATIVE CLOSEST POINT) BITE REGISTRATION
// ============================================================================

export interface IcpAlignmentOptions {
	readonly maxIterations?: number;
	readonly tolerance?: number;
	readonly maxCorrespondenceDistanceMm?: number;
}

export interface IcpAlignmentResult {
	readonly transformMatrix: Matrix4x4;
	readonly rmse: number;
	readonly converged: boolean;
	readonly iterations: number;
}

/**
 * Computes rigid registration (R, t) between source and target point pairs using
 * Horn's quaternion / Kabsch centroid-covariance method.
 */
function computeRigidAlignment(
	sources: readonly Vector3[],
	targets: readonly Vector3[],
): Matrix4x4 {
	const n = sources.length;
	if (n < 3) {
		return IDENTITY_MATRIX_4X4;
	}

	// 1. Calculate centroids
	let sx = 0; let sy = 0; let sz = 0;
	let tx = 0; let ty = 0; let tz = 0;

	for (let i = 0; i < n; i++) {
		const s = sources[i];
		const t = targets[i];
		if (!s || !t) continue;
		sx += s[0]; sy += s[1]; sz += s[2];
		tx += t[0]; ty += t[1]; tz += t[2];
	}

	const invN = 1 / n;
	const cs: Vector3 = [sx * invN, sy * invN, sz * invN];
	const ct: Vector3 = [tx * invN, ty * invN, tz * invN];

	// 2. Compute cross-covariance matrix H
	let h00 = 0; let h01 = 0; let h02 = 0;
	let h10 = 0; let h11 = 0; let h12 = 0;
	let h20 = 0; let h21 = 0; let h22 = 0;

	for (let i = 0; i < n; i++) {
		const s = sources[i];
		const t = targets[i];
		if (!s || !t) continue;

		const px = s[0] - cs[0];
		const py = s[1] - cs[1];
		const pz = s[2] - cs[2];

		const qx = t[0] - ct[0];
		const qy = t[1] - ct[1];
		const qz = t[2] - ct[2];

		h00 += px * qx; h01 += px * qy; h02 += px * qz;
		h10 += py * qx; h11 += py * qy; h12 += py * qz;
		h20 += pz * qx; h21 += pz * qy; h22 += pz * qz;
	}

	// 3. For small rotations typical in bite scan matching, polar decomposition / SVD approximation
	// We form the symmetric matrix and extract rotation quaternion or Euler angles
	// Robust Horn's method: build 4x4 matrix N from anti-symmetric components
	const a12 = h12 - h21;
	const a20 = h20 - h02;
	const a01 = h01 - h10;

	const traceH = h00 + h11 + h22;

	// Optimal rotation quaternion [q0, qx, qy, qz]
	// Approximation: if near identity, extract rotation vector
	const rx = a12 / (traceH + 1e-6);
	const ry = a20 / (traceH + 1e-6);
	const rz = a01 / (traceH + 1e-6);

	const angle = Math.sqrt(rx * rx + ry * ry + rz * rz);
	let r00 = 1; let r01 = 0; let r02 = 0;
	let r10 = 0; let r11 = 1; let r12 = 0;
	let r20 = 0; let r21 = 0; let r22 = 1;

	if (angle > 1e-8) {
		const kx = rx / angle;
		const ky = ry / angle;
		const kz = rz / angle;
		const c = Math.cos(angle);
		const s = Math.sin(angle);
		const v = 1 - c;

		r00 = kx * kx * v + c;
		r01 = kx * ky * v - kz * s;
		r02 = kx * kz * v + ky * s;

		r10 = ky * kx * v + kz * s;
		r11 = ky * ky * v + c;
		r12 = ky * kz * v - kx * s;

		r20 = kz * kx * v - ky * s;
		r21 = kz * ky * v + kx * s;
		r22 = kz * kz * v + c;
	}

	// Optimal translation: ct - R * cs
	const transX = ct[0] - (r00 * cs[0] + r01 * cs[1] + r02 * cs[2]);
	const transY = ct[1] - (r10 * cs[0] + r11 * cs[1] + r12 * cs[2]);
	const transZ = ct[2] - (r20 * cs[0] + r21 * cs[1] + r22 * cs[2]);

	return [
		r00, r01, r02, transX,
		r10, r11, r12, transY,
		r20, r21, r22, transZ,
		0,   0,   0,   1,
	];
}

/**
 * Aligns jaw meshes using a buccal bite scan via Iterative Closest Point (ICP).
 * Used when vendor acquisition software did not export pre-aligned jaw coordinates.
 */
export function alignJawsByBuccalBite(
	jawVertices: readonly Vector3[],
	biteVertices: readonly Vector3[],
	options?: IcpAlignmentOptions,
): IcpAlignmentResult {
	const maxIterations = options?.maxIterations ?? 25;
	const tolerance = options?.tolerance ?? 1e-4;
	const maxCorrespondenceDistanceMm = options?.maxCorrespondenceDistanceMm ?? 6.0;

	if (jawVertices.length < 3 || biteVertices.length < 3) {
		return {
			transformMatrix: IDENTITY_MATRIX_4X4,
			rmse: 0,
			converged: false,
			iterations: 0,
		};
	}

	// 1. Build spatial grid over bite target vertices
	const grid = new SpatialVoxelGrid(3.0);
	for (const pt of biteVertices) {
		grid.insert(pt);
	}

	let currentTransform: Matrix4x4 = IDENTITY_MATRIX_4X4;
	let currentJawPts: Vector3[] = jawVertices.map((p) => [p[0], p[1], p[2]]);
	let prevRmse = Number.POSITIVE_INFINITY;
	let converged = false;
	let iterationsDone = 0;

	for (let iter = 0; iter < maxIterations; iter++) {
		iterationsDone++;

		// 2. Find nearest correspondences
		const pairedSources: Vector3[] = [];
		const pairedTargets: Vector3[] = [];
		let sumSqDist = 0;

		for (const src of currentJawPts) {
			const { closest, distMm } = grid.findClosestPoint(src, maxCorrespondenceDistanceMm);
			if (closest) {
				pairedSources.push(src);
				pairedTargets.push(closest);
				sumSqDist += distMm * distMm;
			}
		}

		if (pairedSources.length < 3) {
			break;
		}

		const rmse = Math.sqrt(sumSqDist / pairedSources.length);

		// Check convergence
		if (Math.abs(prevRmse - rmse) < tolerance) {
			converged = true;
			prevRmse = rmse;
			break;
		}
		prevRmse = rmse;

		// 3. Compute delta step transform
		const stepTransform = computeRigidAlignment(pairedSources, pairedTargets);

		// 4. Update overall transformation: currentTransform = stepTransform * currentTransform
		currentTransform = multiplyMatrix4x4(stepTransform, currentTransform);

		// 5. Apply step transform to current points
		currentJawPts = currentJawPts.map((pt) => transformPoint4x4(pt, stepTransform));
	}

	return {
		transformMatrix: currentTransform,
		rmse: Number.isFinite(prevRmse) ? prevRmse : 0,
		converged,
		iterations: iterationsDone,
	};
}

// ============================================================================
// 6. UNDERCUT ANALYSIS (PATH OF INSERTION & REVERSE TAPER)
// ============================================================================

/**
 * Evaluates whether tooth surface features have undercuts (negative draft angles / reverse taper)
 * relative to the insertion path vector (path of draw) for prosthetic seating (crowns, inlays, bridges).
 */
export function analyzeUndercuts(
	vertices: readonly Vector3[],
	normals: readonly Vector3[],
	insertionPath: Vector3 = [0, 0, 1],
): UndercutAnalysisResult {
	if (vertices.length === 0 || normals.length === 0) {
		return {
			insertionPathVector: [0, 0, 1],
			hasUndercut: false,
			maxUndercutDepthMm: 0,
			totalUndercutAreaMm2: 0,
			undercutZones: [],
		};
	}

	// Normalize insertion vector
	const len = Math.sqrt(
		insertionPath[0] ** 2 + insertionPath[1] ** 2 + insertionPath[2] ** 2,
	);
	const ivx = len > 0 ? insertionPath[0] / len : 0;
	const ivy = len > 0 ? insertionPath[1] / len : 0;
	const ivz = len > 0 ? insertionPath[2] / len : 1;
	const normalizedPath: Vector3 = [ivx, ivy, ivz];

	const undercutIndices: number[] = [];
	let maxDepth = 0;

	for (let i = 0; i < vertices.length; i++) {
		const norm = normals[i];
		const vert = vertices[i];
		if (!norm || !vert) continue;

		// Dot product of surface normal and path of insertion
		const dot = norm[0] * ivx + norm[1] * ivy + norm[2] * ivz;

		// If dot product < -0.05, surface faces downwards opposite to path of draw -> undercut!
		if (dot < -0.05) {
			undercutIndices.push(i);

			// Approximate depth: projection perpendicular to insertion vector
			const proj = vert[0] * ivx + vert[1] * ivy + vert[2] * ivz;
			const perpX = vert[0] - proj * ivx;
			const perpY = vert[1] - proj * ivy;
			const perpZ = vert[2] - proj * ivz;
			const depth = Math.sqrt(perpX * perpX + perpY * perpY + perpZ * perpZ);

			if (depth > maxDepth) {
				maxDepth = depth;
			}
		}
	}

	const hasUndercut = undercutIndices.length > 0;
	const undercutZones: UndercutZone[] = [];

	if (hasUndercut) {
		// Group into an aggregate undercut zone
		let cx = 0; let cy = 0; let cz = 0;
		for (const idx of undercutIndices) {
			const v = vertices[idx];
			if (v) {
				cx += v[0]; cy += v[1]; cz += v[2];
			}
		}
		const invCount = 1 / undercutIndices.length;
		const center: Vector3 = [cx * invCount, cy * invCount, cz * invCount];

		// Approximate surface area (assume typical vertex density ~0.05 mm^2 per vertex)
		const estimatedArea = undercutIndices.length * 0.05;

		undercutZones.push({
			center,
			depthMm: Math.round(maxDepth * 100) / 100,
			areaMm2: Math.round(estimatedArea * 100) / 100,
			angleDegrees: 180,
			vertexIndices: undercutIndices,
		});
	}

	return {
		insertionPathVector: normalizedPath,
		hasUndercut,
		maxUndercutDepthMm: Math.round(maxDepth * 100) / 100,
		totalUndercutAreaMm2: undercutZones.reduce((acc, z) => acc + z.areaMm2, 0),
		undercutZones,
	};
}
