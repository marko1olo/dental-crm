/**
 * DENTE CRM — CBCT Anisotropic Caliper & Coordinate Verification Engine
 * Standards: 3D Slicer (vtkMRMLVolumeNode / vtkMRMLMarkupsLineNode), ITK-SNAP (GenericImageData)
 * DICOM Part 3 PS 3.3 (C.7.6.2 Image Plane Module).
 *
 * Guarantees mathematical precision:
 * 1. Anisotropic 2D/3D Euclidean caliper distance taking independent (dx, dy, dz) spacing into account.
 * 2. Point-to-segment orthogonal projection in physical millimeter space (not distorted canvas pixels).
 * 3. 3D Slicer IJK-to-RAS and ITK-SNAP IJK-to-LPS 4x4 affine matrix construction, inversion, and determinant checks.
 */

import type { Point2D, Point3D } from "./cbctMprMath";

export interface Spacing3D {
	readonly x: number;
	readonly y: number;
	readonly z: number;
}

// ─── 1. ANISOTROPIC 2D & 3D EUCLIDEAN DISTANCE MATH ──────────────────────────

/**
 * Calculates physical Euclidean distance in millimeters between two points on a 2D slice
 * with anisotropic pixel spacing (spacingX, spacingY).
 *
 * Formula: dist = sqrt(((x2 - x1) * spacingX)^2 + ((y2 - y1) * spacingY)^2)
 */
export function calculateAnisotropicDistance2DMm(
	p1: Point2D,
	p2: Point2D,
	spacingX: number,
	spacingY: number,
): number {
	const sx = Number.isFinite(spacingX) && spacingX > 0 ? spacingX : 1.0;
	const sy = Number.isFinite(spacingY) && spacingY > 0 ? spacingY : 1.0;

	const dxMm = (p2.x - p1.x) * sx;
	const dyMm = (p2.y - p1.y) * sy;

	const distMm = Math.hypot(dxMm, dyMm);
	return Number.isFinite(distMm) ? Number(distMm.toFixed(3)) : 0;
}

/**
 * Calculates 3D physical Euclidean distance between two spatial points in millimeters.
 * Standards: 3D Slicer vtkMRMLMarkupsLineNode::GetLineLengthWorld.
 */
export function calculateWorldDistance3DMm(p1: Point3D, p2: Point3D): number {
	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;
	const dz = p2.z - p1.z;
	const dist = Math.hypot(dx, dy, dz);
	return Number.isFinite(dist) ? Number(dist.toFixed(3)) : 0;
}

/**
 * Projects a point onto a line segment in physical millimeter space to find
 * the closest point and perpendicular safety clearance distance.
 * Crucial for nerve safety margin and implant proximity checks under anisotropic spacing.
 */
export function calculateAnisotropicPointToSegmentDistance2DMm(
	point: Point2D,
	segStart: Point2D,
	segEnd: Point2D,
	spacingX: number,
	spacingY: number,
): {
	distanceMm: number;
	projectionParam: number; // 0..1 clamped along segment
	closestPointMm: Point2D;
} {
	const sx = Number.isFinite(spacingX) && spacingX > 0 ? spacingX : 1.0;
	const sy = Number.isFinite(spacingY) && spacingY > 0 ? spacingY : 1.0;

	// Transform all points into physical millimeter coordinates first
	const pMm = { x: point.x * sx, y: point.y * sy };
	const aMm = { x: segStart.x * sx, y: segStart.y * sy };
	const bMm = { x: segEnd.x * sx, y: segEnd.y * sy };

	const abX = bMm.x - aMm.x;
	const abY = bMm.y - aMm.y;
	const segLengthSq = abX * abX + abY * abY;

	if (segLengthSq < 1e-9) {
		const dist = Math.hypot(pMm.x - aMm.x, pMm.y - aMm.y);
		return {
			distanceMm: Number(dist.toFixed(3)),
			projectionParam: 0,
			closestPointMm: { x: Number(aMm.x.toFixed(3)), y: Number(aMm.y.toFixed(3)) },
		};
	}

	const apX = pMm.x - aMm.x;
	const apY = pMm.y - aMm.y;
	const dot = apX * abX + apY * abY;
	const t = Math.max(0, Math.min(1, dot / segLengthSq));

	const closestX = aMm.x + t * abX;
	const closestY = aMm.y + t * abY;
	const dist = Math.hypot(pMm.x - closestX, pMm.y - closestY);

	return {
		distanceMm: Number(dist.toFixed(3)),
		projectionParam: Number(t.toFixed(4)),
		closestPointMm: {
			x: Number(closestX.toFixed(3)),
			y: Number(closestY.toFixed(3)),
		},
	};
}

// ─── 2. 3D SLICER / ITK-SNAP AFFINE MATRIX COORDINATE ENGINE ─────────────────

/**
 * 4x4 Homogeneous Affine Transformation Matrix.
 * row-major: [row0, row1, row2, row3].
 */
export type Matrix4x4 = [
	[number, number, number, number],
	[number, number, number, number],
	[number, number, number, number],
	[number, number, number, number],
];

/**
 * Constructs the standard 3D Slicer IJK-to-RAS 4x4 affine matrix:
 * [ R_x * sx   A_x * sy   S_x * sz   Origin_x ]
 * [ R_y * sx   A_y * sy   S_y * sz   Origin_y ]
 * [ R_z * sx   A_z * sy   S_z * sz   Origin_z ]
 * [    0          0          0           1    ]
 *
 * Direction cosines correspond to DICOM Image Orientation (Patient) (0020,0037).
 */
