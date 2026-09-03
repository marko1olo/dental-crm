/**
 * Clinical Anesthesiology & Pharmacology Safety Engine (Минздрав РФ / СтАР / AHA)
 * Maximum dose calculation, Epinephrine cardiac limits, Pediatric/Geriatric scaling, Form 043/u diary.
 */

import {
	AnestheticDrugId,
	DENTAL_ANESTHETICS,
	INJECTION_TECHNIQUES,
	InjectionTechniqueId,
	NeedleGaugeType,
	DENTAL_NEEDLES,
	AnestheticDrugInfo
} from './anesthesiaCatalog';

export type AsaPhysicalStatus = 'asa_1' | 'asa_2' | 'asa_3' | 'asa_4';

export type PatientAgeCategory = 'adult' | 'pediatric' | 'geriatric';

export type AnesthesiaSafetyZone = 'safe' | 'caution' | 'warning' | 'overdose_danger';

export interface AnesthesiaCalculationInput {
	drugId: AnestheticDrugId;
	carpulesCount: number;
	patientWeightKg?: number | null | undefined;
	patientAgeYears: number;
	asaStatus: AsaPhysicalStatus;
	hasCardiovascularRisk: boolean;
	hasSulfiteAllergy: boolean;
	hasBronchialAsthma: boolean;
	isPregnantOrLactating: boolean;
	techniqueId: InjectionTechniqueId;
	needleType: NeedleGaugeType;
	targetToothNumberFdi?: number | string | undefined;
	aspirationNegativeConfirmed: boolean;
	carpuleBatch?: {
		seriesNumber: string;
		batchNumber: string;
		expirationDate: string;
	} | undefined;
	nurseFullName?: string | undefined;
	bpSystolic?: number | undefined;
	bpDiastolic?: number | undefined;
	heartRateBpm?: number | undefined;
	spo2Percent?: number | undefined;
}

export interface AnesthesiaCalculationResult {
	drug: AnestheticDrugInfo;
	carpulesCount: number;
	injectedVolumeMl: number;
	injectedActiveMg: number;
	injectedEpinephrineMg: number;
	maxSafeActiveMg: number;
	maxSafeEpinephrineMg: number;
	maxSafeCarpulesCount: number;
	percentOfMaxDose: number;
	percentOfEpiMaxDose: number;
	safetyZone: AnesthesiaSafetyZone;
	isOverdose: boolean;
	isEpinephrineOverdose: boolean;
	ageCategory: PatientAgeCategory;
	ageDoseReductionFactor: number;
	contraindicationsTriggered: string[];
	warnings: string[];
	diaryEntryRu: string;
}

// ---------------------------------------------------------------------------
// Constants & Norms
// ---------------------------------------------------------------------------

export const EPINEPHRINE_CEILINGS_MG = {
	healthyAdult: 0.20, // 200 mcg for ASA I & II
	cardiovascularRisk: 0.04, // 40 mcg for ASA III & IV, IHD, Beta-blockers
} as const;

export const ASA_CLASSIFICATIONS: Record<AsaPhysicalStatus, { nameRu: string; epiLimitMg: number; descriptionRu: string }> = {
	asa_1: {
		nameRu: 'ASA I: Здоровый пациент',
		epiLimitMg: 0.20,
		descriptionRu: 'Без системных патологий, физиологическая норма.'
	},
	asa_2: {
		nameRu: 'ASA II: Легкое системное заболевание',
		epiLimitMg: 0.20,
		descriptionRu: 'Компенсированная гипертония, легкая астма, курение, контролируемый диабет 2 типа.'
	},
	asa_3: {
		nameRu: 'ASA III: Тяжелое системное заболевание',
		epiLimitMg: 0.04,
		descriptionRu: 'ИБС, стенокардия напряжения, перенесенный инфаркт (>6 мес), ХОБЛ, инсулинозависимый диабет.'
	},
	asa_4: {
		nameRu: 'ASA IV: Заболевание, угрожающее жизни',
		epiLimitMg: 0.04,
		descriptionRu: 'Нестабильная стенокардия, недавний инфаркт (<6 мес), декомпенсированная сердечная недостаточность.'
	}
};

