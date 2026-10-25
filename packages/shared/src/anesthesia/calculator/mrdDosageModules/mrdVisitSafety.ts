/**
 * @dental/shared/anesthesia/calculator/mrdDosageModules/mrdVisitSafety.ts
 * Visit Anesthesia Safety & Maximum Recommended Dose Evaluation (Mandate 8b, <= 120 lines)
 */

import { ANESTHESIA_DRUGS, CARDIO_LIMIT_BADGE_TEXT } from "../drugCatalog.js";
import { checkAnesthesiaSomaticContraindications, resolveClinicalDefaultWeightKg } from "../somaticRiskAdjuster.js";
import type { AnesthesiaSafetyLevel, AnesthesiaSafetyParams, VisitAnesthesiaCalculationResult } from "../types.js";

export function calculateVisitAnesthesiaSafety(params: AnesthesiaSafetyParams): VisitAnesthesiaCalculationResult {
	const drug = ANESTHESIA_DRUGS[params.drugKey] ?? ANESTHESIA_DRUGS.ultracain_ds;
	const isPediatric = Boolean(params.isPediatric || (params.patientAgeYears != null && params.patientAgeYears < 18));
	const weight = resolveClinicalDefaultWeightKg(params.patientWeightKg, params.patientAgeYears, isPediatric);
	const carpules = Math.max(0, Number.isFinite(params.carpulesCount) ? params.carpulesCount : 1);
	const effectiveMaxMgPerKg = isPediatric && drug.maxDoseMgPerKgPediatric ? drug.maxDoseMgPerKgPediatric : drug.maxDoseMgPerKg;

	const totalVolumeMl = params.customVolumeMl && params.customVolumeMl > 0
		? Math.round(params.customVolumeMl * 100) / 100
		: Math.round(carpules * drug.volumeMlPerCarpule * 100) / 100;

	const totalDoseMg = Math.round(totalVolumeMl * (drug.concentrationPct * 10) * 10) / 10;
	const weightLimitMg = Math.round(weight * effectiveMaxMgPerKg * 10) / 10;
	let maxSafeDoseMg = isPediatric ? weightLimitMg : Math.min(weightLimitMg, drug.absoluteMaxDoseMg);
	let maxSafeCarpules = drug.mgPerCarpule > 0 ? Math.floor((maxSafeDoseMg / drug.mgPerCarpule) * 10) / 10 : 0;

	const crossCheck = checkAnesthesiaSomaticContraindications({ drugKey: drug.key, somaticProfile: params.somaticProfile, carpulesCount: carpules });
	const hasCardio = Boolean(params.somaticProfile?.hasCardiovascularRisk || params.somaticProfile?.hasHypertension || params.somaticProfile?.hasIhd || params.somaticProfile?.hasArrhythmia);

	let isCardioRestricted = false;
	if (hasCardio && !drug.isAdrenalineFree && crossCheck.maxCardioCarpules !== null) {
		isCardioRestricted = true;
		if (crossCheck.maxCardioCarpules < maxSafeCarpules) {
			maxSafeCarpules = crossCheck.maxCardioCarpules;
			maxSafeDoseMg = Math.min(maxSafeDoseMg, Math.round(maxSafeCarpules * drug.mgPerCarpule * 10) / 10);
		}
	}

	const maxSafeVolumeMl = Math.round(maxSafeCarpules * drug.volumeMlPerCarpule * 100) / 100;
	const doseRatio = maxSafeDoseMg > 0 ? totalDoseMg / maxSafeDoseMg : 0;
	const epiRatio = crossCheck.maxSafeEpinephrineMg > 0 && crossCheck.totalEpinephrineMg > 0
		? crossCheck.totalEpinephrineMg / crossCheck.maxSafeEpinephrineMg
		: 0;

	const safetyRatio = Math.max(doseRatio, epiRatio);
	const safetyPercentage = Math.round(safetyRatio * 100);

	let safetyLevel: AnesthesiaSafetyLevel = "safe";
	let warningMessage: string | null = null;
	const dangerAlert = crossCheck.alerts.find((a) => a.severity === "danger");
	const warningAlert = crossCheck.alerts.find((a) => a.severity === "warning");
	const cautionAlert = crossCheck.alerts.find((a) => a.severity === "caution");

	if (safetyRatio >= 1.0) {
		safetyLevel = "danger";
		warningMessage = epiRatio >= 1.0 && hasCardio
			? `Превышен кардиологический лимит адреналина (${crossCheck.totalEpinephrineMg} мг / макс. ${crossCheck.maxSafeEpinephrineMg} мг, кардиологический порог)!`
			: `Превышена максимально допустимая доза (${totalDoseMg} мг / макс. ${maxSafeDoseMg} мг)!`;
	} else if (dangerAlert) {
		safetyLevel = "danger";
		warningMessage = dangerAlert.message;
	} else if (warningAlert) {
		safetyLevel = "warning";
		warningMessage = warningAlert.message;
	} else if (safetyRatio >= 0.8) {
		safetyLevel = "warning";
		warningMessage = `Введено ${safetyPercentage}% от лимита (${totalDoseMg} мг / ${maxSafeDoseMg} мг).`;
	} else if (cautionAlert) {
		safetyLevel = "caution";
		warningMessage = cautionAlert.message;
	}

	return {
		drug, patientWeightKg: weight, isPediatric, effectiveMaxMgPerKg, carpulesCount: carpules,
		totalVolumeMl, totalDoseMg, maxSafeDoseMg, maxSafeVolumeMl, maxSafeCarpules,
		mrdDoseMg: maxSafeDoseMg, mrdVolumeMl: maxSafeVolumeMl, mrdCarpules: maxSafeCarpules,
		totalEpinephrineMg: crossCheck.totalEpinephrineMg, maxSafeEpinephrineMg: crossCheck.maxSafeEpinephrineMg,
		safetyRatio, safetyLevel, safetyPercentage, warningMessage, somaticProfile: params.somaticProfile,
		somaticAlerts: crossCheck.alerts, recommendedDrugKey: crossCheck.recommendedDrugKey, isCardioRestricted,
		cardioLimitBadgeText: isCardioRestricted ? CARDIO_LIMIT_BADGE_TEXT : null,
		cardioLimitDetails: isCardioRestricted ? crossCheck.cardioLimitDetails : null,
	};
}
