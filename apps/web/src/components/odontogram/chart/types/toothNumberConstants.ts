import {
	BOTTOM_TEETH,
	TOP_TEETH,
} from "@dental/shared";
import type { ToothData } from "./toothRendererTypes";
import type { ToothState } from "../toothChartTypes";

export const ALL_ADULT_TEETH_NUMBERS: readonly number[] = [
	...TOP_TEETH,
	...BOTTOM_TEETH,
];

export const ADULT_MOLARS: readonly number[] = [
	18, 17, 16, 26, 27, 28, 48, 47, 46, 36, 37, 38,
];
export const ADULT_FIRST_MOLARS: readonly number[] = [
	16, 26, 36, 46,
];
export const ADULT_WISDOM_TEETH: readonly number[] = [
	18, 28, 38, 48,
];
export const ADULT_PREMOLARS: readonly number[] = [
	15, 14, 24, 25, 45, 44, 34, 35,
];
export const ADULT_FRONTAL: readonly number[] = [
	13, 12, 11, 21, 22, 23, 43, 42, 41, 31, 32, 33,
];
export const ADULT_FRONT_TEETH: readonly number[] = [
	...ADULT_FRONTAL,
];

export function createDefaultAdultTeethData(): ToothData[] {
	return ALL_ADULT_TEETH_NUMBERS.map((toothNumber) => ({
		toothNumber,
		state: "Healthy" as ToothState,
	}));
}

export const PEDIATRIC_MOLARS: readonly number[] = [55, 54, 64, 65, 85, 84, 74, 75];

export const MIN_ARCH_SCALE = 0.28;

export function scaleCssPx(value: string, factor: number): string {
	const parsed = Number.parseFloat(value);
	if (!Number.isFinite(parsed)) return value;
	return `${parsed * factor}px`;
}
