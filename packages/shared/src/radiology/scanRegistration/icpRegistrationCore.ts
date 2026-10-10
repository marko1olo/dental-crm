/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ITERATIVE CLOSEST POINT (ICP) SURFACE REGISTRATION — (LAYER 3)
 * ═══════════════════════════════════════════════════════════════════════════
 * Point-to-point ICP fine alignment between source (intraoral optical STL mesh)
 * and target (CBCT segmented bone/enamel mesh). Iteratively estimates closest
 * correspondences, applies optimal Horn/Kabsch rigid transform, and evaluates
 * RMS residual convergence.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { IcpOptions, IcpResult, Vec3 } from "./types.js";
import { IDENTITY4, applyMat4, mul4 } from "./matrixMath4.js";
import { kabschTransform } from "./eigenAndKabsch.js";

/** Find nearest target point to point q. */
export function nearestPoint(target: Vec3[], q: Vec3): Vec3 {
	let bd = Infinity;
	let bj = 0;
	for (let j = 0; j < target.length; j++) {
		const t = target[j]!;
		const d = (q[0] - t[0]) ** 2 + (q[1] - t[1]) ** 2 + (q[2] - t[2]) ** 2;
		if (d < bd) {
			bd = d;
			bj = j;
		}
	}
	return target[bj]!;
}

/** RMS of transformed source points to their nearest target points in mm. */
export function nearestRms(source: Vec3[], target: Vec3[], m: number[]): number {
	let sum = 0;
	for (let i = 0; i < source.length; i++) {
		const p = source[i]!;
		const q = applyMat4(m, p);
		const t = nearestPoint(target, q);
		sum += (q[0] - t[0]) ** 2 + (q[1] - t[1]) ** 2 + (q[2] - t[2]) ** 2;
	}
	return Math.sqrt(sum / source.length);
}

/**
 * Point-to-point ICP (Iterative Closest Point):
 * Refines an initial alignment between source and target point clouds by repeatedly
 * finding closest-point correspondences and estimating the optimal rigid transform.
 */
export function icpAlign(
	source: Vec3[],
	target: Vec3[],
	opts: IcpOptions = {},
): IcpResult | null {
	const maxIter = opts.maxIterations ?? 40;
	const tol = opts.tolerance ?? 1e-4;
	if (source.length < 3 || target.length < 1) return null;

	let current: number[] = opts.initial ? [...opts.initial] : [...IDENTITY4];
	let prevRms = Infinity;
	let iter = 0;
	for (; iter < maxIter; iter++) {
		const moved = source.map((p) => applyMat4(current, p));
		const matched = moved.map((m) => nearestPoint(target, m));
		const delta = kabschTransform(moved, matched);
		if (!delta) break;

		current = mul4(delta, current);
		const rms = nearestRms(source, target, current);
		const improved = prevRms - rms;
		prevRms = rms;

		if (improved >= 0 && improved < tol) {
			iter++;
			break;
		}
	}

	const rmsMm = prevRms === Infinity ? nearestRms(source, target, current) : prevRms;
	return { transform: current, rmsMm, iterations: iter };
}
