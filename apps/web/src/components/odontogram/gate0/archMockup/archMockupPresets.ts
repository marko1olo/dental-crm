/**
 * DENTE Dental CRM — 32-Tooth Full Arch Preset Distributions
 * Authentic clinical assortment across 50 presets (Mandate 8b <= 120 lines).
 */

import { TOOTH46_PRESETS } from "../Tooth46ClinicalPresets";
import type { MockupToothItem } from "./archMockupTypes";

export const UPPER_TEETH_FDI = [
	18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
] as const;

export const LOWER_TEETH_FDI = [
	48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
] as const;

export const DEFAULT_32_ASSIGNMENTS: Record<number, string> = {
	18: "intact",
	17: "caries_class2_mo",
	16: "crown_pfm",
	15: "composite",
	14: "caries",
	13: "intact",
	12: "caries_white_spot",
	11: "intact",
	21: "intact",
	22: "composite_defective",
	23: "abfraction",
	24: "endodontics",
	25: "restoration_inlay",
	26: "crown",
	27: "pulpitis",
	28: "missing",
	48: "missing",
	47: "periodontitis",
	46: "caries_class2_mod",
	45: "postCore",
	44: "crown_emax",
	43: "intact",
	42: "calculus",
	41: "crack",
	31: "intact",
	32: "pathological_attrition",
	33: "caries_class5",
	34: "implant",
	35: "implant_crown",
	36: "resorcinol_formalin",
	37: "cyst",
	38: "broken_file",
};

export function createMockupTeeth(
	assignments: Record<number, string>,
): MockupToothItem[] {
	const all = [...UPPER_TEETH_FDI, ...LOWER_TEETH_FDI];
	return all.map((num) => {
		const isUpper = num < 30;
		const quadrant: 1 | 2 | 3 | 4 =
			num >= 11 && num <= 18 ? 1 : num >= 21 && num <= 28 ? 2 : num >= 31 && num <= 38 ? 3 : 4;
		return {
			toothNumber: num,
			presetId: assignments[num] ?? "intact",
			isUpper,
			quadrant,
		};
	});
}

export function shuffle32Assignments(): Record<number, string> {
	const allPresetIds = TOOTH46_PRESETS.map((p) => p.id);
	const shuffled = [...allPresetIds].sort(() => Math.random() - 0.5);
	const allTeeth = [...UPPER_TEETH_FDI, ...LOWER_TEETH_FDI];
	const result: Record<number, string> = {};
	allTeeth.forEach((toothNum, i) => {
		result[toothNum] = shuffled[i % shuffled.length] ?? "intact";
	});
	return result;
}

export function resetToIntactAssignments(): Record<number, string> {
	const allTeeth = [...UPPER_TEETH_FDI, ...LOWER_TEETH_FDI];
	const result: Record<number, string> = {};
	allTeeth.forEach((toothNum) => {
		result[toothNum] = "intact";
	});
	return result;
}
