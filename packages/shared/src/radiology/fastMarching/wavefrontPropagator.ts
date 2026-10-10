/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL CBCT RADIOLOGY: FAST MARCHING 3D WAVEFRONT PROPAGATOR
 * ═══════════════════════════════════════════════════════════════════════════
 * 26-connected anisotropic 3D Eikonal equation PDE solver:
 *   ||grad T(x)|| = 1 / V(x)
 * Upwind finite-difference scheme with sub-voxel physical millimetric metric.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { VolumeDimensions, VolumeSpacingMm } from "../cbctCropBox.js";
import { VOXEL_STATE_FAR, VOXEL_STATE_TRIAL, VOXEL_STATE_ACCEPTED } from "./types.js";
import { MinHeap } from "./priorityQueue.js";

/**
 * Solves the anisotropic 3D Eikonal update equation at voxel (x, y, z):
 * sum_{d in {x,y,z}} max(0, (T - T_d) / h_d)^2 = 1 / V^2
 */
export function solveEikonalUpdate3D(
	T_x: number,
	T_y: number,
	T_z: number,
	hx: number,
	hy: number,
	hz: number,
	V: number,
): number {
	const invV2 = 1.0 / (V * V);

	// Collect valid neighbor arrival times and corresponding grid spacings
	const entries: { T: number; h: number }[] = [];
	if (Number.isFinite(T_x)) entries.push({ T: T_x, h: hx });
	if (Number.isFinite(T_y)) entries.push({ T: T_y, h: hy });
	if (Number.isFinite(T_z)) entries.push({ T: T_z, h: hz });

	if (entries.length === 0) {
		return Infinity;
	}

	// Sort ascending by arrival time
	entries.sort((a, b) => a.T - b.T);

	// Try 1-axis solution
	const e0 = entries[0]!;
	const T1 = e0.T + e0.h / V;
	if (entries.length === 1 || (entries[1] && T1 <= entries[1].T)) {
		return T1;
	}

	// Try 2-axis solution
	const e1 = entries[1]!;
	const invH0Sq = 1.0 / (e0.h * e0.h);
	const invH1Sq = 1.0 / (e1.h * e1.h);
	const a2 = invH0Sq + invH1Sq;
	const b2 = -2.0 * (e0.T * invH0Sq + e1.T * invH1Sq);
	const c2 = e0.T * e0.T * invH0Sq + e1.T * e1.T * invH1Sq - invV2;

	const delta2 = b2 * b2 - 4.0 * a2 * c2;
	if (delta2 >= 0) {
		const T2 = (-b2 + Math.sqrt(delta2)) / (2.0 * a2);
		if (T2 > e1.T && (entries.length === 2 || (entries[2] && T2 <= entries[2].T))) {
			return T2;
		}
	}

	// Try 3-axis solution
	if (entries.length === 3) {
		const e2 = entries[2]!;
		const invH2Sq = 1.0 / (e2.h * e2.h);
		const a3 = invH0Sq + invH1Sq + invH2Sq;
		const b3 = -2.0 * (e0.T * invH0Sq + e1.T * invH1Sq + e2.T * invH2Sq);
		const c3 = e0.T * e0.T * invH0Sq + e1.T * e1.T * invH1Sq + e2.T * e2.T * invH2Sq - invV2;

		const delta3 = b3 * b3 - 4.0 * a3 * c3;
		if (delta3 >= 0) {
			const T3 = (-b3 + Math.sqrt(delta3)) / (2.0 * a3);
			if (T3 > e2.T) {
				return T3;
			}
		}
	}

	// Fallback to lowest valid candidate
	return T1;
}

/**
 * Solves the Fast Marching arrival time field T(x) starting from seed voxels (orifices).
 */
