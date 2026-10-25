/**
 * packages/shared/src/perio/mathSequence.ts
 *
 * Continuous anatomical probing sequence across the entire dentition.
 * Mandate 8b: File <= 120 lines.
 */

import {
	PERIO_LOWER_ARCH_TEETH,
	PERIO_UPPER_ARCH_TEETH,
	type PerioSiteKey,
	type PerioToothRecord,
	type ProbingStep,
} from "./types.js";

export function generateFullMouthProbingSequence(
	teeth: readonly PerioToothRecord[],
): ProbingStep[] {
	const activeTeethMap = new Map<number, PerioToothRecord>();
	for (const t of teeth) activeTeethMap.set(t.toothNumber, t);

	const sequence: ProbingStep[] = [];

	// 1. Upper Arch Buccal
	for (const num of PERIO_UPPER_ARCH_TEETH) {
		const t = activeTeethMap.get(num);
		if (t?.isMissing) continue;
		const isQuad1 = num < 20;
		const sites: PerioSiteKey[] = isQuad1
			? ["distoBuccal", "midBuccal", "mesioBuccal"]
			: ["mesioBuccal", "midBuccal", "distoBuccal"];
		for (const siteKey of sites) sequence.push({ toothNumber: num, siteKey, arch: "upper", aspect: "buccal" });
	}

	// 2. Upper Arch Palatal
	const upperPalatalOrder = [...PERIO_UPPER_ARCH_TEETH].reverse();
	for (const num of upperPalatalOrder) {
		const t = activeTeethMap.get(num);
		if (t?.isMissing) continue;
		const isQuad2 = num >= 20;
		const sites: PerioSiteKey[] = isQuad2
			? ["distoLingual", "midLingual", "mesioLingual"]
			: ["mesioLingual", "midLingual", "distoLingual"];
		for (const siteKey of sites) sequence.push({ toothNumber: num, siteKey, arch: "upper", aspect: "lingual" });
	}

	// 3. Lower Arch Buccal
	for (const num of PERIO_LOWER_ARCH_TEETH) {
		const t = activeTeethMap.get(num);
		if (t?.isMissing) continue;
		const isQuad4 = num >= 40;
		const sites: PerioSiteKey[] = isQuad4
			? ["distoBuccal", "midBuccal", "mesioBuccal"]
			: ["mesioBuccal", "midBuccal", "distoBuccal"];
		for (const siteKey of sites) sequence.push({ toothNumber: num, siteKey, arch: "lower", aspect: "buccal" });
	}

	// 4. Lower Arch Lingual
	const lowerLingualOrder = [...PERIO_LOWER_ARCH_TEETH].reverse();
	for (const num of lowerLingualOrder) {
		const t = activeTeethMap.get(num);
		if (t?.isMissing) continue;
		const isQuad3 = num < 40;
		const sites: PerioSiteKey[] = isQuad3
			? ["distoLingual", "midLingual", "mesioLingual"]
			: ["mesioLingual", "midLingual", "distoLingual"];
		for (const siteKey of sites) sequence.push({ toothNumber: num, siteKey, arch: "lower", aspect: "lingual" });
	}

	return sequence;
}
