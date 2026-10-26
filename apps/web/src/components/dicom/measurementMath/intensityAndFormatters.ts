/**
 * intensityAndFormatters.ts — Статистика ROI, line profile и клинические форматтеры (Мандат 8b <= 120 строк).
 */

import { trilinear, type VolumeSamplingData } from "../panoramicMprMath";
import type { RoiStats } from "./types";

export function computeRoiStats(values: ArrayLike<number>): RoiStats | null {
	const n = values.length;
	if (n === 0) return null;

	let min = Infinity;
	let max = -Infinity;
	let sum = 0;

	for (let i = 0; i < n; i++) {
		const v = values[i]!;
		sum += v;
		if (v < min) min = v;
		if (v > max) max = v;
	}

	const mean = sum / n;
	let sse = 0;
	for (let i = 0; i < n; i++) {
		const diff = values[i]! - mean;
		sse += diff * diff;
	}

	return {
		count: n,
		mean: Number(mean.toFixed(1)),
		stdDev: Number(Math.sqrt(sse / n).toFixed(1)),
		min: Number(min.toFixed(1)),
		max: Number(max.toFixed(1)),
	};
}

export function lineProfileHU(
	vol: VolumeSamplingData,
	a: [number, number, number],
	b: [number, number, number],
	samples = 64,
): number[] {
	const n = Math.max(2, Math.floor(samples));
	const [ox, oy, oz] = vol.origin;
	const out = new Array<number>(n);

	for (let i = 0; i < n; i++) {
		const t = i / (n - 1);
		const wx = a[0] + (b[0] - a[0]) * t;
		const wy = a[1] + (b[1] - a[1]) * t;
		const wz = a[2] + (b[2] - a[2]) * t;

		const ci = (wx - ox) * vol.invSx;
		const cj = (wy - oy) * vol.invSy;
		const ck = (wz - oz) * vol.invSz;

		out[i] = trilinear(vol.getVoxel, vol.dims, ci, cj, ck);
	}

	return out;
}

export function formatDistanceRu(distMm: number, decimals = 1): string {
	if (!Number.isFinite(distMm)) return "— мм";
	return `${distMm.toFixed(decimals)} мм`;
}

export function formatAngleRu(deg: number, decimals = 1): string {
	if (!Number.isFinite(deg)) return "—°";
	return `${deg.toFixed(decimals)}°`;
}

export function formatAreaRu(areaMm2: number, decimals = 1): string {
	if (!Number.isFinite(areaMm2)) return "— мм²";
	return `${areaMm2.toFixed(decimals)} мм²`;
}

export function formatDimensions2DRu(wMm: number, hMm: number, decimals = 1): string {
	if (!Number.isFinite(wMm) || !Number.isFinite(hMm)) return "— × — мм";
	return `${wMm.toFixed(decimals)} × ${hMm.toFixed(decimals)} мм`;
}

export function formatDensityRu(hu: number | null | undefined): string {
	if (hu === null || hu === undefined || !Number.isFinite(hu)) return "— HU";
	return `${Math.round(hu)} HU`;
}
