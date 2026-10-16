import { DENTAL_ANESTHETICS } from '../anesthesiaCatalog.js';
import {
	calculateAgeReductionFactor,
	determineAgeCategory,
	resolveClinicalDefaultWeightKg,
} from './anesthesiaAgeClassification.js';
import { generateAnesthesiaDiaryEntry } from './anesthesiaDiaryFormatter.js';
import {
	EPINEPHRINE_CEILINGS_MG,
	type AnesthesiaCalculationInput,
	type AnesthesiaCalculationResult,
	type AnesthesiaSafetyZone,
} from './anesthesiaEngineTypes.js';
import { evaluateSafetyAdvisories } from './anesthesiaSafetyAdvisor.js';

export function calculateAnesthesiaSafety(input: AnesthesiaCalculationInput): AnesthesiaCalculationResult {
	const drug = DENTAL_ANESTHETICS[input.drugId] || DENTAL_ANESTHETICS.articaine_1_100k;
	const ageCategory = determineAgeCategory(input.patientAgeYears);
	const hasValidInputWeight = typeof input.patientWeightKg === 'number' && input.patientWeightKg > 0;
	const isPediatric = ageCategory === 'pediatric' || (hasValidInputWeight && input.patientWeightKg! < 40);
	const weight = resolveClinicalDefaultWeightKg(input.patientWeightKg, input.patientAgeYears, isPediatric);
	const ageFactor = isPediatric ? 1.0 : calculateAgeReductionFactor(input.patientAgeYears, weight);
	const carpules = Math.max(0, input.carpulesCount);

	const injectedVolumeMl = Number((carpules * drug.carpuleVolumeMl).toFixed(2));
	const injectedActiveMg = Number((carpules * drug.mgActivePerCarpule).toFixed(1));
	const injectedEpinephrineMg = Number((carpules * drug.mgEpiPerCarpule).toFixed(4));

	const effectiveMaxMgPerKg = isPediatric
		? drug.id.startsWith('articaine')
			? 5.0
			: drug.maxDoseMgPerKgAdult
		: drug.maxDoseMgPerKgAdult;

	const maxActiveByWeight = weight * effectiveMaxMgPerKg * ageFactor;
	const maxSafeActiveMg = isPediatric
		? Number(maxActiveByWeight.toFixed(1))
		: Number(Math.min(drug.absoluteMaxDoseMgAdult * ageFactor, maxActiveByWeight).toFixed(1));

	const initialCardio =
		input.hasCardiovascularRisk ||
		Boolean(input.hasIschemicHeartDisease) ||
		Boolean(input.hasMyocardialInfarctionHistory) ||
		Boolean(input.hasHypertension) ||
		(typeof input.bpSystolic === 'number' && input.bpSystolic >= 140) ||
		(typeof input.bpDiastolic === 'number' && input.bpDiastolic >= 90) ||
		Boolean(input.hasCardiacArrhythmia) ||
		(typeof input.heartRateBpm === 'number' && input.heartRateBpm > 90) ||
		Boolean(input.takesBetaBlockers) ||
		Boolean(input.takesTricyclicAntidepressants) ||
		input.asaStatus === 'asa_3' ||
		input.asaStatus === 'asa_4';

	const maxSafeEpinephrineMg = initialCardio
		? EPINEPHRINE_CEILINGS_MG.cardiovascularRisk
		: EPINEPHRINE_CEILINGS_MG.healthyAdult;

	const advisory = evaluateSafetyAdvisories(input, drug, {
		injectedActiveMg,
		maxSafeActiveMg,
		injectedEpinephrineMg,
		maxSafeEpinephrineMg,
	});

	const maxCarpulesByActive = drug.mgActivePerCarpule > 0 ? maxSafeActiveMg / drug.mgActivePerCarpule : 99;
	const maxCarpulesByEpi =
		!drug.isAdrenalineFree && drug.mgEpiPerCarpule > 0 ? maxSafeEpinephrineMg / drug.mgEpiPerCarpule : 99;

	const maxSafeCarpulesCount = Math.floor(Math.min(maxCarpulesByActive, maxCarpulesByEpi) * 10) / 10;
	const remainingSafeCarpulesCount = Math.max(0, Math.floor((maxSafeCarpulesCount - carpules) * 10) / 10);

	const percentOfMaxDose = maxSafeActiveMg > 0 ? Math.round((injectedActiveMg / maxSafeActiveMg) * 100) : 0;
	const percentOfEpiMaxDose =
		!drug.isAdrenalineFree && maxSafeEpinephrineMg > 0
			? Math.round((injectedEpinephrineMg / maxSafeEpinephrineMg) * 100)
			: 0;

	const highestPercent = Math.max(percentOfMaxDose, percentOfEpiMaxDose);
	let safetyZone: AnesthesiaSafetyZone = 'safe';
	if (highestPercent > 100) safetyZone = 'overdose_danger';
	else if (highestPercent > 90) safetyZone = 'warning';
	else if (highestPercent > 70) safetyZone = 'caution';

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
		carpuleBatch: input.carpuleBatch,
		nurseFullName: input.nurseFullName,
		bpSystolic: input.bpSystolic,
		bpDiastolic: input.bpDiastolic,
		heartRateBpm: input.heartRateBpm,
		spo2Percent: input.spo2Percent,
		overrideReason: input.overrideReason,
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
		isOverdose: advisory.isOverdose,
		isEpinephrineOverdose: advisory.isEpinephrineOverdose,
		isCardioRisk: advisory.isCardioRisk,
		cardioRiskReasons: advisory.cardioRiskReasons,
		ageCategory,
		ageDoseReductionFactor: ageFactor,
		contraindicationsTriggered: advisory.contraindicationsTriggered,
		warnings: advisory.warnings,
		diaryEntryRu,
	};
}
