import type { Point2D } from "../cbctCaliperNerveMath";

export interface DentalArchAnchor {
	readonly id: string;
	readonly toothFdi: string; // e.g. "46", "36", "11", "21"
	readonly labelRu: string;
	readonly positionMm: Point2D; // X (Right-Left) and Y (Anterior-Posterior) in physical mm
	readonly isQuadrantRight: boolean;
	readonly zMm?: number;
}

export interface DentalArchCurve {
	readonly id: string;
	readonly jawType: "mandible" | "maxilla";
	readonly anchors: readonly DentalArchAnchor[];
	readonly splinePointsMm: readonly Point2D[];
	readonly totalArcLengthMm: number;
	readonly focalTroughThicknessMm: number; // 5..20 mm (default 12 mm)
	readonly planeZMm?: number;
}

// ─── DEFAULT ANATOMICAL DENTAL ARCH ANCHORS (ADULT DENTITION) ───────────────

export const DEFAULT_MANDIBULAR_ARCH_ANCHORS: readonly DentalArchAnchor[] = [
	{ id: "a-48", toothFdi: "48", labelRu: "48 (3-й моляр)", positionMm: { x: -28.0, y: 0.0 }, isQuadrantRight: true },
	{ id: "a-47", toothFdi: "47", labelRu: "47 (2-й моляр)", positionMm: { x: -27.8, y: -12.0 }, isQuadrantRight: true },
	{ id: "a-46", toothFdi: "46", labelRu: "46 (1-й моляр)", positionMm: { x: -27.5, y: -24.0 }, isQuadrantRight: true },
	{ id: "a-45", toothFdi: "45", labelRu: "45 (2-й премоляр)", positionMm: { x: -25.0, y: -34.5 }, isQuadrantRight: true },
	{ id: "a-44", toothFdi: "44", labelRu: "44 (1-й премоляр)", positionMm: { x: -21.5, y: -43.0 }, isQuadrantRight: true },
	{ id: "a-43", toothFdi: "43", labelRu: "43 (Клык)", positionMm: { x: -16.0, y: -49.0 }, isQuadrantRight: true },
	{ id: "a-42", toothFdi: "42", labelRu: "42 (Боковой резец)", positionMm: { x: -8.8, y: -53.0 }, isQuadrantRight: true },
	{ id: "a-41", toothFdi: "41", labelRu: "41 (Центральный резец)", positionMm: { x: -2.7, y: -54.8 }, isQuadrantRight: true },
	{ id: "a-31", toothFdi: "31", labelRu: "31 (Центральный резец)", positionMm: { x: 2.7, y: -54.8 }, isQuadrantRight: false },
	{ id: "a-32", toothFdi: "32", labelRu: "32 (Боковой резец)", positionMm: { x: 8.8, y: -53.0 }, isQuadrantRight: false },
	{ id: "a-33", toothFdi: "33", labelRu: "33 (Клык)", positionMm: { x: 16.0, y: -49.0 }, isQuadrantRight: false },
	{ id: "a-34", toothFdi: "34", labelRu: "34 (1-й премоляр)", positionMm: { x: 21.5, y: -43.0 }, isQuadrantRight: false },
	{ id: "a-35", toothFdi: "35", labelRu: "35 (2-й премоляр)", positionMm: { x: 25.0, y: -34.5 }, isQuadrantRight: false },
	{ id: "a-36", toothFdi: "36", labelRu: "36 (1-й моляр)", positionMm: { x: 27.5, y: -24.0 }, isQuadrantRight: false },
	{ id: "a-37", toothFdi: "37", labelRu: "37 (2-й моляр)", positionMm: { x: 27.8, y: -12.0 }, isQuadrantRight: false },
	{ id: "a-38", toothFdi: "38", labelRu: "38 (3-й моляр)", positionMm: { x: 28.0, y: 0.0 }, isQuadrantRight: false },
];

export const DEFAULT_MAXILLARY_ARCH_ANCHORS: readonly DentalArchAnchor[] = [
	{ id: "a-18", toothFdi: "18", labelRu: "18 (3-й моляр)", positionMm: { x: -29.2, y: -1.0 }, isQuadrantRight: true },
	{ id: "a-17", toothFdi: "17", labelRu: "17 (2-й моляр)", positionMm: { x: -29.0, y: -13.0 }, isQuadrantRight: true },
	{ id: "a-16", toothFdi: "16", labelRu: "16 (1-й моляр)", positionMm: { x: -28.6, y: -25.0 }, isQuadrantRight: true },
	{ id: "a-15", toothFdi: "15", labelRu: "15 (2-й премоляр)", positionMm: { x: -26.0, y: -35.5 }, isQuadrantRight: true },
	{ id: "a-14", toothFdi: "14", labelRu: "14 (1-й премоляр)", positionMm: { x: -22.5, y: -44.0 }, isQuadrantRight: true },
	{ id: "a-13", toothFdi: "13", labelRu: "13 (Клык)", positionMm: { x: -17.0, y: -50.2 }, isQuadrantRight: true },
	{ id: "a-12", toothFdi: "12", labelRu: "12 (Боковой резец)", positionMm: { x: -9.6, y: -54.2 }, isQuadrantRight: true },
	{ id: "a-11", toothFdi: "11", labelRu: "11 (Центральный резец)", positionMm: { x: -3.0, y: -56.0 }, isQuadrantRight: true },
	{ id: "a-21", toothFdi: "21", labelRu: "21 (Центральный резец)", positionMm: { x: 3.0, y: -56.0 }, isQuadrantRight: false },
	{ id: "a-22", toothFdi: "22", labelRu: "22 (Боковой резец)", positionMm: { x: 9.6, y: -54.2 }, isQuadrantRight: false },
	{ id: "a-23", toothFdi: "23", labelRu: "23 (Клык)", positionMm: { x: 17.0, y: -50.2 }, isQuadrantRight: false },
	{ id: "a-24", toothFdi: "24", labelRu: "24 (1-й премоляр)", positionMm: { x: 22.5, y: -44.0 }, isQuadrantRight: false },
	{ id: "a-25", toothFdi: "25", labelRu: "25 (2-й премоляр)", positionMm: { x: 26.0, y: -35.5 }, isQuadrantRight: false },
	{ id: "a-26", toothFdi: "26", labelRu: "26 (1-й моляр)", positionMm: { x: 28.6, y: -25.0 }, isQuadrantRight: false },
	{ id: "a-27", toothFdi: "27", labelRu: "27 (2-й моляр)", positionMm: { x: 29.0, y: -13.0 }, isQuadrantRight: false },
	{ id: "a-28", toothFdi: "28", labelRu: "28 (3-й моляр)", positionMm: { x: 29.2, y: -1.0 }, isQuadrantRight: false },
];
