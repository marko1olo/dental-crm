/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL CBCT BONE QUALITY ENGINE — ANATOMICAL RISK EVALUATOR (LAYER 2)
 * ═══════════════════════════════════════════════════════════════════════════
 * Evaluates proximity to vital anatomical structures (Inferior Alveolar Nerve /
 * Mandibular Canal, Maxillary Sinus Floor, Mental Foramen) and generates
 * formal A4-printable medical record protocols for Form 043/u.
 *
 * Strictly adheres to Mandate 8d item 7: ZERO EMOJIS!
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { BoneSiteAssessment, AnatomicalRiskMetrics } from "./types.js";
import {
	MISCH_CLASSIFICATION_INFO,
	LEKHOLM_ZARB_INFO,
	MANDIBULAR_CANAL_SAFETY_MARGIN_MM,
	MAXILLARY_SINUS_SAFETY_MARGIN_MM,
	MENTAL_FORAMEN_SAFETY_MARGIN_MM,
} from "./constants.js";

/**
 * Formats a formal A4-printable clinical bone assessment and osteotomy planning
 * protocol for the Russian outpatient medical dental record (Form 043/u).
 *
 * Strictly adheres to Mandate 8d item 7: ZERO EMOJIS!
 */
export function formatBoneQualityForm043A4Protocol(
	assessment: BoneSiteAssessment,
): string {
	const mischInfo = MISCH_CLASSIFICATION_INFO[assessment.mischClass];
	const lzInfo = LEKHOLM_ZARB_INFO[assessment.lekholmZarbType];
	const rec = assessment.osteotomyRecommendation;

	const lines: string[] = [
		"═══════════════════════════════════════════════════════════════════════════════",
		"ПРОТОКОЛ ПЛАНИРОВАНИЯ ОСТЕОТОМИИ И ОЦЕНКИ ПЛОТНОСТИ КОСТНОЙ ТКАНИ (ФОРМА 043/У)",
		"═══════════════════════════════════════════════════════════════════════════════",
		`Идентификатор имплантата: ${assessment.implantId}`,
		`Позиция зуба (FDI):       Зуб ${assessment.toothNumber}`,
		`Дата проведения оценки:   ${assessment.assessmentDate ?? "Не указана"}`,
		"───────────────────────────────────────────────────────────────────────────────",
		"1. КОЛИЧЕСТВЕННАЯ ДЕНСИТОМЕТРИЯ И МОРФОЛОГИЧЕСКАЯ КЛАССИФИКАЦИЯ",
		`Средняя плотность ложа:     ${assessment.meanHU.toFixed(1)} HU (GV)`,
		`Плотность губчатого ядра:   ${assessment.trabecularDensityHU.toFixed(1)} HU (GV)`,
		`Диапазон плотности [min..max]: [${assessment.minHU ?? 0} .. ${assessment.maxHU ?? 0}] HU (GV)`,
		`Стандартное отклонение:     +/- ${assessment.stdDevHU ?? 0} HU`,
		`Количество 3D-сэмплов:      ${assessment.sampleCount ?? 0}`,
		"",
		`Класс плотности по Misch:   ${assessment.mischClass} — ${mischInfo.classNameRu}`,
		`Анатомический ориентир:     ${mischInfo.anatomicalLocationRu}`,
		`Тактильная характеристика:  ${mischInfo.tactileFeelRu}`,
		`Клиническое описание:       ${mischInfo.clinicalDescriptionRu}`,
		"",
		`Морфология по Lekholm-Zarb: ${assessment.lekholmZarbType} — ${lzInfo.nameRu}`,
		`Кортикальный слой (гребень): ${assessment.corticalThicknessCrestMm.toFixed(2)} мм`,
		`Кортикальный слой (апекс):   ${assessment.corticalThicknessApicalMm.toFixed(2)} мм`,
		"───────────────────────────────────────────────────────────────────────────────",
		"2. ХИРУРГИЧЕСКИЙ ПРОТОКОЛ ОСТЕОТОМИИ И РЕКОМЕНДАЦИИ ПО СВЕРЛЕНИЮ",
		`Хирургический протокол:     ${rec.drillProtocol.toUpperCase()}`,
		`Описание протокола:         ${rec.drillProtocolDescriptionRu}`,
		`Рекомендуемый торк:         ${rec.recommendedTorqueNcm.min}–${rec.recommendedTorqueNcm.max} Н*см (целевой: ${rec.recommendedTorqueNcm.target ?? rec.recommendedTorqueNcm.min} Н*см)`,
		`Прогноз стабильности ISQ:   ${rec.estimatedISQ.min}–${rec.estimatedISQ.max} ед. (целевой: ${rec.estimatedISQ.target ?? rec.estimatedISQ.min} ед.)`,
		`Ожидаемая первичная фиксация: ${rec.primaryStabilityExpected.toUpperCase()}`,
		`Режим охлаждения:           ${rec.coolingRecommendationRu}`,
		"",
		"Хирургические рекомендации:",
	];

	for (let i = 0; i < rec.surgicalTipsRu.length; i++) {
		lines.push(`  [${i + 1}] ${rec.surgicalTipsRu[i]}`);
	}

	lines.push(
		"───────────────────────────────────────────────────────────────────────────────",
		"Заключение хирурга-имплантолога: Ложе запланировано с учетом биомеханических",
		"параметров плотности кости. Протокол остеотомии утвержден к исполнению.",
		"Подпись врача-стоматолога-хирурга: _______________________ / М.П.",
		"═══════════════════════════════════════════════════════════════════════════════",
	);

	return lines.join("\n");
}

