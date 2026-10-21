import { DENTAL_ANESTHETICS } from "../anesthesiaCatalog.js";
import {
	calculateAgeReductionFactor,
	determineAgeCategory,
	resolveClinicalDefaultWeightKg,
} from "./anesthesiaAgeClassification.js";
import { generateAnesthesiaDiaryEntry } from "./anesthesiaDiaryFormatter.js";
import {
	calculateCarpuleLimits,
	calculateMaxSafeActiveMg,
	determineSafetyZone,
	resolveMaxSafeEpinephrineMg,
} from "./anesthesiaDoseLimits.js";
import type {
	AnesthesiaCalculationInput,
	AnesthesiaCalculationResult,
} from "./anesthesiaEngineTypes.js";
import { evaluateSafetyAdvisories } from "./anesthesiaSafetyAdvisor.js";

export function calculateAnesthesiaSafety(
	input: AnesthesiaCalculationInput,
): AnesthesiaCalculationResult {
	const drug =
		DENTAL_ANESTHETICS[input.drugId] || DENTAL_ANESTHETICS.articaine_1_100k;
	const ageCategory = determineAgeCategory(input.patientAgeYears);
	const hasValidInputWeight =
		typeof input.patientWeightKg === "number" && input.patientWeightKg > 0;
	const isPediatric =
		ageCategory === "pediatric" ||
		(hasValidInputWeight && (input.patientWeightKg ?? 0) < 40);
	const weight = resolveClinicalDefaultWeightKg(
		input.patientWeightKg,
		input.patientAgeYears,
		isPediatric,
	);
	const ageFactor = isPediatric
		? 1.0
		: calculateAgeReductionFactor(input.patientAgeYears, weight);
	const carpules = Math.max(0, input.carpulesCount);

	const injectedVolumeMl = Number((carpules * drug.carpuleVolumeMl).toFixed(2));
	const injectedActiveMg = Number(
		(carpules * drug.mgActivePerCarpule).toFixed(1),
	);
	const injectedEpinephrineMg = Number(
		(carpules * drug.mgEpiPerCarpule).toFixed(4),
	);

	const maxSafeActiveMg = calculateMaxSafeActiveMg(
		drug,
		weight,
		isPediatric,
		ageFactor,
	);
	const maxSafeEpinephrineMg = resolveMaxSafeEpinephrineMg(input);

	const advisory = evaluateSafetyAdvisories(input, drug, {
		injectedActiveMg,
		maxSafeActiveMg,
		injectedEpinephrineMg,
		maxSafeEpinephrineMg,
	});

	const { maxSafeCarpulesCount, remainingSafeCarpulesCount } =
		calculateCarpuleLimits(
			drug,
			maxSafeActiveMg,
			maxSafeEpinephrineMg,
			carpules,
		);

	const percentOfMaxDose =
		maxSafeActiveMg > 0
			? Math.round((injectedActiveMg / maxSafeActiveMg) * 100)
			: 0;
	const percentOfEpiMaxDose =
		!drug.isAdrenalineFree && maxSafeEpinephrineMg > 0
			? Math.round((injectedEpinephrineMg / maxSafeEpinephrineMg) * 100)
			: 0;

	const safetyZone = determineSafetyZone(percentOfMaxDose, percentOfEpiMaxDose);

	const diaryEntryRu = generateAnesthesiaDiaryEntry({
		drug,
		carpulesCount: carpules,
		injectedVolumeMl,
		injectedActiveMg,
		injectedEpinephrineMg,
		techniqueId: input.techniqueId,
		needleType: input.needleType,
		targetToothNumberFdi: input.targetToothNumberFdi,
		aspirationNegativeConfirmed: input.aspirationNegativeConfirmed,
		isOverdose: advisory.isOverdose,
		isEpinephrineOverdose: advisory.isEpinephrineOverdose,
	});

	return {
		drug,
		carpulesCount: carpules,
		injectedVolumeMl,
		injectedActiveMg,
		injectedEpinephrineMg,
		maxSafeActiveMg,
		maxSafeEpinephrineMg,
		maxSafeCarpulesCount,
		remainingSafeCarpulesCount,
		percentOfMaxDose,
		percentOfEpiMaxDose,
		safetyZone,
		...advisory,
		ageCategory,
		ageDoseReductionFactor: ageFactor,
		diaryEntryRu,
	};
}