export function runFastMarching(
	speed: Float32Array,
	dimensions: VolumeDimensions,
	spacing: VolumeSpacingMm,
	seedVoxelIndices: readonly number[],
): Float32Array {
	const totalVoxels = dimensions.width * dimensions.height * dimensions.depth;
	const timeField = new Float32Array(totalVoxels);
	timeField.fill(Infinity);

	const state = new Uint8Array(totalVoxels); // 0 = FAR, 1 = TRIAL, 2 = ACCEPTED
	const heap = new MinHeap();

	// Initialize seeds
	for (const seedIdx of seedVoxelIndices) {
		if (seedIdx >= 0 && seedIdx < totalVoxels) {
			timeField[seedIdx] = 0.0;
			state[seedIdx] = VOXEL_STATE_ACCEPTED;
		}
	}

	const strideZ = dimensions.width * dimensions.height;
	const strideY = dimensions.width;
	const hx = spacing.x;
	const hy = spacing.y;
	const hz = spacing.z;

	// Populate initial narrow band (trial set) from 26-neighborhood of seeds
	for (const seedIdx of seedVoxelIndices) {
		const sz = Math.floor(seedIdx / strideZ);
		const rem = seedIdx % strideZ;
		const sy = Math.floor(rem / strideY);
		const sx = rem % strideY;

		for (let dz = -1; dz <= 1; dz++) {
			const nz = sz + dz;
			if (nz < 0 || nz >= dimensions.depth) continue;

			for (let dy = -1; dy <= 1; dy++) {
				const ny = sy + dy;
				if (ny < 0 || ny >= dimensions.height) continue;

				for (let dx = -1; dx <= 1; dx++) {
					if (dx === 0 && dy === 0 && dz === 0) continue;
					const nx = sx + dx;
					if (nx < 0 || nx >= dimensions.width) continue;

					const nIdx = nz * strideZ + ny * strideY + nx;
					if (state[nIdx] === VOXEL_STATE_FAR) {
						// Compute initial arrival time
						const V = speed[nIdx] ?? 0.001;
						const distMm = Math.hypot(dx * hx, dy * hy, dz * hz);
						const tentativeT = distMm / V;

						timeField[nIdx] = tentativeT;
						state[nIdx] = VOXEL_STATE_TRIAL;
						heap.push(nIdx, tentativeT);
					}
				}
			}
		}
	}

	// Main Fast Marching Loop
	while (!heap.isEmpty()) {
		const top = heap.pop();
		if (!top) break;

		const uIdx = top.index;
		// If already accepted with lower time, skip
		if (state[uIdx] === VOXEL_STATE_ACCEPTED) continue;

		state[uIdx] = VOXEL_STATE_ACCEPTED;

		const uz = Math.floor(uIdx / strideZ);
		const urem = uIdx % strideZ;
		const uy = Math.floor(urem / strideY);
		const ux = urem % strideY;

		// 26-connected neighbor traversal
		for (let dz = -1; dz <= 1; dz++) {
			const nz = uz + dz;
			if (nz < 0 || nz >= dimensions.depth) continue;

			for (let dy = -1; dy <= 1; dy++) {
				const ny = uy + dy;
				if (ny < 0 || ny >= dimensions.height) continue;

				for (let dx = -1; dx <= 1; dx++) {
					if (dx === 0 && dy === 0 && dz === 0) continue;
					const nx = ux + dx;
					if (nx < 0 || nx >= dimensions.width) continue;

					const vIdx = nz * strideZ + ny * strideY + nx;
					if (state[vIdx] === VOXEL_STATE_ACCEPTED) continue;

					const V = speed[vIdx] ?? 0.001;

					// Collect minimum accepted neighbor arrival times along 3 axes
					let Tx = Infinity;
					if (nx > 0 && state[vIdx - 1] === VOXEL_STATE_ACCEPTED) {
						Tx = Math.min(Tx, timeField[vIdx - 1] ?? Infinity);
					}
					if (nx < dimensions.width - 1 && state[vIdx + 1] === VOXEL_STATE_ACCEPTED) {
						Tx = Math.min(Tx, timeField[vIdx + 1] ?? Infinity);
					}

					let Ty = Infinity;
					if (ny > 0 && state[vIdx - strideY] === VOXEL_STATE_ACCEPTED) {
						Ty = Math.min(Ty, timeField[vIdx - strideY] ?? Infinity);
					}
					if (ny < dimensions.height - 1 && state[vIdx + strideY] === VOXEL_STATE_ACCEPTED) {
						Ty = Math.min(Ty, timeField[vIdx + strideY] ?? Infinity);
					}

					let Tz = Infinity;
					if (nz > 0 && state[vIdx - strideZ] === VOXEL_STATE_ACCEPTED) {
						Tz = Math.min(Tz, timeField[vIdx - strideZ] ?? Infinity);
					}
					if (nz < dimensions.depth - 1 && state[vIdx + strideZ] === VOXEL_STATE_ACCEPTED) {
						Tz = Math.min(Tz, timeField[vIdx + strideZ] ?? Infinity);
					}

					const newT = solveEikonalUpdate3D(Tx, Ty, Tz, hx, hy, hz, V);

					if (newT < (timeField[vIdx] ?? Infinity)) {
						timeField[vIdx] = newT;
						state[vIdx] = VOXEL_STATE_TRIAL;
						heap.push(vIdx, newT);
					}
				}
			}
		}
	}

	return timeField;
}