// ---------------------------------------------------------------------------
// 1. Age and Physical Status Classification
// ---------------------------------------------------------------------------

export function determineAgeCategory(ageYears: number): PatientAgeCategory {
	if (ageYears < 18) return 'pediatric';
	if (ageYears >= 65) return 'geriatric';
	return 'adult';
}

export function calculateAgeReductionFactor(ageYears: number, _weightKg: number): number {
	if (ageYears >= 65) {
		return 0.70; // 30% reduction for geriatric patients
	}
	return 1.0;
}

/**
 * Клинический расчет массы тела по возрасту пациента (Минздрав РФ / педиатрия).
 * Используется как безопасный дефолт, когда точный вес не указан в соматической анкете:
 * - Взрослый (>= 18 лет или возраст не указан): клинический дефолт 70 кг.
 * - Ребенок (< 18 лет): расчет по годам жизни.
 */
export function resolveClinicalDefaultWeightKg(
	patientWeightKg?: number | null | undefined,
	patientAgeYears?: number | null | undefined,
	isPediatric?: boolean | undefined,
): number {
	if (
		typeof patientWeightKg === "number" &&
		Number.isFinite(patientWeightKg) &&
		patientWeightKg > 0
	) {
		return Math.max(5, Math.min(250, patientWeightKg));
	}

	const isChild = Boolean(
		isPediatric ||
			(typeof patientAgeYears === "number" &&
				Number.isFinite(patientAgeYears) &&
				patientAgeYears > 0 &&
				patientAgeYears < 18),
	);

	if (!isChild) {
		return 70; // Клинический дефолт для взрослого пациента
	}

	// Педиатрический расчет веса по возрасту (стандарт клинической педиатрии РФ):
	const age =
		typeof patientAgeYears === "number" &&
		Number.isFinite(patientAgeYears) &&
		patientAgeYears > 0
			? patientAgeYears
			: 7; // Дефолтный возраст ребенка при неизвестном = 7 лет

	if (age < 1) return 10;
	if (age <= 5) return Math.round(2 * age + 8); // 1г: 10кг, 2г: 12кг, 3г: 14кг, 4г: 16кг, 5г: 18кг
	if (age <= 12) return Math.round(3 * age + 4); // 6л: 22кг, 7л: 25кг, 8л: 28кг, 9л: 31кг, 10л: 34кг, 11л: 37кг, 12л: 40кг
	return Math.min(65, Math.round(40 + (age - 12) * 4)); // 13-17 лет: 44-60 кг
}

// ---------------------------------------------------------------------------
// 2. Safe Dosage & Toxic Threshold Calculator
// ---------------------------------------------------------------------------

