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
	hasHypertension?: boolean | undefined;
	hasCardiacArrhythmia?: boolean | undefined;
	hasIschemicHeartDisease?: boolean | undefined;
	hasMyocardialInfarctionHistory?: boolean | undefined;
	takesBetaBlockers?: boolean | undefined;
	takesTricyclicAntidepressants?: boolean | undefined;
	takesMaoInhibitors?: boolean | undefined;
	hasThyrotoxicosis?: boolean | undefined;
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
	overrideReason?: string | undefined;
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
	remainingSafeCarpulesCount: number;
	percentOfMaxDose: number;
	percentOfEpiMaxDose: number;
	safetyZone: AnesthesiaSafetyZone;
	isOverdose: boolean;
	isEpinephrineOverdose: boolean;
	isCardioRisk: boolean;
	cardioRiskReasons: string[];
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

export function calculateAgeReductionFactor(ageYears: number, weightKg?: number): number {
	if (ageYears < 18 && typeof weightKg === "number" && weightKg > 0) {
		return Math.min(1.0, Number((weightKg / 70).toFixed(2)));
	}
	if (ageYears >= 65) {
		return 0.70; // 30% reduction for geriatric patients
	}
	return 1.0;
}

import { resolveClinicalDefaultWeightKg } from "@dental/shared";
export { resolveClinicalDefaultWeightKg };

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

	// Comprehensive Cardiovascular and Somatic Risk Evaluation
	const cardioRiskReasons: string[] = [];
	if (input.hasCardiovascularRisk) cardioRiskReasons.push("сердечно-сосудистая патология");
	if (input.hasIschemicHeartDisease) cardioRiskReasons.push("ИБС");
	if (input.hasMyocardialInfarctionHistory) cardioRiskReasons.push("инфаркт миокарда в анамнезе");
	if (input.hasHypertension) cardioRiskReasons.push("артериальная гипертония II-III ст.");
	if (typeof input.bpSystolic === 'number' && input.bpSystolic >= 140) cardioRiskReasons.push(`систолическая гипертензия (АД ${input.bpSystolic} мм рт. ст.)`);
	if (typeof input.bpDiastolic === 'number' && input.bpDiastolic >= 90) cardioRiskReasons.push(`диастолическая гипертензия (ДАД ${input.bpDiastolic} мм рт. ст.)`);
	if (input.hasCardiacArrhythmia) cardioRiskReasons.push("нарушения сердечного ритма");
	if (typeof input.heartRateBpm === 'number' && input.heartRateBpm > 90) cardioRiskReasons.push(`тахикардия (ЧСС ${input.heartRateBpm} уд/мин)`);
	if (input.takesBetaBlockers) cardioRiskReasons.push("прием бета-блокаторов");
	if (input.takesTricyclicAntidepressants) cardioRiskReasons.push("прием трициклических антидепрессантов (ТЦА)");
	if (input.asaStatus === 'asa_3') cardioRiskReasons.push("статус ASA III");
	if (input.asaStatus === 'asa_4') cardioRiskReasons.push("статус ASA IV");

	const isCardioRisk = cardioRiskReasons.length > 0;

	// Epinephrine limits: 0.04 mg for cardio risk / beta-blockers / ASA III-IV; 0.20 mg for healthy adult
	const maxSafeEpinephrineMg = isCardioRisk ? EPINEPHRINE_CEILINGS_MG.cardiovascularRisk : EPINEPHRINE_CEILINGS_MG.healthyAdult;

	// Max safe carpules calculations (strict downward floor rounding)
	const maxCarpulesByActive = drug.mgActivePerCarpule > 0 ? (maxSafeActiveMg / drug.mgActivePerCarpule) : 99;
	const maxCarpulesByEpi = !drug.isAdrenalineFree && drug.mgEpiPerCarpule > 0
		? maxSafeEpinephrineMg / drug.mgEpiPerCarpule
		: 99;

	const maxSafeCarpulesCount = Math.floor(Math.min(maxCarpulesByActive, maxCarpulesByEpi) * 10) / 10;
	const remainingSafeCarpulesCount = Math.max(0, Math.floor((maxSafeCarpulesCount - carpules) * 10) / 10);

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

	if (input.takesMaoInhibitors && !drug.isAdrenalineFree) {
		contraindicationsTriggered.push(
			'БЛОКИРУЮЩЕЕ ПРОТИВОПОКАЗАНИЕ: Пациент принимает ингибиторы МАО. Вазоконстрикторы абсолютно противопоказаны (риск гипертонического криза). Препарат выбора — Мепивакаин 3% (Скандонест).'
		);
	}

	if (input.hasThyrotoxicosis && !drug.isAdrenalineFree) {
		contraindicationsTriggered.push(
			'БЛОКИРУЮЩЕЕ ПРОТИВОПОКАЗАНИЕ: Декомпенсированный тиреотоксикоз. Адреналинсодержащие анестетики противопоказаны (риск фибрилляции желудочков). Препарат выбора — Мепивакаин 3% (Скандонест).'
		);
	}

	if (drug.id === 'bupivacaine_05') {
		if (input.patientAgeYears < 12) {
			contraindicationsTriggered.push(
				'Бупивакаин (Маркаин) строго противопоказан детям до 12 лет из-за высокой кардиотоксичности!'
			);
		}
		if (input.hasCardiacArrhythmia) {
			contraindicationsTriggered.push(
				'Бупивакаин (Маркаин) противопоказан при нарушениях сердечного ритма (высокая аритмогенность и кардиотоксичность)!'
			);
		}
	}

	if (input.isPregnantOrLactating && drug.vasoconstrictorRatio === '1:100000') {
		warnings.push(
			'Беременность / Лактация: предпочтительнее Артикаин 1:200 000 (Ультракаин Д-С) или Мепивакаин без адреналина.'
		);
	}

	// Cardio risk advisory and choice of drug
	if (isCardioRisk && drug.vasoconstrictorRatio === '1:100000') {
		warnings.push(
			`Кардиоваскулярный риск (${cardioRiskReasons.join(', ')}): Высокая концентрация адреналина 1:100 000 не рекомендуется при ССЗ! Строгий лимит адреналина 0.04 мг (максимум 2 карпулы 1:100k или 4 карпулы 1:200k). Препарат первого выбора при кардио-рисках — Мепивакаин 3% без вазоконстриктора (Скандонест/Мепивастезин).`
		);
	}

	if (input.takesBetaBlockers && !drug.isAdrenalineFree) {
		warnings.push(
			'ВНИМАНИЕ: Пациент принимает бета-блокаторы! Риск тяжелого гипертонического криза и рефлекторной брадикардии при взаимодействии с адреналином. Препарат выбора — Мепивакаин 3% без вазоконстриктора (Скандонест).'
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
		overrideReason: input.overrideReason,
		isOverdose,
		isEpinephrineOverdose,
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
		isOverdose,
		isEpinephrineOverdose,
		isCardioRisk,
		cardioRiskReasons,
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
	overrideReason?: string | undefined;
	isOverdose?: boolean | undefined;
	isEpinephrineOverdose?: boolean | undefined;
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

	let autonomyLegalNote = '';
	if (params.overrideReason) {
		autonomyLegalNote = ` [Врачебное решение (ст. 70 Федерального закона № 323-ФЗ): ${params.overrideReason}].`;
	} else if (params.isOverdose || params.isEpinephrineOverdose) {
		autonomyLegalNote = ' [Введено по неотложному клиническому решению врача согласно ст. 70 Федерального закона № 323-ФЗ, гемодинамика под контролем].';
	}

	return `Проведена местная ${tech.nameRu.toLowerCase()} анестезия${toothPart}. Препарат: ${params.drug.tradeNamesRu[0]} (${params.drug.activeSubstanceRu})${batchText}, объем ${params.injectedVolumeMl} мл (${params.carpulesCount} карп., ${params.injectedActiveMg} мг действующего вещества${epiText}).${vitalsText} Игла: ${needle.nameRu}. ${aspText} Анестезия наступила через ${params.drug.onsetMinutes} мин, глубина достаточная, соматических реакций нет.${nurseText}${autonomyLegalNote}`;
}

// ---------------------------------------------------------------------------
// 4. Patient Anesthesia Memo Formatter for Messengers (Feature 242)
// ---------------------------------------------------------------------------

export interface AnesthesiaPatientMemoParams {
	readonly clinicName: string;
	readonly clinicPhone: string;
	readonly patientName: string;
	readonly doctorName: string;
	readonly drugTradeName: string;
	readonly carpulesCount: number;
	readonly targetArea: string | number;
	readonly expectedDurationHours?: string | undefined;
	readonly date?: string | undefined;
}

export function formatAnesthesiaPatientMemo(params: AnesthesiaPatientMemoParams): string {
	const clinicName = params.clinicName.trim() || "Стоматологическая клиника DENTE";
	const clinicPhone = params.clinicPhone ? params.clinicPhone.trim() : "";
	const patientName = params.patientName.trim() || "Пациент";
	const doctorName = params.doctorName.trim() || "Лечащий врач-стоматолог";
	const date = params.date || new Date().toLocaleDateString("ru-RU");
	const duration = params.expectedDurationHours || "2–3 часа";

	return [
		`Памятка пациенту после проведения местной анестезии (клиника «${clinicName}»):`,
		`Пациент: ${patientName}`,
		`Лечащий врач: ${doctorName}`,
		`Дата процедуры: ${date}`,
		`Применённый препарат: ${params.drugTradeName} (введено ${params.carpulesCount} карп.)`,
		`Область анестезии: ${params.targetArea}`,
		`Ожидаемая длительность онемения: ${duration}`,
		`Правила безопасности после анестезии:`,
		`1. Не принимайте горячую пищу и напитки до полного восстановления чувствительности (риск незаметного термического ожога слизистой).`,
		`2. Не прикусывайте онемевшую губу, щёку или язык.`,
		`3. Не массируйте и не согревайте место инъекции.`,
		`4. При сохранении выраженного онемения более 6 часов или аллергических реакциях немедленно свяжитесь с клиникой${clinicPhone ? `: ${clinicPhone}` : ""}.`,
	].join("\n");
}

