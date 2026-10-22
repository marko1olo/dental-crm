/**
 * honestArchTypes.ts — типы и структуры данных честного анатомического движка зубной дуги.
 * Mandate 8b: Модульность, строго < 120 строк.
 * Mandate 8d: Ноль мультяшных эмодзи.
 */

import type { Point2D } from "../cbctCaliperNerveMath";
import type { DentalArchAnchor, DentalArchCurve } from "../cbctArchSplineMath";

export interface HonestToothAnchor extends DentalArchAnchor {
	readonly isMissing: boolean;
	readonly peakHU: number;
	readonly status: "present" | "missing_defect";
	readonly dMm?: number;
}

export interface HonestDentalArchResult {
	readonly anchors: HonestToothAnchor[];
	readonly curve: DentalArchCurve;
	readonly apexMm: Point2D;
	readonly missingTeethFdi: readonly string[];
	readonly presentTeethFdi: readonly string[];
	readonly metrics: {
		readonly enamelLockRatio: number;
		readonly posteriorBoundaryYMm: number;
		readonly fissureMidpointErrorMm: number;
		readonly totalArcLengthMm: number;
		readonly isSectionalScan: boolean;
	};
}

export const MAND_FDI = [
	"48", "47", "46", "45", "44", "43", "42", "41",
	"31", "32", "33", "34", "35", "36", "37", "38",
] as const;

export const MAX_FDI = [
	"18", "17", "16", "15", "14", "13", "12", "11",
	"21", "22", "23", "24", "25", "26", "27", "28",
] as const;

export interface EnamelBead {
	wx: number;
	wy: number;
	hu: number;
	dMm: number;
	weight: number;
	count: number;
	areaMm2?: number | undefined;
	circularity?: number | undefined;
	aspectRatio?: number | undefined;
	hasPulp?: boolean | undefined;
}
