/**
 * packages/shared/src/perio/gradingStages.ts
 *
 * Resolves periodontal stage descriptions and ICD-10 diagnostic outputs.
 * Mandate 8b: File <= 120 lines.
 */

import type { AapGrade, PerioChartSummary } from "./types.js";
import type { PeriodontalDiagnosisDetail } from "./gradingTypes.js";

export const GRADE_LABELS_RU: Record<AapGrade, string> = {
	grade_a: "Грейд A (медленное прогрессирование)",
	grade_b: "Грейд B (умеренное прогрессирование)",
	grade_c: "Грейд C (быстрое прогрессирование)",
};

export interface StageResolutionContext {
	readonly currentSummary: PerioChartSummary;
	readonly teethWithAttachmentLoss: number;
	readonly teethWithSevereLoss: number;
	readonly missingTeethCount: number;
	readonly finalGrade: AapGrade;
	readonly blAgeRatio: number;
	readonly extent: "localized" | "generalized";
	readonly extentLabelRu: string;
	readonly isGeneralized: boolean;
	readonly hasSuppuration: boolean;
}

export function resolvePeriodontalStageDiagnosis(
	ctx: StageResolutionContext,
): PeriodontalDiagnosisDetail {
	const {
		currentSummary, teethWithAttachmentLoss, teethWithSevereLoss,
		missingTeethCount, finalGrade, blAgeRatio, extent, extentLabelRu,
		isGeneralized, hasSuppuration,
	} = ctx;

	const acuteNote = hasSuppuration ? " в фазе обострения (гноетечение)" : "";

	if (teethWithAttachmentLoss === 0 && currentSummary.maxPocketDepthMm <= 3) {
		if (currentSummary.fmbsPercent > 10) {
			return {
				icd10Code: "K05.1",
				diagnosisNameRu: "Хронический простой (катаральный) гингивит, индуцированный биопленкой",
				stageDescriptionRu: `Гингивит без потери прикрепления (BOP: ${currentSummary.fmbsPercent}%, глубина зондирования ≤ 3 мм, CAL = 0 мм)`,
				severity: "gingivitis", aapStage: "gingivitis", aapGrade: finalGrade,
				extent, extentLabelRu, isGeneralized, hasSuppuration,
			};
		}
		return {
			icd10Code: "Z01.2",
			diagnosisNameRu: "Клинически здоровый интактный пародонт",
			stageDescriptionRu: "Пародонт в норме (BOP ≤ 10%, глубина зондирования ≤ 3 мм, CAL = 0 мм)",
			severity: "intact", aapStage: "health", aapGrade: "grade_a",
			extent: "localized", extentLabelRu: "локализованный", isGeneralized: false, hasSuppuration: false,
		};
	}

	if (
		(currentSummary.maxPocketDepthMm >= 7 || teethWithSevereLoss >= 2) &&
		(missingTeethCount >= 5 || currentSummary.teethWithMobilityCount >= 3)
	) {
		return {
			icd10Code: "K05.33",
			diagnosisNameRu: `Хронический ${extentLabelRu} пародонтит тяжелой степени (Стадия IV, ${GRADE_LABELS_RU[finalGrade]})${acuteNote}`,
			stageDescriptionRu: `Стадия IV (угроза потери зубных рядов): CAL макс = ${currentSummary.maxCalMm} мм, PD макс = ${currentSummary.maxPocketDepthMm} мм, отсутствующих зубов: ${missingTeethCount}, BL/Age: ${blAgeRatio}`,
			severity: "severe", aapStage: "stage_4", aapGrade: finalGrade,
			extent, extentLabelRu, isGeneralized, hasSuppuration,
		};
	}

	if (
		currentSummary.maxPocketDepthMm >= 6 || currentSummary.maxCalMm >= 5 ||
		teethWithSevereLoss >= 2 || currentSummary.teethWithFurcationCount >= 2 ||
		currentSummary.teethWithMobilityCount >= 2
	) {
		return {
			icd10Code: "K05.33",
			diagnosisNameRu: `Хронический ${extentLabelRu} пародонтит тяжелой степени (Стадия III, ${GRADE_LABELS_RU[finalGrade]})${acuteNote}`,
			stageDescriptionRu: `Стадия III (глубокая деструкция): CAL макс = ${currentSummary.maxCalMm} мм, PD макс = ${currentSummary.maxPocketDepthMm} мм, участков ≥ 5мм: ${currentSummary.deepPocketsCount}, BL/Age: ${blAgeRatio}`,
			severity: "severe", aapStage: "stage_3", aapGrade: finalGrade,
			extent, extentLabelRu, isGeneralized, hasSuppuration,
		};
	}

	if (
		currentSummary.maxCalMm >= 3 || currentSummary.maxPocketDepthMm >= 5 ||
		currentSummary.teethWithFurcationCount >= 1 || currentSummary.teethWithMobilityCount >= 1
	) {
		return {
			icd10Code: "K05.32",
			diagnosisNameRu: `Хронический ${extentLabelRu} пародонтит средней степени тяжести (Стадия II, ${GRADE_LABELS_RU[finalGrade]})${acuteNote}`,
			stageDescriptionRu: `Стадия II (умеренная потеря прикрепления): CAL макс = ${currentSummary.maxCalMm} мм, PD макс = ${currentSummary.maxPocketDepthMm} мм, BL/Age: ${blAgeRatio}`,
			severity: "moderate", aapStage: "stage_2", aapGrade: finalGrade,
			extent, extentLabelRu, isGeneralized, hasSuppuration,
		};
	}

	const icd = isGeneralized ? "K05.31" : "K05.30";
	return {
		icd10Code: icd,
		diagnosisNameRu: `Хронический ${extentLabelRu} пародонтит легкой степени (Стадия I, ${GRADE_LABELS_RU[finalGrade]})`,
		stageDescriptionRu: `Стадия I (начальная потеря прикрепления): CAL макс = ${currentSummary.maxCalMm} мм, PD макс = ${currentSummary.maxPocketDepthMm} мм, BL/Age: ${blAgeRatio}`,
		severity: "mild", aapStage: "stage_1", aapGrade: finalGrade,
		extent, extentLabelRu, isGeneralized, hasSuppuration,
	};
}
