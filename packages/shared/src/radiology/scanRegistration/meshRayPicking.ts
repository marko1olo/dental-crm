/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MÖLLER–TRUMBORE RAY-TRIANGLE MESH PICKING — (LAYER 2)
 * ═══════════════════════════════════════════════════════════════════════════
 * High-performance 3D ray-mesh intersection algorithms for landmark picking
 * on indexed meshes and flat triangle soups.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { MeshRayHit, Vec3 } from "./types.js";

/**
 * Möller–Trumbore ray-triangle intersection test.
 * Returns the ray parameter t at intersection (> 1e-6), or null if no hit.
 */
export function rayTriangleHit(
	orig: Vec3,
	dir: Vec3,
	v0: Vec3,
	v1: Vec3,
	v2: Vec3,
): number | null {
	const e1: Vec3 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
	const e2: Vec3 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];

	const px = dir[1] * e2[2] - dir[2] * e2[1];
	const py = dir[2] * e2[0] - dir[0] * e2[2];
	const pz = dir[0] * e2[1] - dir[1] * e2[0];
	const det = e1[0] * px + e1[1] * py + e1[2] * pz;

	if (Math.abs(det) < 1e-9) return null;
	const inv = 1 / det;

	const tv: Vec3 = [orig[0] - v0[0], orig[1] - v0[1], orig[2] - v0[2]];
	const u = (tv[0] * px + tv[1] * py + tv[2] * pz) * inv;
	if (u < 0 || u > 1) return null;

	const qx = tv[1] * e1[2] - tv[2] * e1[1];
	const qy = tv[2] * e1[0] - tv[0] * e1[2];
	const qz = tv[0] * e1[1] - tv[1] * e1[0];
	const v = (dir[0] * qx + dir[1] * qy + dir[2] * qz) * inv;
	if (v < 0 || u + v > 1) return null;

	const t = (e2[0] * qx + e2[1] * qy + e2[2] * qz) * inv;
	return t > 1e-6 ? t : null;
}

/**
 * Cast a ray against a polygon mesh (indexed or triangle soup) to pick landmarks.
 * Returns the nearest 3D hit point, distance, and triangle index, or null if no hit.
 */
export function pickMeshRay(
	orig: Vec3,
	dir: Vec3,
	positions: ArrayLike<number>,
	indices?: ArrayLike<number> | null,
): MeshRayHit | null {
	const dLen = Math.hypot(dir[0], dir[1], dir[2]);
	if (dLen < 1e-9) return null;
	const ndir: Vec3 = [dir[0] / dLen, dir[1] / dLen, dir[2] / dLen];

	let bestT = Infinity;
	let bestTriangle = -1;

	if (indices && indices.length >= 3) {
		const triCount = Math.floor(indices.length / 3);
		for (let t = 0; t < triCount; t++) {
			const i0 = indices[3 * t]!;
			const i1 = indices[3 * t + 1]!;
			const i2 = indices[3 * t + 2]!;

			const v0: Vec3 = [positions[3 * i0]!, positions[3 * i0 + 1]!, positions[3 * i0 + 2]!];
			const v1: Vec3 = [positions[3 * i1]!, positions[3 * i1 + 1]!, positions[3 * i1 + 2]!];
			const v2: Vec3 = [positions[3 * i2]!, positions[3 * i2 + 1]!, positions[3 * i2 + 2]!];

			const hitT = rayTriangleHit(orig, ndir, v0, v1, v2);
			if (hitT !== null && hitT < bestT) {
				bestT = hitT;
				bestTriangle = t;
			}
		}
	} else {
		const triCount = Math.floor(positions.length / 9);
		for (let t = 0; t < triCount; t++) {
			const o = t * 9;
			const v0: Vec3 = [positions[o]!, positions[o + 1]!, positions[o + 2]!];
			const v1: Vec3 = [positions[o + 3]!, positions[o + 4]!, positions[o + 5]!];
			const v2: Vec3 = [positions[o + 6]!, positions[o + 7]!, positions[o + 8]!];

			const hitT = rayTriangleHit(orig, ndir, v0, v1, v2);
			if (hitT !== null && hitT < bestT) {
				bestT = hitT;
				bestTriangle = t;
			}
		}
	}

	if (!Number.isFinite(bestT) || bestTriangle === -1) return null;

	const hitPoint: Vec3 = [
		orig[0] + ndir[0] * bestT,
		orig[1] + ndir[1] * bestT,
		orig[2] + ndir[2] * bestT,
	];

	return {
		point: hitPoint,
		distance: bestT,
		triangleIndex: bestTriangle,
	};
}

/**
 * Find nearest ray hit against a triangle soup [ax,ay,az, bx,by,bz, cx,cy,cz, ...].
 * Returns the 3D world hit point, or null if no triangle was hit.
 */
export function pickTriangleSoup(
	orig: Vec3,
	dir: Vec3,
	tris: Float32Array | number[],
): Vec3 | null {
	let bestT = Infinity;
	for (let i = 0; i + 8 < tris.length; i += 9) {
		const a: Vec3 = [tris[i] ?? 0, tris[i + 1] ?? 0, tris[i + 2] ?? 0];
		const b: Vec3 = [tris[i + 3] ?? 0, tris[i + 4] ?? 0, tris[i + 5] ?? 0];
		const c: Vec3 = [tris[i + 6] ?? 0, tris[i + 7] ?? 0, tris[i + 8] ?? 0];
		const t = rayTriangleHit(orig, dir, a, b, c);
		if (t !== null && t < bestT) {
			bestT = t;
		}
	}
	if (!Number.isFinite(bestT)) return null;
	return [
		orig[0] + dir[0] * bestT,
		orig[1] + dir[1] * bestT,
		orig[2] + dir[2] * bestT,
	];
}