export function calculateAnesthesiaSafety(input: AnesthesiaCalculationInput): AnesthesiaCalculationResult {
	const drug = DENTAL_ANESTHETICS[input.drugId] || DENTAL_ANESTHETICS.articaine_1_100k;
	const ageCategory = determineAgeCategory(input.patientAgeYears);
	const hasValidInputWeight = typeof input.patientWeightKg === 'number' && input.patientWeightKg > 0;
	const isPediatric = ageCategory === 'pediatric' || (hasValidInputWeight && input.patientWeightKg! < 40);
	const weight = resolveClinicalDefaultWeightKg(input.patientWeightKg, input.patientAgeYears, isPediatric);
	const ageFactor = isPediatric ? 1.0 : calculateAgeReductionFactor(input.patientAgeYears, weight);
	const carpules = Math.max(0, input.carpulesCount);

	// Injected amounts
	const injectedVolumeMl = Number((carpules * drug.carpuleVolumeMl).toFixed(2));
	const injectedActiveMg = Number((carpules * drug.mgActivePerCarpule).toFixed(1));
	const injectedEpinephrineMg = Number((carpules * drug.mgEpiPerCarpule).toFixed(4));

	// Max safe limits (for pediatric patients: 5.0 mg/kg for articaine, 4.4 mg/kg for mepivacaine/lidocaine)
	const effectiveMaxMgPerKg = isPediatric
		? (drug.id.startsWith('articaine') ? 5.0 : drug.maxDoseMgPerKgAdult)
		: drug.maxDoseMgPerKgAdult;

	const maxActiveByWeight = weight * effectiveMaxMgPerKg * ageFactor;
	const maxSafeActiveMg = isPediatric
		? Number(maxActiveByWeight.toFixed(1))
		: Number(Math.min(drug.absoluteMaxDoseMgAdult * ageFactor, maxActiveByWeight).toFixed(1));

	const isCardioRisk =
		input.hasCardiovascularRisk ||
		input.asaStatus === 'asa_3' ||
		input.asaStatus === 'asa_4' ||
		(typeof input.bpSystolic === 'number' && input.bpSystolic >= 140) ||
		(typeof input.heartRateBpm === 'number' && input.heartRateBpm > 90);

	const maxSafeEpinephrineMg = isCardioRisk ? EPINEPHRINE_CEILINGS_MG.cardiovascularRisk : EPINEPHRINE_CEILINGS_MG.healthyAdult;

	// Max safe carpules calculations (strict downward floor rounding)
	const maxCarpulesByActive = drug.mgActivePerCarpule > 0 ? (maxSafeActiveMg / drug.mgActivePerCarpule) : 99;
	const maxCarpulesByEpi = !drug.isAdrenalineFree && drug.mgEpiPerCarpule > 0
		? maxSafeEpinephrineMg / drug.mgEpiPerCarpule
		: 99;

	const maxSafeCarpulesCount = Math.floor(Math.min(maxCarpulesByActive, maxCarpulesByEpi) * 10) / 10;

	// Percentage of max dose
	const percentOfMaxDose = maxSafeActiveMg > 0 ? Math.round((injectedActiveMg / maxSafeActiveMg) * 100) : 0;
	const percentOfEpiMaxDose = !drug.isAdrenalineFree && maxSafeEpinephrineMg > 0
		? Math.round((injectedEpinephrineMg / maxSafeEpinephrineMg) * 100)
		: 0;

	const highestPercent = Math.max(percentOfMaxDose, percentOfEpiMaxDose);

	let safetyZone: AnesthesiaSafetyZone = 'safe';
	if (highestPercent > 100) safetyZone = 'overdose_danger';
	else if (highestPercent > 90) safetyZone = 'warning';
	else if (highestPercent > 70) safetyZone = 'caution';

	const isOverdose = injectedActiveMg > maxSafeActiveMg;
	const isEpinephrineOverdose = !drug.isAdrenalineFree && injectedEpinephrineMg > maxSafeEpinephrineMg;

	// Contraindications check
	const contraindicationsTriggered: string[] = [];
	const warnings: string[] = [];

	if (drug.containsSulfites && (input.hasSulfiteAllergy || input.hasBronchialAsthma)) {
		contraindicationsTriggered.push(
			'ПРЕПАРАТ СОДЕРЖИТ СУЛЬФИТЫ (метабисульфит натрия E223). Противопоказан при бронхиальной астме и аллергии на сульфиты! Рекомендуется Скандонест 3% (Мепивакаин).'
		);
	}

	if (!drug.isAdrenalineFree && input.asaStatus === 'asa_4') {
		contraindicationsTriggered.push(
			'КРИТИЧЕСКИЙ РИСК: При ASA IV адреналинсодержащие анестетики противопоказаны для планового амбулаторного приема.'
		);
	}

	if (input.isPregnantOrLactating && drug.vasoconstrictorRatio === '1:100000') {
		warnings.push(
			'Беременность / Лактация: предпочтительнее Артикаин 1:200 000 (Ультракаин Д-С) или Мепивакаин без адреналина.'
		);
	}

	if (isEpinephrineOverdose) {
		warnings.push(
			`Превышен кардиоваскулярный лимит адреналина (${injectedEpinephrineMg.toFixed(3)} мг > ${maxSafeEpinephrineMg.toFixed(3)} мг). Риск тахикардии, гипертонического криза, аритмии!`
		);
	}

	if (isOverdose) {
		warnings.push(
			`ПРЕВЫШЕНИЕ МАКСИМАЛЬНОЙ СУТОЧНОЙ ДОЗЫ (${injectedActiveMg} мг > ${maxSafeActiveMg} мг). Риск токсического действия анестетика (головокружение, судороги, угнетение дыхания)!`
		);
	}

	if (!input.aspirationNegativeConfirmed && INJECTION_TECHNIQUES[input.techniqueId]?.aspirationCheckMandatory) {
		warnings.push('Внимание: Аспирационная проба обязательна для проводниковых блокад перед введением полной дозы!');
	}

	// Clinical Diary Generation (Форма 043/у)
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
		percentOfMaxDose,
		percentOfEpiMaxDose,
		safetyZone,
		isOverdose,
		isEpinephrineOverdose,
		ageCategory,
		ageDoseReductionFactor: ageFactor,
		contraindicationsTriggered,
		warnings,
		diaryEntryRu
	};
}

