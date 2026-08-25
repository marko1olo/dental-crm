import {
	calculateBoneLossAgeRatio,
	calculateClinicalAttachmentLevel,
	calculatePerioIndices,
	estimateBoneLossPercentFromTeeth,
} from "./math.js";
import type {
	AapGrade,
	AapStage,
	DiabetesStatus,
	PerioChartSummary,
	PerioToothRecord,
	SmokingStatus,
} from "./types.js";

export interface PeriodontalDiagnosisDetail {
	readonly icd10Code: string;
	readonly diagnosisNameRu: string;
	readonly stageDescriptionRu: string;
	readonly severity: "intact" | "gingivitis" | "mild" | "moderate" | "severe";
	readonly aapStage: AapStage;
	readonly aapGrade: AapGrade;
	readonly extent: "localized" | "generalized" | "molar_incisor";
	readonly extentLabelRu: string;
	readonly isGeneralized: boolean;
	readonly hasSuppuration: boolean;
}

export interface AapClassificationOptions {
	readonly patientAgeYears?: number | undefined;
	readonly radiographicBoneLossPercent?: number | undefined;
	readonly smokingStatus?: SmokingStatus | undefined;
	readonly diabetesStatus?: DiabetesStatus | undefined;
}

/**
 * Evaluates Periodontitis Staging and Grading according to AAP/EFP 2018 World Workshop criteria.
 */
