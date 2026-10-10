/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PROSTHETIC TOOTH SETUP & BACKWARD PLANNING — (LAYER 3)
 * ═══════════════════════════════════════════════════════════════════════════
 * Principal Component Analysis (PCA) on 3D virtual wax-up crown meshes to
 * determine long axes, centroids, longitudinal extents, arch-frame tilt
 * angles (BL/MD), and suggested implant platform positioning.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type {
	ArchFrame,
	CrownImplantSuggestion,
	Point2,
	PrincipalAxis,
	Vec3,
} from "./types.js";
import { jacobiEigenSymmetric } from "./eigenAndKabsch.js";
import { nearestArchFrame } from "../implantGeometryEngine.js";

/**
 * Computes the principal long axis, centroid, and longitudinal extent of a 3D point set
 * using a 3×3 covariance matrix and cyclic Jacobi eigensolver.
 * Returns null if fewer than 3 vertices are provided.
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

	// Symmetric 3×3 covariance matrix
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

	// Measure longitudinal extent along the dominant axis
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
 * Inverse of implantAxis: maps a 3D unit world vector to buccolingual (BL)
 * and mesiodistal (MD) angles relative to the local arch frame.
 * Perfectly round-trips with implantAxis.
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
	if (z > 0) C = -C; // apex up (maxilla) -> cos(BL) < 0

	const bl = Math.atan2(n, C);
	const sinMD = C !== 0 ? t / C : 0;
	const cosMD = C !== 0 ? -z / C : 1;
	const md = Math.atan2(sinMD, cosMD);

	return {
		angleBLDeg: (bl * 180) / Math.PI,
		angleMDDeg: (md * 180) / Math.PI,
	};
}

/**
 * Derives suggested implant platform position and insertion angles from a planned
 * prosthetic tooth crown / wax-up mesh:
 * - Computes PCA long axis as the ideal screw channel
 * - Orients the apex into the jaw bone (default apex down -Z for mandible, +Z for maxilla)
 * - Places platform at the apical boundary of the crown
 * - Calculates BL and MD tilts against the nearest dental arch frame
 */
export function suggestImplantFromCrown(
	controlPoints: Point2[],
	positions: ArrayLike<number>,
	opts: { apexUp?: boolean } = {},
): CrownImplantSuggestion | null {
	const pa = principalAxis(positions);
	if (!pa) return null;

	let axis: Vec3 = [pa.axis[0], pa.axis[1], pa.axis[2]];
	const wantDown = !opts.apexUp;
	if ((wantDown && axis[2] > 0) || (!wantDown && axis[2] < 0)) {
		axis = [-axis[0], -axis[1], -axis[2]];
	}

	const [ax, ay, az] = axis;
	const half = pa.extent / 2;
	const position: Vec3 = [
		pa.centroid[0] + ax * half,
		pa.centroid[1] + ay * half,
		pa.centroid[2] + az * half,
	];

	const frame = nearestArchFrame(controlPoints, [position[0], position[1]]);
	if (!frame) return null;

	const { angleBLDeg, angleMDDeg } = anglesFromWorldAxis(frame, axis);
	return {
		position,
		angleBLDeg,
		angleMDDeg,
		axis,
		centroid: pa.centroid,
		extentMm: pa.extent,
	};
}
