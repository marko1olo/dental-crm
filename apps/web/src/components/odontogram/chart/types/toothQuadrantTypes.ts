import {
	BOTTOM_TEETH,
	PEDIATRIC_BOTTOM_TEETH,
	PEDIATRIC_TOP_TEETH,
	TOP_TEETH,
	splitArchAtMidline,
} from "@dental/shared";

export type OdontogramQuadrantId =
	| "all"
	| "Q1"
	| "Q2"
	| "Q3"
	| "Q4"
	| "Q5"
	| "Q6"
	| "Q7"
	| "Q8";

export interface QuadrantDefinition {
	id: OdontogramQuadrantId;
	label: string;
	shortLabel: string;
	rangeText: string;
	jaw: "upper" | "lower";
	side: "right" | "left";
	teeth: number[];
}

export const ADULT_QUADRANTS: readonly QuadrantDefinition[] = [
	{ id: "Q1", label: "Q1: Верхняя челюсть (Правый)", shortLabel: "Q1 18–11", rangeText: "18–11 (Правый)", jaw: "upper", side: "right", teeth: [18, 17, 16, 15, 14, 13, 12, 11] },
	{ id: "Q2", label: "Q2: Верхняя челюсть (Левый)", shortLabel: "Q2 21–28", rangeText: "21–28 (Левый)", jaw: "upper", side: "left", teeth: [21, 22, 23, 24, 25, 26, 27, 28] },
	{ id: "Q4", label: "Q4: Нижняя челюсть (Правый)", shortLabel: "Q4 48–41", rangeText: "48–41 (Правый)", jaw: "lower", side: "right", teeth: [48, 47, 46, 45, 44, 43, 42, 41] },
	{ id: "Q3", label: "Q3: Нижняя челюсть (Левый)", shortLabel: "Q3 31–38", rangeText: "31–38 (Левый)", jaw: "lower", side: "left", teeth: [31, 32, 33, 34, 35, 36, 37, 38] },
];

export const PEDIATRIC_QUADRANTS: readonly QuadrantDefinition[] = [
	{ id: "Q5", label: "Q5: Верхняя челюсть (Правый)", shortLabel: "Q5 55–51", rangeText: "55–51 (Правый)", jaw: "upper", side: "right", teeth: [55, 54, 53, 52, 51] },
	{ id: "Q6", label: "Q6: Верхняя челюсть (Левый)", shortLabel: "Q6 61–65", rangeText: "61–65 (Левый)", jaw: "upper", side: "left", teeth: [61, 62, 63, 64, 65] },
	{ id: "Q8", label: "Q8: Нижняя челюсть (Правый)", shortLabel: "Q8 85–81", rangeText: "85–81 (Правый)", jaw: "lower", side: "right", teeth: [85, 84, 83, 82, 81] },
	{ id: "Q7", label: "Q7: Нижняя челюсть (Левый)", shortLabel: "Q7 71–75", rangeText: "71–75 (Левый)", jaw: "lower", side: "left", teeth: [71, 72, 73, 74, 75] },
];

export function getQuadrantForTooth(toothNumber: number, pediatricMode?: boolean): OdontogramQuadrantId {
	const q = Math.floor(toothNumber / 10);
	if (q >= 1 && q <= 8) return `Q${q}` as OdontogramQuadrantId;
	return pediatricMode ? "Q5" : "Q1";
}

export function getAdjacentQuadrant(current: OdontogramQuadrantId, direction: "next" | "prev", pediatricMode?: boolean): OdontogramQuadrantId {
	const order: OdontogramQuadrantId[] = pediatricMode ? ["Q5", "Q6", "Q7", "Q8"] : ["Q1", "Q2", "Q3", "Q4"];
	const idx = order.indexOf(current);
	if (idx === -1) return order[0]!;
	return direction === "next" ? order[(idx + 1) % order.length]! : order[(idx - 1 + order.length) % order.length]!;
}

export function isQuadrantTop(quadrant: OdontogramQuadrantId): boolean {
	return quadrant === "Q1" || quadrant === "Q2" || quadrant === "Q5" || quadrant === "Q6";
}

export function getQuadrantTitle(quadrant: OdontogramQuadrantId, pediatricMode?: boolean): string {
	const titles: Record<string, string> = {
		Q1: "Верхняя челюсть (Правая) • Зубы 18–11",
		Q2: "Верхняя челюсть (Левая) • Зубы 21–28",
		Q3: "Нижняя челюсть (Левая) • Зубы 31–38",
		Q4: "Нижняя челюсть (Правая) • Зубы 48–41",
		Q5: "Верхняя челюсть (Правая) • Зубы 55–51",
		Q6: "Верхняя челюсть (Левая) • Зубы 61–65",
		Q7: "Нижняя челюсть (Левая) • Зубы 71–75",
		Q8: "Нижняя челюсть (Правая) • Зубы 85–81",
	};
	return titles[quadrant] ?? (pediatricMode ? "Все молочные зубы (55–85)" : "Все взрослые зубы (18–48)");
}

export function getQuadrantTeeth(
	quadrant: OdontogramQuadrantId,
	topTeeth?: readonly number[] | number[] | null,
	bottomTeeth?: readonly number[] | number[] | null,
	pediatricMode?: boolean,
): number[] {
	const safeTop = Array.isArray(topTeeth) && topTeeth.length > 0 ? topTeeth : (pediatricMode ? PEDIATRIC_TOP_TEETH : TOP_TEETH);
	const safeBottom = Array.isArray(bottomTeeth) && bottomTeeth.length > 0 ? bottomTeeth : (pediatricMode ? PEDIATRIC_BOTTOM_TEETH : BOTTOM_TEETH);
	const topSplit = splitArchAtMidline(safeTop);
	const bottomSplit = splitArchAtMidline(safeBottom);

	switch (quadrant) {
		case "Q1": case "Q5":
			return topSplit.left.length > 0 ? topSplit.left : (quadrant === "Q5" ? [55, 54, 53, 52, 51] : [18, 17, 16, 15, 14, 13, 12, 11]);
		case "Q2": case "Q6":
			return topSplit.right.length > 0 ? topSplit.right : (quadrant === "Q6" ? [61, 62, 63, 64, 65] : [21, 22, 23, 24, 25, 26, 27, 28]);
		case "Q4": case "Q8":
			return bottomSplit.left.length > 0 ? bottomSplit.left : (quadrant === "Q8" ? [85, 84, 83, 82, 81] : [48, 47, 46, 45, 44, 43, 42, 41]);
		case "Q3": case "Q7":
			return bottomSplit.right.length > 0 ? bottomSplit.right : (quadrant === "Q7" ? [71, 72, 73, 74, 75] : [31, 32, 33, 34, 35, 36, 37, 38]);
		default:
			return [...safeTop, ...safeBottom];
	}
}