export function calculateAapEfpStagingAndGrading(
	teeth: readonly PerioToothRecord[],
	summary?: PerioChartSummary,
	options?: AapClassificationOptions,
): PeriodontalDiagnosisDetail {
	const currentSummary =
		summary ?? calculatePerioIndices(teeth as PerioToothRecord[]);
	const activeTeeth = teeth.filter((t) => !t.isMissing);
	const examinedTeethCount = activeTeeth.length;
	const missingTeethCount = teeth.filter((t) => t.isMissing).length;

	const age = options?.patientAgeYears ?? 45;
	const boneLoss =
		options?.radiographicBoneLossPercent ??
		estimateBoneLossPercentFromTeeth(teeth, currentSummary.maxCalMm);
	const blAgeRatio = calculateBoneLossAgeRatio(boneLoss, age);

	const smoking: SmokingStatus = options?.smokingStatus ?? "non_smoker";
	const diabetes: DiabetesStatus = options?.diabetesStatus ?? "none";

	// 1. Calculate Staging (Severity & Extent)
	let teethWithAttachmentLoss = 0;
	let teethWithSevereLoss = 0;
	let teethWithModerateLoss = 0;

	for (const tooth of activeTeeth) {
		let maxToothCal = 0;
		let maxToothPd = 0;
		let hasLoss = false;

		const sites = [
			tooth.distoBuccal,
			tooth.midBuccal,
			tooth.mesioBuccal,
			tooth.distoLingual,
			tooth.midLingual,
			tooth.mesioLingual,
		];

		for (const s of sites) {
			const cal = calculateClinicalAttachmentLevel(s.probingDepthMm, s.gingivalMarginMm);
			if (cal > maxToothCal) maxToothCal = cal;
			if (s.probingDepthMm > maxToothPd) maxToothPd = s.probingDepthMm;
			if (s.probingDepthMm >= 4 || s.gingivalMarginMm > 0) {
				hasLoss = true;
			}
		}

		if (hasLoss || (tooth.furcation && tooth.furcation > 0) || (tooth.mobility && tooth.mobility > 0)) {
			teethWithAttachmentLoss++;
		}
		if (maxToothCal >= 5 || maxToothPd >= 7 || (tooth.furcation && tooth.furcation >= 2)) {
			teethWithSevereLoss++;
		} else if (maxToothCal >= 3 || maxToothPd >= 5 || (tooth.furcation && tooth.furcation === 1)) {
			teethWithModerateLoss++;
		}
	}

	const isGeneralized = examinedTeethCount > 0
		? (teethWithAttachmentLoss / examinedTeethCount) >= 0.3
		: false;

	const extent: "localized" | "generalized" = isGeneralized ? "generalized" : "localized";
	const extentLabelRu = isGeneralized ? "генерализованный" : "локализованный";
	const hasSuppuration = currentSummary.sitesWithSuppurationCount > 0;

	// 2. Calculate Grading (Rate of Progression)
	// Base grade by BL/Age ratio:
	let baseGrade: AapGrade = "grade_a";
	if (blAgeRatio > 1.0) {
		baseGrade = "grade_c";
	} else if (blAgeRatio >= 0.5) {
		baseGrade = "grade_b";
	}

	// Grade Modifiers (Smoking & Diabetes shift grade up):
	let finalGrade: AapGrade = baseGrade;
	if (smoking === "heavy" || diabetes === "uncontrolled") {
		finalGrade = "grade_c";
	} else if ((smoking === "light" || diabetes === "controlled") && finalGrade === "grade_a") {
		finalGrade = "grade_b";
	}

	const gradeRu: Record<AapGrade, string> = {
		grade_a: "Грейд A (медленное прогрессирование)",
		grade_b: "Грейд B (умеренное прогрессирование)",
		grade_c: "Грейд C (быстрое прогрессирование)",
	};

	// 3. Clinical Health vs Gingivitis vs Periodontitis Stages
	if (teethWithAttachmentLoss === 0 && currentSummary.maxPocketDepthMm <= 3) {
		if (currentSummary.fmbsPercent > 10) {
			return {
				icd10Code: "K05.1",
				diagnosisNameRu: "Хронический простой (катаральный) гингивит, индуцированный биопленкой",
				stageDescriptionRu: `Гингивит без потери прикрепления (BOP: ${currentSummary.fmbsPercent}%, глубина зондирования ≤ 3 мм, CAL = 0 мм)`,
				severity: "gingivitis",
				aapStage: "gingivitis",
				aapGrade: finalGrade,
				extent,
				extentLabelRu,
				isGeneralized,
				hasSuppuration,
			};
		}
		return {
			icd10Code: "Z01.2",
			diagnosisNameRu: "Клинически здоровый интактный пародонт",
			stageDescriptionRu: "Пародонт в норме (BOP ≤ 10%, глубина зондирования ≤ 3 мм, CAL = 0 мм)",
			severity: "intact",
			aapStage: "health",
			aapGrade: "grade_a",
			extent: "localized",
			extentLabelRu: "локализованный",
			isGeneralized: false,
			hasSuppuration: false,
		};
	}

	// Stage IV (Advanced periodontitis with extensive tooth loss / bite collapse):
	if (
		(currentSummary.maxPocketDepthMm >= 7 || teethWithSevereLoss >= 2) &&
		(missingTeethCount >= 5 || currentSummary.teethWithMobilityCount >= 3)
	) {
		const acuteNote = hasSuppuration ? " в фазе обострения (гноетечение)" : "";
		return {
			icd10Code: "K05.33",
			diagnosisNameRu: `Хронический ${extentLabelRu} пародонтит тяжелой степени (Стадия IV, ${gradeRu[finalGrade]})${acuteNote}`,
			stageDescriptionRu: `Стадия IV (угроза потери зубных рядов): CAL макс = ${currentSummary.maxCalMm} мм, PD макс = ${currentSummary.maxPocketDepthMm} мм, отсутствующих зубов: ${missingTeethCount}, BL/Age: ${blAgeRatio}`,
			severity: "severe",
			aapStage: "stage_4",
			aapGrade: finalGrade,
			extent,
			extentLabelRu,
			isGeneralized,
			hasSuppuration,
		};
	}

	// Stage III (Severe periodontitis):
	if (
		currentSummary.maxPocketDepthMm >= 6 ||
		currentSummary.maxCalMm >= 5 ||
		teethWithSevereLoss >= 2 ||
		currentSummary.teethWithFurcationCount >= 2 ||
		currentSummary.teethWithMobilityCount >= 2
	) {
		const acuteNote = hasSuppuration ? " в фазе обострения (гноетечение)" : "";
		return {
			icd10Code: "K05.33",
			diagnosisNameRu: `Хронический ${extentLabelRu} пародонтит тяжелой степени (Стадия III, ${gradeRu[finalGrade]})${acuteNote}`,
			stageDescriptionRu: `Стадия III (глубокая деструкция): CAL макс = ${currentSummary.maxCalMm} мм, PD макс = ${currentSummary.maxPocketDepthMm} мм, участков ≥ 5мм: ${currentSummary.deepPocketsCount}, BL/Age: ${blAgeRatio}`,
			severity: "severe",
			aapStage: "stage_3",
			aapGrade: finalGrade,
			extent,
			extentLabelRu,
			isGeneralized,
			hasSuppuration,
		};
	}

	// Stage II (Moderate periodontitis):
	if (
		currentSummary.maxCalMm >= 3 ||
		currentSummary.maxPocketDepthMm >= 5 ||
		currentSummary.teethWithFurcationCount >= 1 ||
		currentSummary.teethWithMobilityCount >= 1
	) {
		const acuteNote = hasSuppuration ? " в фазе обострения (гноетечение)" : "";
		return {
			icd10Code: "K05.32",
			diagnosisNameRu: `Хронический ${extentLabelRu} пародонтит средней степени тяжести (Стадия II, ${gradeRu[finalGrade]})${acuteNote}`,
			stageDescriptionRu: `Стадия II (умеренная потеря прикрепления): CAL макс = ${currentSummary.maxCalMm} мм, PD макс = ${currentSummary.maxPocketDepthMm} мм, BL/Age: ${blAgeRatio}`,
			severity: "moderate",
			aapStage: "stage_2",
			aapGrade: finalGrade,
			extent,
			extentLabelRu,
			isGeneralized,
			hasSuppuration,
		};
	}

	// Stage I (Initial periodontitis):
	const icd = isGeneralized ? "K05.31" : "K05.30";
	return {
		icd10Code: icd,
		diagnosisNameRu: `Хронический ${extentLabelRu} пародонтит легкой степени (Стадия I, ${gradeRu[finalGrade]})`,
		stageDescriptionRu: `Стадия I (начальная потеря прикрепления): CAL макс = ${currentSummary.maxCalMm} мм, PD макс = ${currentSummary.maxPocketDepthMm} мм, BL/Age: ${blAgeRatio}`,
		severity: "mild",
		aapStage: "stage_1",
		aapGrade: finalGrade,
		extent,
		extentLabelRu,
		isGeneralized,
		hasSuppuration,
	};
}

/**
 * Backward compatibility alias for derivePeriodontalDiagnosis.
 */
export function derivePeriodontalDiagnosis(
	teeth: readonly PerioToothRecord[],
	summary?: PerioChartSummary,
	options?: AapClassificationOptions,
): PeriodontalDiagnosisDetail {
	return calculateAapEfpStagingAndGrading(teeth, summary, options);
}
