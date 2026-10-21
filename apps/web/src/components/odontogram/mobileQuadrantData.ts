import type { OdontogramQuadrantId } from "./chart/toothChartTypes";

export interface MobileQuadrantItem {
	readonly id: OdontogramQuadrantId;
	readonly label: string;
	readonly teethRange: string;
	readonly jawName: string;
	readonly badge: string;
	readonly title: string;
	readonly testId: string;
}

export function buildMobileQuadrants(isPediatricEffective: boolean): readonly MobileQuadrantItem[] {
	const q1Id: OdontogramQuadrantId = isPediatricEffective ? "Q5" : "Q1";
	const q2Id: OdontogramQuadrantId = isPediatricEffective ? "Q6" : "Q2";
	const q4Id: OdontogramQuadrantId = isPediatricEffective ? "Q8" : "Q4";
	const q3Id: OdontogramQuadrantId = isPediatricEffective ? "Q7" : "Q3";

	return [
		{
			id: q1Id,
			label: isPediatricEffective ? "Q5" : "Q1",
			teethRange: isPediatricEffective ? "55–51" : "18–11",
			jawName: "Верх-Пр",
			badge: "ВЧ·П",
			title: isPediatricEffective
				? "Q5 (Верхняя челюсть, Правый, 55–51)"
				: "Q1 (Верхняя челюсть, Правый, 18–11)",
			testId: `mobile-quadrant-btn-${q1Id}`,
		},
		{
			id: q2Id,
			label: isPediatricEffective ? "Q6" : "Q2",
			teethRange: isPediatricEffective ? "61–65" : "21–28",
			jawName: "Верх-Лев",
			badge: "ВЧ·Л",
			title: isPediatricEffective
				? "Q6 (Верхняя челюсть, Левый, 61–65)"
				: "Q2 (Верхняя челюсть, Левый, 21–28)",
			testId: `mobile-quadrant-btn-${q2Id}`,
		},
		{
			id: q4Id,
			label: isPediatricEffective ? "Q8" : "Q4",
			teethRange: isPediatricEffective ? "85–81" : "48–41",
			jawName: "Низ-Пр",
			badge: "НЧ·П",
			title: isPediatricEffective
				? "Q8 (Нижняя челюсть, Правый, 85–81)"
				: "Q4 (Нижняя челюсть, Правый, 48–41)",
			testId: `mobile-quadrant-btn-${q4Id}`,
		},
		{
			id: q3Id,
			label: isPediatricEffective ? "Q7" : "Q3",
			teethRange: isPediatricEffective ? "71–75" : "31–38",
			jawName: "Низ-Лев",
			badge: "НЧ·Л",
			title: isPediatricEffective
				? "Q7 (Нижняя челюсть, Левый, 71–75)"
				: "Q3 (Нижняя челюсть, Левый, 31–38)",
			testId: `mobile-quadrant-btn-${q3Id}`,
		},
	];
}