export function buildIjkToRasAffineMatrix(
	spacing: Spacing3D,
	origin: Point3D,
	directions: {
		readonly dirX: Point3D; // Row direction cosine vector
		readonly dirY: Point3D; // Column direction cosine vector
		readonly dirZ: Point3D; // Slice normal direction cosine vector
	},
): Matrix4x4 {
	const sx = spacing.x || 1.0;
	const sy = spacing.y || 1.0;
	const sz = spacing.z || 1.0;

	return [
		[directions.dirX.x * sx, directions.dirY.x * sy, directions.dirZ.x * sz, origin.x],
		[directions.dirX.y * sx, directions.dirY.y * sy, directions.dirZ.y * sz, origin.y],
		[directions.dirX.z * sx, directions.dirY.z * sy, directions.dirZ.z * sz, origin.z],
		[0, 0, 0, 1],
	];
}

/**
 * Computes determinant of a 3x3 rotation/direction sub-matrix.
 * A positive determinant (+1.0) verifies a right-handed coordinate system.
 * A negative determinant indicates axis inversion / left-handed space.
 */
export function computeDirectionMatrixDeterminant(mat: Matrix4x4): number {
	const m00 = mat[0][0];
	const m01 = mat[0][1];
	const m02 = mat[0][2];
	const m10 = mat[1][0];
	const m11 = mat[1][1];
	const m12 = mat[1][2];
	const m20 = mat[2][0];
	const m21 = mat[2][1];
	const m22 = mat[2][2];

	return (
		m00 * (m11 * m22 - m12 * m21) -
		m01 * (m10 * m22 - m12 * m20) +
		m02 * (m10 * m21 - m11 * m20)
	);
}

/**
 * Transforms integer or continuous IJK voxel coordinates into physical World (RAS/LPS) mm.
 */
export function transformIjkToWorldMm(ijk: Point3D, ijkToWorld: Matrix4x4): Point3D {
	const x = ijkToWorld[0][0] * ijk.x + ijkToWorld[0][1] * ijk.y + ijkToWorld[0][2] * ijk.z + ijkToWorld[0][3];
	const y = ijkToWorld[1][0] * ijk.x + ijkToWorld[1][1] * ijk.y + ijkToWorld[1][2] * ijk.z + ijkToWorld[1][3];
	const z = ijkToWorld[2][0] * ijk.x + ijkToWorld[2][1] * ijk.y + ijkToWorld[2][2] * ijk.z + ijkToWorld[2][3];

	return {
		x: Number(x.toFixed(3)),
		y: Number(y.toFixed(3)),
		z: Number(z.toFixed(3)),
	};
}

/**
 * Inverts an affine 4x4 transformation matrix (used to compute World-to-IJK from IJK-to-World).
 */
export function invertMatrix4x4(m: Matrix4x4): Matrix4x4 | null {
	const m00 = m[0][0], m01 = m[0][1], m02 = m[0][2], m03 = m[0][3];
	const m10 = m[1][0], m11 = m[1][1], m12 = m[1][2], m13 = m[1][3];
	const m20 = m[2][0], m21 = m[2][1], m22 = m[2][2], m23 = m[2][3];

	// Determinant of 3x3 rotational submatrix
	const det =
		m00 * (m11 * m22 - m12 * m21) -
		m01 * (m10 * m22 - m12 * m20) +
		m02 * (m10 * m21 - m11 * m20);

	if (Math.abs(det) < 1e-12) return null;

	const invDet = 1.0 / det;

	// Adjugate 3x3
	const a00 = (m11 * m22 - m12 * m21) * invDet;
	const a01 = (m02 * m21 - m01 * m22) * invDet;
	const a02 = (m01 * m12 - m02 * m11) * invDet;

	const a10 = (m12 * m20 - m10 * m22) * invDet;
	const a11 = (m00 * m22 - m02 * m20) * invDet;
	const a12 = (m02 * m10 - m00 * m12) * invDet;

	const a20 = (m10 * m21 - m11 * m20) * invDet;
	const a21 = (m01 * m20 - m00 * m21) * invDet;
	const a22 = (m00 * m11 - m01 * m10) * invDet;

	// Inverted translation: -R^T * T
	const tx = -(a00 * m03 + a01 * m13 + a02 * m23);
	const ty = -(a10 * m03 + a11 * m13 + a12 * m23);
	const tz = -(a20 * m03 + a21 * m13 + a22 * m23);

	return [
		[a00, a01, a02, tx],
		[a10, a11, a12, ty],
		[a20, a21, a22, tz],
		[0, 0, 0, 1],
	];
}

/**
 * Transforms physical World (RAS/LPS) mm into continuous voxel coordinates (IJK).
 */
export function transformWorldMmToIjkContinuous(
	worldMm: Point3D,
	worldToIjk: Matrix4x4,
): Point3D {
	const i = worldToIjk[0][0] * worldMm.x + worldToIjk[0][1] * worldMm.y + worldToIjk[0][2] * worldMm.z + worldToIjk[0][3];
	const j = worldToIjk[1][0] * worldMm.x + worldToIjk[1][1] * worldMm.y + worldToIjk[1][2] * worldMm.z + worldToIjk[1][3];
	const k = worldToIjk[2][0] * worldMm.x + worldToIjk[2][1] * worldMm.y + worldToIjk[2][2] * worldMm.z + worldToIjk[2][3];

	return {
		x: Number(i.toFixed(4)),
		y: Number(j.toFixed(4)),
		z: Number(k.toFixed(4)),
	};
}