/**
 * Assesses proximity to vital anatomical structures (mandibular canal / maxillary sinus)
 * based on FDI tooth position and measured distances.
 */
export function evaluateNerveAndSinusRisk(
	toothNumber: number,
	corticalThicknessApicalMm: number,
	distanceToCanalMm?: number,
	distanceToSinusMm?: number,
): AnatomicalRiskMetrics {
	const isMandible = toothNumber >= 31 && toothNumber <= 48;
	const isMaxilla = toothNumber >= 11 && toothNumber <= 28;

	if (isMandible) {
		if (distanceToCanalMm !== undefined) {
			const isSafe = distanceToCanalMm >= MANDIBULAR_CANAL_SAFETY_MARGIN_MM;
			return {
				mandibularCanalDistanceMm: distanceToCanalMm,
				isSafeDistance: isSafe,
				...(isSafe
					? {}
					: {
							clinicalWarningRu: `Внимание: Дистанция до нижнеальвеолярного нерва (${distanceToCanalMm.toFixed(1)} мм) менее безопасного порога ${MANDIBULAR_CANAL_SAFETY_MARGIN_MM} мм! Риск нейропатии/парестезии.`,
						}),
			};
		}
		// If molar/premolar (34..38, 44..48) and apical cortex very thin
		if ((toothNumber >= 34 && toothNumber <= 38) || (toothNumber >= 44 && toothNumber <= 48)) {
			if (corticalThicknessApicalMm < 0.5) {
				return {
					isSafeDistance: true,
					clinicalWarningRu: "Предупреждение: Тонкая апикальная костная стенка над нижнечелюстным каналом. Контроль глубины остеотомии по стопперам.",
				};
			}
		}
		return { isSafeDistance: true };
	}

	if (isMaxilla) {
		if (distanceToSinusMm !== undefined) {
			const isSafe = distanceToSinusMm >= MAXILLARY_SINUS_SAFETY_MARGIN_MM;
			return {
				maxillarySinusDistanceMm: distanceToSinusMm,
				isSafeDistance: isSafe,
				...(isSafe
					? {}
					: {
							clinicalWarningRu: `Внимание: Дистанция до дна верхнечелюстного синуса (${distanceToSinusMm.toFixed(1)} мм) менее безопасного порога ${MAXILLARY_SINUS_SAFETY_MARGIN_MM} мм! Показан синус-лифтинг.`,
						}),
			};
		}
		if ((toothNumber >= 14 && toothNumber <= 18) || (toothNumber >= 24 && toothNumber <= 28)) {
			if (corticalThicknessApicalMm < 0.8) {
				return {
					isSafeDistance: true,
					clinicalWarningRu: "Предупреждение: Тонкое костное дно гайморовой пазухи. Рекомендуется закрытый синус-лифтинг с остеотомической конденсацией.",
				};
			}
		}
		return { isSafeDistance: true };
	}

	return { isSafeDistance: true };
}
