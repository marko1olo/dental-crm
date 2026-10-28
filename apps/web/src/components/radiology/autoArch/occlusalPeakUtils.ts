/**
 * DENTE CRM — CBCT Occlusal Peak Analysis Helpers
 * Standards: DICOM Part 3, Misch CE, Mandate 8b (<= 120 lines).
 */

import type { CbctVoxelVolume } from "../cbctMprMath";
import type { OcclusalDensitySliceProfile } from "../cbctAutoArchTypes";
import { extractAxialMIPSlab } from "./axialMipExtractor";

export interface ZPeak {
	zIndex: number;
	zMm: number;
	score: number;
}

/** Finds local maxima in a 1D density profile above threshold. */
export function findDensityPeaks(
	profile: readonly OcclusalDensitySliceProfile[],
	extractor: (p: OcclusalDensitySliceProfile) => number,
	minRelativeThreshold = 0.25,
): ZPeak[] {
	let maxVal = 0;
	for (const p of profile) {
		const val = extractor(p);
		if (val > maxVal) maxVal = val;
	}
	if (maxVal < 10) return [];
	const threshold = maxVal * minRelativeThreshold;
	const peaks: ZPeak[] = [];
	for (let i = 1; i < profile.length - 1; i++) {
		const prev = extractor(profile[i - 1]!);
		const cur = extractor(profile[i]!);
		const next = extractor(profile[i + 1]!);
		if (cur >= prev && cur >= next && cur >= threshold) {
			peaks.push({ zIndex: profile[i]!.zIndex, zMm: profile[i]!.zMm, score: cur });
		}
	}
	return peaks;
}

/** Scores candidate axial enamel slabs around primary bite plane. */
export function scoreBitePlaneCandidates(
	volume: CbctVoxelVolume,
	biteZ: number,
	jawType: "mandible" | "maxilla",
): number {
	const offsets = jawType === "mandible" ? [3.5, 5.0, 7.0, 8.5, 10.0] : [-3.0, -4.5, -6.0, -7.5, -9.0];
	let bestZ = biteZ + (jawType === "mandible" ? 7.0 : -4.5);
	let bestScore = -1;

	for (const offset of offsets) {
		const candZ = Number((biteZ + offset).toFixed(2));
		const slab = extractAxialMIPSlab(volume, candZ, 4.0);
		const data = slab.data;
		const totalV = slab.width * slab.height;
		let enamelVoxels = 0, sumX = 0, sumY = 0, sumX2 = 0;

		for (let i = 0; i < totalV; i++) {
			const hu = data[i] ?? -1000;
			if (hu >= 1600) {
				enamelVoxels++;
				const vx = i % slab.width;
				const vy = Math.floor(i / slab.width);
				const xMm = slab.originMm.x + vx * (slab.spacingMm.x || 0.25);
				const yMm = slab.originMm.y + vy * (slab.spacingMm.y || 0.25);
				sumX += xMm; sumY += yMm; sumX2 += xMm * xMm;
			}
		}

		if (enamelVoxels >= 30) {
			const meanX = sumX / enamelVoxels;
			const varX = Math.max(1, sumX2 / enamelVoxels - meanX * meanX);
			const score = enamelVoxels / (1 + Math.abs(varX - 450) / 100);
			if (score > bestScore) {
				bestScore = score;
				bestZ = candZ;
			}
		}
	}
	return bestZ;
}
