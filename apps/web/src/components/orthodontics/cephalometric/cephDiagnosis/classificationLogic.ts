import type { DentalMeasurementsResult } from "../dentalMeasurements";
import type { SkeletalMeasurementsResult } from "../skeletalMeasurements";
import type { CephalometricDiagnosis } from "../types";

export function evaluateSkeletalAndDentalClassifications(
	skeletal: SkeletalMeasurementsResult,
	dental: DentalMeasurementsResult,
): Omit<CephalometricDiagnosis, "protocol043Text"> {
	const { snaVal, snbVal, anbVal, witsVal, convexityVal, mcnamaraAVal, mcnamaraAInterp, mcnamaraPogVal, mcnamaraPogInterp, snGognVal, fmaVal, yAxisVal } = skeletal;
	const { u1SnVal, u1NaAngleVal, u1NaAngleInterp, u1NaDistVal, l1MpVal, l1NbAngleVal, l1NbAngleInterp, l1NbDistVal } = dental;

	const skeletalClass = anbVal === null ? "Undefined" : anbVal > 4.0 ? "Class II" : anbVal < 0.0 ? "Class III" : "Class I";
	const skeletalClassRu = skeletalClass === "Class II"
		? "Скелетный класс II (Дистальное соотношение базисов)"
		: skeletalClass === "Class III"
			? "Скелетный класс III (Мезиальное соотношение базисов)"
			: skeletalClass === "Class I"
				? "Скелетный класс I (Нейтральное гармоничное соотношение)"
				: "Не определен (установите реперные точки)";

	const maxillaryPosition = snaVal === null ? "Undefined" : snaVal > 84 ? "Prognathism" : snaVal < 80 ? "Retrognathism" : "Normal";
	const maxillaryPositionRu = maxillaryPosition === "Prognathism" ? "Верхнечелюстная прогнатия" : maxillaryPosition === "Retrognathism" ? "Верхнечелюстная ретрогнатия" : maxillaryPosition === "Normal" ? "Ортогнатическое положение верхней челюсти" : "Не определено";

	const mandibularPosition = snbVal === null ? "Undefined" : snbVal > 82 ? "Prognathism" : snbVal < 78 ? "Retrognathism" : "Normal";
	const mandibularPositionRu = mandibularPosition === "Prognathism" ? "Нижнечелюстная прогнатия" : mandibularPosition === "Retrognathism" ? "Нижнечелюстная ретрогнатия" : mandibularPosition === "Normal" ? "Ортогнатическое положение нижней челюсти" : "Не определено";

	const growthPattern = snGognVal === null
		? "Undefined"
		: snGognVal > 35 || (fmaVal !== null && fmaVal > 28) || (yAxisVal !== null && yAxisVal > 63.2)
			? "Dolichofacial (Hyperdivergent)"
			: snGognVal < 29 || (fmaVal !== null && fmaVal < 22) || (yAxisVal !== null && yAxisVal < 55.6)
				? "Brachyfacial (Hypodivergent)"
				: "Mesofacial";

	const growthPatternRu = growthPattern === "Dolichofacial (Hyperdivergent)"
		? "Долихофациальный (гипердивергентный, вертикальный вектор роста)"
		: growthPattern === "Brachyfacial (Hypodivergent)"
			? "Брахифациальный (гиподивергентный, горизонтальный вектор роста)"
			: growthPattern === "Mesofacial"
				? "Мезофациальный (нейтральный, сбалансированный тип роста)"
				: "Не определен";

	const upperIncisorInclination = u1SnVal === null ? "Undefined" : u1SnVal > 106 ? "Proclination" : u1SnVal < 102 ? "Retroclination" : "Normal";
	const upperIncisorInclinationRu = upperIncisorInclination === "Proclination" ? "Протрузия (вестибулоокклюзия) резцов" : upperIncisorInclination === "Retroclination" ? "Ретрузия (палатоокклюзия) резцов" : upperIncisorInclination === "Normal" ? "Нормальный наклон" : "Не определен";

	const lowerIncisorInclination = l1MpVal === null ? "Undefined" : l1MpVal > 93 ? "Proclination" : l1MpVal < 87 ? "Retroclination" : "Normal";
	const lowerIncisorInclinationRu = lowerIncisorInclination === "Proclination" ? "Протрузия (вестибулоокклюзия) резцов" : lowerIncisorInclination === "Retroclination" ? "Ретрузия (лингвоокклюзия) резцов" : lowerIncisorInclination === "Normal" ? "Нормальный наклон (IMPA в норме)" : "Не определен";

	const witsRelationshipRu = witsVal === null ? "Wits не рассчитан" : witsVal > 2 ? `Wits = +${witsVal} мм (Скелетный класс II)` : witsVal < -2 ? `Wits = ${witsVal} мм (Скелетный класс III)` : `Wits = ${witsVal >= 0 ? "+" : ""}${witsVal} мм (Скелетный класс I)`;
	const downsConvexityRu = convexityVal === null ? "Выпуклость профиля не оценена" : convexityVal > 5 ? `Выпуклый профиль (+${convexityVal}° по Downs)` : convexityVal < -5 ? `Вогнутый профиль (${convexityVal}° по Downs)` : `Прямой профиль (${convexityVal >= 0 ? "+" : ""}${convexityVal}° по Downs)`;
	const mcnamaraRelationshipRu = mcnamaraAVal === null || mcnamaraPogVal === null ? "Параметры McNamara не рассчитаны" : `McNamara: A to N-perp = ${mcnamaraAVal >= 0 ? "+" : ""}${mcnamaraAVal} мм (${mcnamaraAInterp}), Pog to N-perp = ${mcnamaraPogVal >= 0 ? "+" : ""}${mcnamaraPogVal} мм (${mcnamaraPogInterp})`;
	const u1NaRelationshipRu = u1NaAngleVal === null ? "Соотношение 1-NA не оценено" : `1-NA = ${u1NaAngleVal}° (${u1NaDistVal !== null ? `${u1NaDistVal} мм, ` : ""}${u1NaAngleInterp})`;
	const l1NbRelationshipRu = l1NbAngleVal === null ? "Соотношение 1-NB не оценено" : `1-NB = ${l1NbAngleVal}° (${l1NbDistVal !== null ? `${l1NbDistVal} мм, ` : ""}${l1NbAngleInterp})`;

	const summaryRu = skeletalClass === "Undefined"
		? "Для построения ортодонтического заключения расставьте все анатомические реперные точки на снимке ТРГ."
		: `${skeletalClassRu}. ${maxillaryPositionRu}, ${mandibularPositionRu}. ${growthPatternRu}. Положение резцов: верхние — ${upperIncisorInclinationRu.toLowerCase()}, нижние — ${lowerIncisorInclinationRu.toLowerCase()}. ${witsRelationshipRu}. ${downsConvexityRu}. ${mcnamaraRelationshipRu}. ${u1NaRelationshipRu}. ${l1NbRelationshipRu}.`;

	return {
		skeletalClass,
		skeletalClassRu,
		maxillaryPosition,
		maxillaryPositionRu,
		mandibularPosition,
		mandibularPositionRu,
		growthPattern,
		growthPatternRu,
		upperIncisorInclination,
		upperIncisorInclinationRu,
		lowerIncisorInclination,
		lowerIncisorInclinationRu,
		witsRelationshipRu,
		downsConvexityRu,
		mcnamaraRelationshipRu,
		u1NaRelationshipRu,
		l1NbRelationshipRu,
		summaryRu,
	};
}
