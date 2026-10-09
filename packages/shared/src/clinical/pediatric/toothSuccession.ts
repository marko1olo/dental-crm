import { isPrimaryTooth } from "./constants.js";

/**
 * Mapping of Primary Teeth to their permanent successors.
 */
export const PRIMARY_TO_PERMANENT_SUCCESSOR_MAP: Readonly<Record<number, number>> = {
	// Upper Right
	51: 11, // Central Incisor
	52: 12, // Lateral Incisor
	53: 13, // Canine
	54: 14, // First Premolar replaces First Primary Molar
	55: 15, // Second Premolar replaces Second Primary Molar

	// Upper Left
	61: 21,
	62: 22,
	63: 23,
	64: 24,
	65: 25,

	// Lower Left
	71: 31,
	72: 32,
	73: 33,
	74: 34,
	75: 35,

	// Lower Right
	81: 41,
	82: 42,
	83: 43,
	84: 44,
	85: 45,
};

export const PERMANENT_TO_PRIMARY_PREDECESSOR_MAP: Readonly<Record<number, number>> = {
	11: 51,
	12: 52,
	13: 53,
	14: 54,
	15: 55,
	21: 61,
	22: 62,
	23: 63,
	24: 64,
	25: 65,
	31: 71,
	32: 72,
	33: 73,
	34: 74,
	35: 75,
	41: 81,
	42: 82,
	43: 83,
	44: 84,
	45: 85,
};

/**
 * Returns permanent successor tooth FDI number for a given primary tooth (e.g. 54 -> 14).
 */
export function getPermanentSuccessor(primaryTooth: number): number | undefined {
	return PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[primaryTooth];
}

/**
 * Returns primary predecessor tooth FDI number for a given permanent tooth (e.g. 14 -> 54).
 */
export function getPrimaryPredecessor(permanentTooth: number): number | undefined {
	return PERMANENT_TO_PRIMARY_PREDECESSOR_MAP[permanentTooth];
}

/**
 * Checks whether a given FDI tooth number is a primary molar (54, 55, 64, 65, 74, 75, 84, 85).
 */
export function isPrimaryMolar(toothNumber: number): boolean {
	if (!isPrimaryTooth(toothNumber)) return false;
	const lastDigit = toothNumber % 10;
	return lastDigit === 4 || lastDigit === 5;
}