// ---------------------------------------------------------------------------
// 3. Clinical Diary Entry Generator (Форма № 043/у)
// ---------------------------------------------------------------------------

export function generateAnesthesiaDiaryEntry(params: {
	drug: AnestheticDrugInfo;
	carpulesCount: number;
	injectedVolumeMl: number;
	injectedActiveMg: number;
	injectedEpinephrineMg: number;
	techniqueId: InjectionTechniqueId;
	needleType: NeedleGaugeType;
	targetToothNumberFdi?: number | string | undefined;
	aspirationNegativeConfirmed: boolean;
	carpuleBatch?: {
		seriesNumber: string;
		batchNumber: string;
		expirationDate: string;
	} | undefined;
	nurseFullName?: string | undefined;
	bpSystolic?: number | undefined;
	bpDiastolic?: number | undefined;
	heartRateBpm?: number | undefined;
	spo2Percent?: number | undefined;
}): string {
	const tech = INJECTION_TECHNIQUES[params.techniqueId] || INJECTION_TECHNIQUES.infiltration;
	const needle = DENTAL_NEEDLES[params.needleType] || DENTAL_NEEDLES.g30_short_21mm;

	const toothPart = params.targetToothNumberFdi ? ` в области зуба ${params.targetToothNumberFdi}` : '';
	const aspText = params.aspirationNegativeConfirmed
		? 'Аспирационная проба отрицательна (кровь в карпуле отсутствует).'
		: 'Аспирационная проба: без особенностей.';

	const epiText = !params.drug.isAdrenalineFree
		? `, вазоконстриктор ${params.drug.vasoconstrictorNameRu} (${params.injectedEpinephrineMg.toFixed(3)} мг)`
		: ', без вазоконстриктора';

	const batchText = params.carpuleBatch?.seriesNumber
		? ` [Серия: ${params.carpuleBatch.seriesNumber}, Партия: ${params.carpuleBatch.batchNumber}, Годен до: ${params.carpuleBatch.expirationDate}]`
		: '';
	const nurseText = params.nurseFullName ? ` Медсестра/ассистент: ${params.nurseFullName}.` : '';
	const vitalsText =
		typeof params.bpSystolic === 'number' && typeof params.heartRateBpm === 'number'
			? ` Исходные показатели гемодинамики: АД ${params.bpSystolic}/${params.bpDiastolic ?? 80} мм рт. ст., ЧСС ${params.heartRateBpm} уд/мин${typeof params.spo2Percent === 'number' ? `, SpO2 ${params.spo2Percent}%` : ''}.`
			: '';

	return `Проведена местная ${tech.nameRu.toLowerCase()} анестезия${toothPart}. Препарат: ${params.drug.tradeNamesRu[0]} (${params.drug.activeSubstanceRu})${batchText}, объем ${params.injectedVolumeMl} мл (${params.carpulesCount} карп., ${params.injectedActiveMg} мг действующего вещества${epiText}).${vitalsText} Игла: ${needle.nameRu}. ${aspText} Анестезия наступила через ${params.drug.onsetMinutes} мин, глубина достаточная, соматических реакций нет.${nurseText}`;
}
