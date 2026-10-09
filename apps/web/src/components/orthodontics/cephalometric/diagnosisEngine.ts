/**
 * DENTE CRM — Cephalometric Diagnosis Synthesis & Clinical Summary Engine (Layer 2)
 * Synthesizes skeletal class, maxillary/mandibular position, facial growth pattern,
 * incisor torque/inclinations, Wits/Downs/McNamara relationships, summary, and Form 043/u text.
 */

import type { DentalMeasurementsResult } from "./dentalMeasurements";
import type { SkeletalMeasurementsResult } from "./skeletalMeasurements";
import type { CephalometricDiagnosis } from "./types";

export function synthesizeCephalometricDiagnosis(
	skeletal: SkeletalMeasurementsResult,
	dental: DentalMeasurementsResult,
): CephalometricDiagnosis {
	const {
		snaVal,
		snaInterp,
		snbVal,
		snbInterp,
		anbVal,
		anbInterp,
		witsVal,
		witsInterp,
		facialAngleVal,
		facialAngleInterp,
		convexityVal,
		convexityInterp,
		abPlaneVal,
		abPlaneInterp,
		snGognVal,
		snGognInterp,
		fmaVal,
		fmaInterp,
		yAxisVal,
		yAxisInterp,
		cantOpVal,
		cantOpInterp,
		mmAngleVal,
		mmInterp,
		mcnamaraAVal,
		mcnamaraAInterp,
		mcnamaraPogVal,
		mcnamaraPogInterp,
	} = skeletal;

	const {
		u1SnVal,
		u1SnInterp,
		u1NaAngleVal,
		u1NaAngleInterp,
		u1NaDistVal,
		u1NaDistInterp,
		l1MpVal,
		l1MpInterp,
		l1NbAngleVal,
		l1NbAngleInterp,
		l1NbDistVal,
		l1NbDistInterp,
		u1L1Val,
		u1L1Interp,
	} = dental;

	const skeletalClass = anbVal === null
		? "Undefined"
		: anbVal > 4.0
			? "Class II"
			: anbVal < 0.0
				? "Class III"
				: "Class I";

	const skeletalClassRu = skeletalClass === "Class II"
		? "Скелетный класс II (Дистальное соотношение базисов)"
		: skeletalClass === "Class III"
			? "Скелетный класс III (Мезиальное соотношение базисов)"
			: skeletalClass === "Class I"
				? "Скелетный класс I (Нейтральное гармоничное соотношение)"
				: "Не определен (установите реперные точки)";

	const maxillaryPosition = snaVal === null
		? "Undefined"
		: snaVal > 84
			? "Prognathism"
			: snaVal < 80
				? "Retrognathism"
				: "Normal";

	const maxillaryPositionRu = maxillaryPosition === "Prognathism"
		? "Верхнечелюстная прогнатия"
		: maxillaryPosition === "Retrognathism"
			? "Верхнечелюстная ретрогнатия"
			: maxillaryPosition === "Normal"
				? "Ортогнатическое положение верхней челюсти"
				: "Не определено";

	const mandibularPosition = snbVal === null
		? "Undefined"
		: snbVal > 82
			? "Prognathism"
			: snbVal < 78
				? "Retrognathism"
				: "Normal";

	const mandibularPositionRu = mandibularPosition === "Prognathism"
		? "Нижнечелюстная прогнатия"
		: mandibularPosition === "Retrognathism"
			? "Нижнечелюстная ретрогнатия"
			: mandibularPosition === "Normal"
				? "Ортогнатическое положение нижней челюсти"
				: "Не определено";

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

	const upperIncisorInclination = u1SnVal === null
		? "Undefined"
		: u1SnVal > 106
			? "Proclination"
			: u1SnVal < 102
				? "Retroclination"
				: "Normal";

	const upperIncisorInclinationRu = upperIncisorInclination === "Proclination"
		? "Протрузия (вестибулоокклюзия) резцов"
		: upperIncisorInclination === "Retroclination"
			? "Ретрузия (палатоокклюзия) резцов"
			: upperIncisorInclination === "Normal"
				? "Нормальный наклон"
				: "Не определен";

	const lowerIncisorInclination = l1MpVal === null
		? "Undefined"
		: l1MpVal > 93
			? "Proclination"
			: l1MpVal < 87
				? "Retroclination"
				: "Normal";

	const lowerIncisorInclinationRu = lowerIncisorInclination === "Proclination"
		? "Протрузия (вестибулоокклюзия) резцов"
		: lowerIncisorInclination === "Retroclination"
			? "Ретрузия (лингвоокклюзия) резцов"
			: lowerIncisorInclination === "Normal"
				? "Нормальный наклон (IMPA в норме)"
				: "Не определен";

	const witsRelationshipRu = witsVal === null
		? "Wits не рассчитан"
		: witsVal > 2
			? `Wits = +${witsVal} мм (Скелетный класс II)`
			: witsVal < -2
				? `Wits = ${witsVal} мм (Скелетный класс III)`
				: `Wits = ${witsVal >= 0 ? "+" : ""}${witsVal} мм (Скелетный класс I)`;

	const downsConvexityRu = convexityVal === null
		? "Выпуклость профиля не оценена"
		: convexityVal > 5
			? `Выпуклый профиль (+${convexityVal}° по Downs)`
			: convexityVal < -5
				? `Вогнутый профиль (${convexityVal}° по Downs)`
				: `Прямой профиль (${convexityVal >= 0 ? "+" : ""}${convexityVal}° по Downs)`;

	const mcnamaraRelationshipRu = mcnamaraAVal === null || mcnamaraPogVal === null
		? "Параметры McNamara не рассчитаны"
		: `McNamara: A to N-perp = ${mcnamaraAVal >= 0 ? "+" : ""}${mcnamaraAVal} мм (${mcnamaraAInterp}), Pog to N-perp = ${mcnamaraPogVal >= 0 ? "+" : ""}${mcnamaraPogVal} мм (${mcnamaraPogInterp})`;

	const u1NaRelationshipRu = u1NaAngleVal === null
		? "Соотношение 1-NA не оценено"
		: `1-NA = ${u1NaAngleVal}° (${u1NaDistVal !== null ? `${u1NaDistVal} мм, ` : ""}${u1NaAngleInterp})`;

	const l1NbRelationshipRu = l1NbAngleVal === null
		? "Соотношение 1-NB не оценено"
		: `1-NB = ${l1NbAngleVal}° (${l1NbDistVal !== null ? `${l1NbDistVal} мм, ` : ""}${l1NbAngleInterp})`;

	const summaryRu = skeletalClass === "Undefined"
		? "Для построения ортодонтического заключения расставьте все анатомические реперные точки на снимке ТРГ."
		: `${skeletalClassRu}. ${maxillaryPositionRu}, ${mandibularPositionRu}. ${growthPatternRu}. Положение резцов: верхние — ${upperIncisorInclinationRu.toLowerCase()}, нижние — ${lowerIncisorInclinationRu.toLowerCase()}. ${witsRelationshipRu}. ${downsConvexityRu}. ${mcnamaraRelationshipRu}. ${u1NaRelationshipRu}. ${l1NbRelationshipRu}.`;

	// ── Generation of Structured Form 043/y Text ──────────────────────────────

	const dateStr = new Date().toLocaleDateString("ru-RU");
	const protocol043Text = `ПРОТОКОЛ ТЕЛЕРЕНТГЕНОГРАФИЧЕСКОГО (ТРГ) ИССЛЕДОВАНИЯ В БОКОВОЙ ПРОЕКЦИИ
(Форма 043/у · Приказ МЗ РФ №834н · Анализ по Steiner, Tweed, Downs, Jacobson, Ricketts, McNamara)
Дата расчета: ${dateStr}

1. Сагиттальные скелетные взаимоотношения (Steiner, Downs, Jacobson, McNamara):
• Угол SNA: ${snaVal !== null ? `${snaVal}° (Норма 82°±2°)` : "—"} — ${snaInterp}
• Угол SNB: ${snbVal !== null ? `${snbVal}° (Норма 80°±2°)` : "—"} — ${snbInterp}
• Угол ANB: ${anbVal !== null ? `${anbVal}° (Норма 2°±2°)` : "—"} — ${anbInterp}
• Лицевой угол (Downs / N-Pog to FH): ${facialAngleVal !== null ? `${facialAngleVal}° (Норма 87.8°±3.6°)` : "—"} — ${facialAngleInterp}
• Угол выпуклости (Downs / N-A-Pog): ${convexityVal !== null ? `${convexityVal >= 0 ? "+" : ""}${convexityVal}° (Норма 0°±5°)` : "—"} — ${convexityInterp}
• Угол плоскости A-B (Downs): ${abPlaneVal !== null ? `${abPlaneVal}° (Норма -4.6°±3.2°)` : "—"} — ${abPlaneInterp}
• Wits-число (Jacobson): ${witsVal !== null ? `${witsVal >= 0 ? "+" : ""}${witsVal} мм (Норма 0±1 мм)` : "—"} — ${witsInterp}
• Точка A к N-Perp (McNamara): ${mcnamaraAVal !== null ? `${mcnamaraAVal >= 0 ? "+" : ""}${mcnamaraAVal} мм (Норма 0±2 мм)` : "—"} — ${mcnamaraAInterp}
• Погонион к N-Perp (McNamara): ${mcnamaraPogVal !== null ? `${mcnamaraPogVal >= 0 ? "+" : ""}${mcnamaraPogVal} мм (Норма -2±2 мм)` : "—"} — ${mcnamaraPogInterp}

2. Вертикальные параметры и тип лицевого роста (Tweed, Steiner, Downs, Ricketts):
• Угол SN-GoGn: ${snGognVal !== null ? `${snGognVal}° (Норма 32°±3°)` : "—"} — ${snGognInterp}
• Угол FMA (Tweed): ${fmaVal !== null ? `${fmaVal}° (Норма 25°±3°)` : "—"} — ${fmaInterp}
• Y-ось роста (Downs / S-Gn to FH): ${yAxisVal !== null ? `${yAxisVal}° (Норма 59.4°±3.8°)` : "—"} — ${yAxisInterp}
• Наклон окклюзионной плоскости (Downs / Cant of OP): ${cantOpVal !== null ? `${cantOpVal}° (Норма 9.3°±3.8°)` : "—"} — ${cantOpInterp}
• Межбазисный угол NL-ML (Ricketts): ${mmAngleVal !== null ? `${mmAngleVal}° (Норма 25°±4°)` : "—"} — ${mmInterp}
• Тип роста: ${growthPatternRu}

3. Дентальные характеристики и наклон резцов (Steiner, Tweed):
• Инклинация верхних резцов к N-A (1-NA угол): ${u1NaAngleVal !== null ? `${u1NaAngleVal}° (Норма 22°±2°)` : "—"} — ${u1NaAngleInterp}
• Сагиттальное положение верхних резцов (1-NA мм): ${u1NaDistVal !== null ? `${u1NaDistVal >= 0 ? "+" : ""}${u1NaDistVal} мм (Норма 4±1 мм)` : "—"} — ${u1NaDistInterp}
• Инклинация нижних резцов к N-B (1-NB угол): ${l1NbAngleVal !== null ? `${l1NbAngleVal}° (Норма 25°±2°)` : "—"} — ${l1NbAngleInterp}
• Сагиттальное положение нижних резцов (1-NB мм): ${l1NbDistVal !== null ? `${l1NbDistVal >= 0 ? "+" : ""}${l1NbDistVal} мм (Норма 4±1 мм)` : "—"} — ${l1NbDistInterp}
• Инклинация верхних резцов к SN (U1-SN): ${u1SnVal !== null ? `${u1SnVal}° (Норма 104°±2°)` : "—"} — ${u1SnInterp}
• Наклон нижних резцов (L1-MP / IMPA): ${l1MpVal !== null ? `${l1MpVal}° (Норма 90°±3°)` : "—"} — ${l1MpInterp}
• Межрезцовый угол (U1-L1): ${u1L1Val !== null ? `${u1L1Val}° (Норма 131°±5°)` : "—"} — ${u1L1Interp}

ЗАКЛЮЧЕНИЕ ЦЕФАЛОМЕТРИИ (ТРГ):
${summaryRu}
Рекомендована ортодонтическая коррекция с учетом индивидуального вектора роста лицевого скелета, торка резцовой группы и скелетного профиля.`;

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
		protocol043Text,
	};
}
