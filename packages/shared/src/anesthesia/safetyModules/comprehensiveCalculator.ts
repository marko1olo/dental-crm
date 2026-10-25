/**
 * @dental/shared/anesthesia/safetyModules/comprehensiveCalculator.ts
 * Comprehensive Anesthesia Safety & MRD Engine (Mandate 8b, <= 120 lines)
 */

import { resolveClinicalDefaultWeightKg } from "../calculator.js";
import { ANESTHESIA_DRUG_CATALOG, EPINEPHRINE_CEILINGS_MG } from "../catalog.js";
import type { AnesthesiaCalculationInput, ComprehensiveAnesthesiaCalculationResult } from "../types.js";
import { calculateEffectiveMgPerKg, isGeriatricPatient, isPediatricPatient } from "./ageAndPediatrics.js";
import { screenPatientContraindications } from "./contraindicationsScreen.js";
import { evaluateSafetyZone, generateClinicalAdviceRu, synthesizeAnesthesiaDiaryText } from "./safetyZoneEvaluator.js";

export function calculateComprehensiveAnesthesiaSafety(input: AnesthesiaCalculationInput): ComprehensiveAnesthesiaCalculationResult {
	const activeDrugId = input.drugId || "articaine_4_epi_100k";
	const drug = ANESTHESIA_DRUG_CATALOG[activeDrugId] || ANESTHESIA_DRUG_CATALOG.articaine_4_epi_100k;
	const carpuleVolume = input.carpuleVolumeMl && input.carpuleVolumeMl > 0 ? input.carpuleVolumeMl : drug.standardCarpuleVolumeMl;

	const hasValidWeight = typeof input.patientWeightKg === "number" && Number.isFinite(input.patientWeightKg) && input.patientWeightKg > 0;
	const isPediatric = input.isPediatric ?? isPediatricPatient(input.patientAgeYears, hasValidWeight ? input.patientWeightKg : undefined);
	const isGeriatric = input.isGeriatric ?? isGeriatricPatient(input.patientAgeYears);
	const carpules = Math.max(0, Number.isFinite(input.carpulesCount) ? input.carpulesCount : 1);
	const weight = resolveClinicalDefaultWeightKg(input.patientWeightKg, input.patientAgeYears, isPediatric);
	const { effectiveMgPerKg, ageFactor } = calculateEffectiveMgPerKg(drug, isPediatric, isGeriatric);

	const injectedVolumeMl = Number((carpules * carpuleVolume).toFixed(2));
	const mgActivePerCarpule = Number((carpuleVolume * drug.mgPerMlActive).toFixed(1));
	const mgEpiPerCarpule = Number((carpuleVolume * drug.epinephrineMgPerMl).toFixed(4));
	const injectedActiveMg = Number((carpules * mgActivePerCarpule).toFixed(1));
	const injectedEpinephrineMg = Number((carpules * mgEpiPerCarpule).toFixed(4));

	const weightBasedMaxActiveMg = Number((weight * effectiveMgPerKg).toFixed(1));
	const absoluteCapMg = Number((drug.absoluteMaxDoseMgAdult * ageFactor).toFixed(1));
	const maxSafeActiveMg = Math.min(weightBasedMaxActiveMg, absoluteCapMg);
	const isCardioRestricted = Boolean(
		input.hasCardiovascularRisk || input.hasHypertension || input.hasCardiacArrhythmia ||
		(typeof input.bpSystolic === "number" && input.bpSystolic >= 140) ||
		(typeof input.heartRateBpm === "number" && input.heartRateBpm > 90) ||
		input.takesTricyclicAntidepressants || input.asaStatus === "asa_3" || input.asaStatus === "asa_4",
	);
	const maxSafeEpinephrineMg = isCardioRestricted ? EPINEPHRINE_CEILINGS_MG.cardiovascularGate : EPINEPHRINE_CEILINGS_MG.healthyAdult;

	const maxCarpulesByActive = mgActivePerCarpule > 0 ? Number((maxSafeActiveMg / mgActivePerCarpule).toFixed(1)) : 0;
	const maxCarpulesByEpi = (!drug.isAdrenalineFree && mgEpiPerCarpule > 0) ? Number((maxSafeEpinephrineMg / mgEpiPerCarpule).toFixed(1)) : 999;
	const maxSafeCarpulesCount = Math.min(maxCarpulesByActive, maxCarpulesByEpi);
	const maxSafeVolumeMl = Number((maxSafeCarpulesCount * carpuleVolume).toFixed(2));

	const remainingSafeActiveMg = Math.max(0, Number((maxSafeActiveMg - injectedActiveMg).toFixed(1)));
	const remainingSafeEpinephrineMg = drug.isAdrenalineFree ? 0 : Math.max(0, Number((maxSafeEpinephrineMg - injectedEpinephrineMg).toFixed(4)));
	const remainingSafeCarpulesCount = Math.max(0, Number((maxSafeCarpulesCount - carpules).toFixed(1)));

	const percentOfMaxDose = maxSafeActiveMg > 0 ? Math.round((injectedActiveMg / maxSafeActiveMg) * 100) : 0;
	const percentOfEpiMaxDose = (!drug.isAdrenalineFree && maxSafeEpinephrineMg > 0) ? Math.round((injectedEpinephrineMg / maxSafeEpinephrineMg) * 100) : 0;
	const peakUtilizationPercent = Math.max(percentOfMaxDose, percentOfEpiMaxDose);

	const isOverdose = injectedActiveMg > maxSafeActiveMg;
	const isEpinephrineOverdose = !drug.isAdrenalineFree && injectedEpinephrineMg > maxSafeEpinephrineMg;

	const screening = screenPatientContraindications(input, activeDrugId);
	const safetyZone = evaluateSafetyZone(screening.isBlocked, isOverdose, isEpinephrineOverdose, peakUtilizationPercent);

	let limitingFactor = `Масса тела (${weight} кг × ${effectiveMgPerKg} мг/кг)`;
	if (weightBasedMaxActiveMg > absoluteCapMg) {
		limitingFactor = `Абсолютный максимум для взрослых (${absoluteCapMg} мг)`;
	}
	if (isCardioRestricted && !drug.isAdrenalineFree && maxCarpulesByEpi < maxCarpulesByActive) {
		limitingFactor = `Кардиологический лимит адреналина (≤ 0.04 мг / макс ${maxCarpulesByEpi} карп.)`;
	}
	if (isPediatric) {
		limitingFactor = `Педиатрический норматив (${weight} кг × ${effectiveMgPerKg} мг/кг)`;
	}

	const allWarnings = [...screening.warnings];
	if (isOverdose) allWarnings.unshift(`ПРЕВЫШЕНА ПРЕДЕЛЬНО ДОПУСТИМАЯ ДОЗА (${injectedActiveMg} мг > ${maxSafeActiveMg} мг / ${maxSafeCarpulesCount} карп.).`);
	if (isEpinephrineOverdose) allWarnings.unshift(`ПРЕВЫШЕН КАРДИОЛИМИТ АДРЕНАЛИНА (${injectedEpinephrineMg.toFixed(3)} мг > ${maxSafeEpinephrineMg.toFixed(2)} мг).`);

	const clinicalAdviceRu = generateClinicalAdviceRu(safetyZone, screening.isBlocked, percentOfMaxDose);
	const soapDiaryText = synthesizeAnesthesiaDiaryText({
		input, drug, carpules, injectedVolumeMl, injectedActiveMg, injectedEpinephrineMg,
		weight, maxSafeActiveMg, maxSafeCarpulesCount, effectiveMaxMgPerKg: effectiveMgPerKg, isCardioRestricted, isPediatric,
	});

	const isSevereHypertension = (typeof input.bpSystolic === "number" && input.bpSystolic >= 160) || (typeof input.bpDiastolic === "number" && input.bpDiastolic >= 100);

	return {
		drug, carpulesCount: carpules, carpuleVolumeMl: carpuleVolume, injectedVolumeMl, injectedActiveMg, injectedEpinephrineMg,
		maxSafeActiveMg, maxSafeEpinephrineMg, maxSafeCarpulesCount, maxSafeVolumeMl, remainingSafeActiveMg, remainingSafeEpinephrineMg,
		remainingSafeCarpulesCount, percentOfMaxDose, percentOfEpiMaxDose, peakUtilizationPercent, effectiveMaxMgPerKg: effectiveMgPerKg,
		isPediatric, isGeriatric, ageReductionFactor: ageFactor, safetyZone, isOverdose, isEpinephrineOverdose, isBlocked: screening.isBlocked,
		limitingFactor, blockingContraindications: screening.blockingContraindications, warnings: allWarnings,
		recommendedAlternativeId: screening.recommendedAlternativeId, recommendedAlternativeKey: screening.recommendedAlternativeId,
		clinicalAdviceRu, soapDiaryText, carpuleBatch: input.carpuleBatch,
		vitalsSafety: { bpSystolic: input.bpSystolic, bpDiastolic: input.bpDiastolic, heartRateBpm: input.heartRateBpm, spo2Percent: input.spo2Percent, isHemodynamicallyStable: !isSevereHypertension },
	};
}
