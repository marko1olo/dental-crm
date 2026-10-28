/**
 * DENTE CRM — CBCT Occlusal Z Plane Detection Engine
 * Standards: DICOM Part 3, Misch CE, Buser, Mandate 8b (<= 120 lines).
 */

import type { CbctVoxelVolume } from "../cbctMprMath";
import { computeOcclusalDensityProfile } from "../cbctAutoArchTypes";
import { findDensityPeaks, scoreBitePlaneCandidates } from "./occlusalPeakUtils";

/** Finds optimal Z occlusal plane (in physical mm) for specified jaw via multi-tier evaluation. */
export function findOcclusalZPlane(
	volume: CbctVoxelVolume,
	jawType: "mandible" | "maxilla" = "mandible",
): number {
	if (!volume || !volume.data || volume.isDisposed || volume.dimensions.depth <= 0) return 0.0;

	const profile = computeOcclusalDensityProfile(volume);
	if (profile.length === 0) return 0.0;

	let minEnamelZ = Infinity, maxEnamelZ = -Infinity;
	for (const p of profile) {
		if (p.smoothedEnamel >= 1000) {
			if (p.zMm < minEnamelZ) minEnamelZ = p.zMm;
			if (p.zMm > maxEnamelZ) maxEnamelZ = p.zMm;
		}
	}
	const enamelSpanMm = maxEnamelZ >= minEnamelZ ? maxEnamelZ - minEnamelZ : 0;

	// 1. Small FOV Sectional Scans
	const physicalZSpan = (volume.dimensions.depth - 1) * Math.abs(volume.spacingMm.z || 0.25);
	if (volume.dimensions.depth > 100 && physicalZSpan <= 65.0) {
		const smallPeaks = findDensityPeaks(profile, (p) => p.smoothedEnamel, 0.25).sort((a, b) => b.score - a.score);
		if (smallPeaks.length > 0) {
			const topPeak = smallPeaks[0]!;
			const span = Math.min(20, Math.floor(profile.length / 4));
			let bonePos = 0, boneNeg = 0;
			for (let k = 1; k <= span; k++) {
				if (topPeak.zIndex + k < profile.length) bonePos += profile[topPeak.zIndex + k]!.smoothedBone;
				if (topPeak.zIndex - k >= 0) boneNeg += profile[topPeak.zIndex - k]!.smoothedBone;
			}
			const rootDir = bonePos >= boneNeg ? +1 : -1;
			const equatorZ = Number((topPeak.zMm + rootDir * 3.8).toFixed(2));
			const minZ = profile[0]!.zMm;
			const maxZ = profile[profile.length - 1]!.zMm;
			return Math.max(Math.min(minZ, maxZ), Math.min(Math.max(minZ, maxZ), equatorZ));
		}
	}

	// 2. Primary: Enamel peaks (Dentate patients & dual-arch volumes)
	const rawEnamelPeaks = findDensityPeaks(profile, (p) => p.smoothedEnamel, 0.3);
	const sortedByScore = [...rawEnamelPeaks].sort((a, b) => b.score - a.score);
	let dualArches: Array<{ zIndex: number; zMm: number; score: number }> = [];

	if (sortedByScore.length >= 2) {
		const top1 = sortedByScore[0]!;
		const top2 = sortedByScore.slice(1).find((p) => {
			const dist = Math.abs(p.zMm - top1.zMm);
			return dist >= 5.0 && p.score >= top1.score * 0.38;
		});
		if (top2) dualArches = [top1, top2].sort((a, b) => a.zMm - b.zMm);
	}

	if (dualArches.length === 2) {
		return jawType === "mandible" ? dualArches[0]!.zMm : dualArches[1]!.zMm;
	} else if (sortedByScore.length === 1 && enamelSpanMm < 8.0) {
		return sortedByScore[0]!.zMm;
	}

	if (rawEnamelPeaks.length > 0) {
		let maxVal = 0, biteZ = 0.0;
		for (const p of profile) {
			if (p.smoothedEnamel > maxVal) { maxVal = p.smoothedEnamel; biteZ = p.zMm; }
		}
		if (maxVal >= 1000) {
			return scoreBitePlaneCandidates(volume, biteZ, jawType);
		}
	}

	// 3. Secondary: Cortical bone peaks (Edentulous with preserved ridge)
	const bonePeaks = findDensityPeaks(profile, (p) => p.smoothedBone, 0.25);
	if (bonePeaks.length > 0) {
		bonePeaks.sort((a, b) => a.zMm - b.zMm);
		if (bonePeaks.length === 1) return bonePeaks[0]!.zMm;
		return jawType === "mandible" ? bonePeaks[bonePeaks.length - 1]!.zMm : bonePeaks[0]!.zMm;
	}

	// 4. Tertiary: Cancellous / Trabecular ridge peaks
	const cancellousPeaks = findDensityPeaks(profile, (p) => p.smoothedCancellous, 0.3);
	if (cancellousPeaks.length > 0) {
		cancellousPeaks.sort((a, b) => a.zMm - b.zMm);
		if (cancellousPeaks.length === 1) return cancellousPeaks[0]!.zMm;
		return jawType === "mandible" ? cancellousPeaks[cancellousPeaks.length - 1]!.zMm : cancellousPeaks[0]!.zMm;
	}

	const midIdx = Math.floor(profile.length / 2);
	return profile[midIdx]?.zMm ?? 0.0;
}
