/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL RADIOLOGY & CBCT: TOOTH SETUP & PROSTHETICALLY-DRIVEN IMPLANT PLANNING
 * ═══════════════════════════════════════════════════════════════════════════
 * Pure mathematical algorithms for prosthetically-driven ("backward") planning.
 *
 * A tooth-setup / wax-up mesh (a planned crown) defines where the tooth should
 * be; its principal long axis represents the ideal screw axis.
 *
 * This engine provides:
 *   1. principalAxis       - PCA long axis, centroid, and extent of a 3D point set
 *   2. anglesFromWorldAxis - inverse of implantAxis: maps world 3D axis to
 *                            buccolingual (BL) and mesiodistal (MD) angles
 *   3. orientAxisByBone    - samples HU density beyond crown limits to orient the
 *                            screw axis apically into denser jaw bone
 *   4. suggestImplantFromMesh - combines PCA, bone orientation, and dental arch
 *                            geometry to propose platform placement and angles
 *
 * Adapted from DenCT reference core/toothSetup.ts.
 * Pure TypeScript, zero DOM/Cornerstone dependencies, 100% unit-testable.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { jacobiEigenSymmetric } from "./cbctScanMeshEngine.js";
import { nearestArchFrame, type ArchFrame, type Vec3 } from "./cbctSafetyEngine.js";
import { trilinear, type Point2, type VolumeSamplingData } from "./cprMath.js";

export interface PrincipalAxis {
	/** Mean of the input points [cx, cy, cz]. */
	centroid: Vec3;
	/** Unit eigenvector of the largest spread (the mesh long axis; sign arbitrary). */
	axis: Vec3;
	/** Extent (max - min projection) along that axis, in mm. */
	extent: number;
}

/**
 * PCA long axis of a flat [x0, y0, z0, x1, y1, z1, ...] point set (>= 3 points).
 * Returns null if fewer than 3 points are supplied.
 */
export function principalAxis(positions: ArrayLike<number>): PrincipalAxis | null {
	const n = Math.floor(positions.length / 3);
	if (n < 3) return null;

	let cx = 0;
	let cy = 0;
	let cz = 0;
	for (let i = 0; i < n; i++) {
		cx += positions[3 * i]!;
		cy += positions[3 * i + 1]!;
		cz += positions[3 * i + 2]!;
	}
	cx /= n;
	cy /= n;
	cz /= n;

	// Symmetric 3x3 covariance matrix
	let xx = 0;
	let yy = 0;
	let zz = 0;
	let xy = 0;
	let xz = 0;
	let yz = 0;
	for (let i = 0; i < n; i++) {
		const dx = positions[3 * i]! - cx;
		const dy = positions[3 * i + 1]! - cy;
		const dz = positions[3 * i + 2]! - cz;
		xx += dx * dx;
		yy += dy * dy;
		zz += dz * dz;
		xy += dx * dy;
		xz += dx * dz;
		yz += dy * dz;
	}
	const cov: number[][] = [
		[xx / n, xy / n, xz / n],
		[xy / n, yy / n, yz / n],
		[xz / n, yz / n, zz / n],
	];

	const { values, vectors } = jacobiEigenSymmetric(cov, 3);
	let best = 0;
	for (let i = 1; i < 3; i++) {
		if ((values[i] ?? -Infinity) > (values[best] ?? -Infinity)) {
			best = i;
		}
	}

	let ax = vectors[0]?.[best] ?? 0;
	let ay = vectors[1]?.[best] ?? 0;
	let az = vectors[2]?.[best] ?? 0;
	const len = Math.hypot(ax, ay, az) || 1;
	ax /= len;
	ay /= len;
	az /= len;

	// Extent along the axis (max - min projection)
	let min = Infinity;
	let max = -Infinity;
	for (let i = 0; i < n; i++) {
		const p =
			(positions[3 * i]! - cx) * ax +
			(positions[3 * i + 1]! - cy) * ay +
			(positions[3 * i + 2]! - cz) * az;
		if (p < min) min = p;
		if (p > max) max = p;
	}

	return {
		centroid: [cx, cy, cz],
		axis: [ax, ay, az],
		extent: max - min,
	};
}

/**
 * Inverse of implantAxis: given an arch frame and a unit world apex axis,
 * recovers the implant's buccolingual (BL) and mesiodistal (MD) angles in degrees.
 * Round-trips cleanly with implantAxis.
 */
export function anglesFromWorldAxis(
	frame: ArchFrame,
	axis: Vec3,
): { angleBLDeg: number; angleMDDeg: number } {
	const len = Math.hypot(axis[0], axis[1], axis[2]);
	const ax = len > 0 ? axis[0] / len : axis[0];
	const ay = len > 0 ? axis[1] / len : axis[1];
	const az = len > 0 ? axis[2] / len : axis[2];

	const n = ax * frame.normal[0] + ay * frame.normal[1]; // sin(BL)
	const t = ax * frame.tangent[0] + ay * frame.tangent[1]; // cos(BL) * sin(MD)
	const z = az; // -cos(BL) * cos(MD)

	let C = Math.sqrt(Math.max(0, 1 - n * n)); // |cos(BL)|
	if (z > 0) C = -C; // apex up -> cos(BL) < 0

	const bl = Math.atan2(n, C);
	const sinMD = C !== 0 ? t / C : 0;
	const cosMD = C !== 0 ? -z / C : 1;
	const md = Math.atan2(sinMD, cosMD);

	return {
		angleBLDeg: (bl * 180) / Math.PI,
		angleMDDeg: (md * 180) / Math.PI,
	};
}

export interface CrownSuggestion {
	position: Vec3;
	angleBLDeg: number;
	angleMDDeg: number;
}

/**
 * Pick the apical direction (+-axis) as the one with denser bone (higher HU)
 * just beyond the crown boundaries. Samples volume HU at offsets from the crown.
 * Auto-detects upper vs lower jaw based on bone density distribution.
 */
export function orientAxisByBone(
	centroid: Vec3,
	axis: Vec3,
	extent: number,
	huAt: (p: Vec3) => number,
): Vec3 {
	let sumPos = 0;
	let sumNeg = 0;
	const base = extent / 2;
	for (let d = 2; d <= 8; d += 2) {
		const r = base + d;
		sumPos += huAt([
			centroid[0] + axis[0] * r,
			centroid[1] + axis[1] * r,
			centroid[2] + axis[2] * r,
		]);
		sumNeg += huAt([
			centroid[0] - axis[0] * r,
			centroid[1] - axis[1] * r,
			centroid[2] - axis[2] * r,
		]);
	}
	return sumPos >= sumNeg ? axis : [-axis[0], -axis[1], -axis[2]];
}

/**
 * Suggest an implant placement from a tooth-setup mesh:
 * - Its PCA long axis serves as the screw axis.
 * - The platform is placed at the apical end of the crown: centroid + axis * (extent / 2).
 * - If vol is given, apical direction is detected from bone density.
 *   Otherwise defaults to apex down (-Z, mandible) or apex up (+Z, maxilla if apexUp: true).
 * - Maps apex axis to clinical arch angles (BL and MD) via nearestArchFrame.
 */
export function suggestImplantFromMesh(
	controlPoints: Point2[],
	positions: ArrayLike<number>,
	opts: { apexUp?: boolean; vol?: VolumeSamplingData } = {},
): CrownSuggestion | null {
	const pa = principalAxis(positions);
	if (!pa) return null;

	let axis: Vec3 = pa.axis;
	if (opts.vol) {
		const v = opts.vol;
		const huAt = (p: Vec3) =>
			trilinear(
				v.getVoxel,
				v.dims,
				(p[0] - v.origin[0]) * v.invSx,
				(p[1] - v.origin[1]) * v.invSy,
				(p[2] - v.origin[2]) * v.invSz,
			);
		axis = orientAxisByBone(pa.centroid, axis, pa.extent, huAt);
	} else {
		// No volume -> apex down (-Z) by default, up (+Z) for the maxilla.
		const wantDown = !opts.apexUp;
		if ((wantDown && axis[2] > 0) || (!wantDown && axis[2] < 0)) {
			axis = [-axis[0], -axis[1], -axis[2]];
		}
	}

	const [ax, ay, az] = axis;

	// Platform at the apical end of the crown (centroid + half the long extent)
	const half = pa.extent / 2;
	const position: Vec3 = [
		pa.centroid[0] + ax * half,
		pa.centroid[1] + ay * half,
		pa.centroid[2] + az * half,
	];

	const frame = nearestArchFrame(controlPoints, [position[0], position[1]]);
	if (!frame) return null;

	const { angleBLDeg, angleMDDeg } = anglesFromWorldAxis(frame, axis);
	return { position, angleBLDeg, angleMDDeg };
}
