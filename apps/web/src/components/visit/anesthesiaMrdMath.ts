/**
 * anesthesiaMrdMath.ts — Mathematical Engine for Dental Anesthesia Maximum Recommended Dose (MRD)
 *
 * Implements:
 * 1. Weight-based MRD in mg and carpules (1.7 ml, 1.8 ml, 2.0 ml) for all primary dental anesthetics.
 * 2. Cardiac Epinephrine Gate (<= 0.04 mg limit for IHD, Hypertension, Arrhythmia, ASA III/IV).
 * 3. Pediatric dosage scaling: Clark's rule (weight-based), Young's rule (age-based), and direct mg/kg.
 * 4. Safety Speedometer & Zones (Green / Yellow / Orange / Red STOP).
 * 5. Limiting Factor diagnosis (Weight, Absolute Cap, Cardiac Gate, Pediatric Scaling).
 *
 * Standards: Минздрав РФ, СтАР, AHA/ADA, Malamed's Handbook of Local Anesthesia.
 */

export type MrdDrugId =
	| 'articaine_1_100k'
	| 'articaine_1_200k'
	| 'mepivacaine_plain'
	| 'lidocaine_1_100k'
	| 'lidocaine_plain'
	| 'bupivacaine_05';

export type CarpuleVolumeMl = 1.7 | 1.8 | 2.0;

export type PediatricFormula = 'clark' | 'young' | 'direct_mg_kg';

export type SafetyZone = 'green_safe' | 'yellow_caution' | 'orange_warning' | 'red_stop';

export type LimitingFactor =
	| 'patient_weight'
	| 'absolute_max_cap'
	| 'cardiac_epinephrine_gate'
	| 'pediatric_clark'
	| 'pediatric_young'
	| 'pediatric_direct_mg_kg'
	| 'absolute_contraindication';

export interface MrdDrugSpecification {
	readonly id: MrdDrugId;
	readonly tradeNamesRu: readonly string[];
	readonly activeSubstanceRu: string;
	readonly concentrationPercent: number; // e.g. 4.0 for 4%
	readonly mgPerMlActive: number; // e.g. 40 mg/ml
	readonly vasoconstrictorNameRu: string;
	readonly vasoconstrictorRatio: '1:100000' | '1:200000' | 'none';
	readonly epinephrineMgPerMl: number; // 0.01 for 1:100k, 0.005 for 1:200k, 0 for plain
	readonly defaultVolumeMl: CarpuleVolumeMl;
	readonly maxDoseMgPerKgAdult: number; // 7.0 for Articaine, 4.4 for Mepivacaine & Lidocaine, 2.0 for Bupivacaine
	readonly absoluteMaxDoseMgAdult: number; // 500 for Articaine, 300 for Mepivacaine & Lidocaine, 90 for Bupivacaine
	readonly maxDoseMgPerKgPediatric: number; // 5.0 for Articaine, 4.4 for Mepivacaine/Lidocaine
	readonly containsSulfites: boolean;
	readonly isAdrenalineFree: boolean;
	readonly clinicalDescriptionRu: string;
}

export const MRD_DRUG_CATALOG: Record<MrdDrugId, MrdDrugSpecification> = {
	articaine_1_100k: {
		id: 'articaine_1_100k',
		tradeNamesRu: ['Ультракаин Д-С форте', 'Септонест 1:100 000', 'Убистезин форте', 'Брилокаин форте'],
		activeSubstanceRu: 'Артикаин 4% + Эпинефрин 1:100 000',
		concentrationPercent: 4.0,
		mgPerMlActive: 40.0,
		vasoconstrictorNameRu: 'Эпинефрин (Адреналин) 1:100 000',
		vasoconstrictorRatio: '1:100000',
		epinephrineMgPerMl: 0.01,
		defaultVolumeMl: 1.7,
		maxDoseMgPerKgAdult: 7.0,
		absoluteMaxDoseMgAdult: 500.0,
		maxDoseMgPerKgPediatric: 5.0,
		containsSulfites: true,
		isAdrenalineFree: false,
		clinicalDescriptionRu: 'Высокая глубина анестезии для травматичных вмешательств, пульпитов и хирургии.',
	},
	articaine_1_200k: {
		id: 'articaine_1_200k',
		tradeNamesRu: ['Ультракаин Д-С', 'Убистезин', 'Септонест 1:200 000', 'Артифрин'],
		activeSubstanceRu: 'Артикаин 4% + Эпинефрин 1:200 000',
		concentrationPercent: 4.0,
		mgPerMlActive: 40.0,
		vasoconstrictorNameRu: 'Эпинефрин (Адреналин) 1:200 000',
		vasoconstrictorRatio: '1:200000',
		epinephrineMgPerMl: 0.005,
		defaultVolumeMl: 1.7,
		maxDoseMgPerKgAdult: 7.0,
		absoluteMaxDoseMgAdult: 500.0,
		maxDoseMgPerKgPediatric: 5.0,
		containsSulfites: true,
		isAdrenalineFree: false,
		clinicalDescriptionRu: 'Стандартная терапия кариеса, препарирование под коронки, эндодонтия. Оптимальный профиль безопасности.',
	},
	mepivacaine_plain: {
		id: 'mepivacaine_plain',
		tradeNamesRu: ['Скандонест 3%', 'Мепивастезин 3%', 'Мепивакаин-Бинергия'],
		activeSubstanceRu: 'Мепивакаин 3% (без вазоконстриктора)',
		concentrationPercent: 3.0,
		mgPerMlActive: 30.0,
		vasoconstrictorNameRu: 'Без вазоконстриктора',
		vasoconstrictorRatio: 'none',
		epinephrineMgPerMl: 0.0,
		defaultVolumeMl: 1.7,
		maxDoseMgPerKgAdult: 4.4,
		absoluteMaxDoseMgAdult: 300.0,
		maxDoseMgPerKgPediatric: 4.4,
		containsSulfites: false,
		isAdrenalineFree: true,
		clinicalDescriptionRu: 'Препарат первого выбора при ИБС, гипертонии, аритмии, астме, аллергии на сульфиты и для пожилых пациентов.',
	},
	lidocaine_1_100k: {
		id: 'lidocaine_1_100k',
		tradeNamesRu: ['Ксилонор', 'Лидокаин с адреналином 1:100 000', 'Octocaine 1:100k'],
		activeSubstanceRu: 'Лидокаин 2% + Эпинефрин 1:100 000',
		concentrationPercent: 2.0,
		mgPerMlActive: 20.0,
		vasoconstrictorNameRu: 'Эпинефрин 1:100 000',
		vasoconstrictorRatio: '1:100000',
		epinephrineMgPerMl: 0.01,
		defaultVolumeMl: 1.7,
		maxDoseMgPerKgAdult: 4.4,
		absoluteMaxDoseMgAdult: 300.0,
		maxDoseMgPerKgPediatric: 4.4,
		containsSulfites: true,
		isAdrenalineFree: false,
		clinicalDescriptionRu: 'Классическая инфильтрационная и проводниковая анестезия при непереносимости артикаина.',
	},
	lidocaine_plain: {
		id: 'lidocaine_plain',
		tradeNamesRu: ['Лидокаин 2% (чистый)', 'Ксилокаин'],
		activeSubstanceRu: 'Лидокаин 2% (без вазоконстриктора)',
		concentrationPercent: 2.0,
		mgPerMlActive: 20.0,
		vasoconstrictorNameRu: 'Без вазоконстриктора',
		vasoconstrictorRatio: 'none',
		epinephrineMgPerMl: 0.0,
		defaultVolumeMl: 2.0,
		maxDoseMgPerKgAdult: 4.4,
		absoluteMaxDoseMgAdult: 300.0,
		maxDoseMgPerKgPediatric: 4.4,
		containsSulfites: false,
		isAdrenalineFree: true,
		clinicalDescriptionRu: 'Кратковременные манипуляции, снятие швов, ретракция десны.',
	},
	bupivacaine_05: {
		id: 'bupivacaine_05',
		tradeNamesRu: ['Маркаин 0.5% с адреналином', 'Бупивакаин Дентал'],
		activeSubstanceRu: 'Бупивакаин 0.5% + Эпинефрин 1:200 000',
		concentrationPercent: 0.5,
		mgPerMlActive: 5.0,
		vasoconstrictorNameRu: 'Эпинефрин 1:200 000',
		vasoconstrictorRatio: '1:200000',
		epinephrineMgPerMl: 0.005,
		defaultVolumeMl: 1.8,
		maxDoseMgPerKgAdult: 2.0,
		absoluteMaxDoseMgAdult: 90.0,
		maxDoseMgPerKgPediatric: 1.5,
		containsSulfites: true,
		isAdrenalineFree: false,
		clinicalDescriptionRu: 'Длительные операции, имплантация, послеоперационное обезболивание на 6–8 часов.',
	},
};

export const EPINEPHRINE_LIMITS_MG = {
	healthyAdult: 0.20,
	cardiovascularGate: 0.04,
} as const;

export interface MrdCalculationParams {
	readonly drugId: MrdDrugId;
	readonly patientWeightKg: number;
	readonly carpulesCount: number;
	readonly carpuleVolumeMl?: number | CarpuleVolumeMl | undefined;
	readonly isCardiacRisk?: boolean | undefined;
	readonly isPediatric?: boolean | undefined;
	readonly patientAgeYears?: number | null | undefined;
	readonly pediatricFormula?: PediatricFormula | undefined;
	readonly hasSulfiteAllergy?: boolean | undefined;
	readonly hasBronchialAsthma?: boolean | undefined;
}

export interface MrdCalculationResult {
	readonly drug: MrdDrugSpecification;
	readonly carpuleVolumeMl: number;
	readonly mgActivePerCarpule: number;
	readonly mgEpiPerCarpule: number;

	readonly carpulesCount: number;
	readonly injectedVolumeMl: number;
	readonly injectedActiveMg: number;
	readonly injectedEpinephrineMg: number;

	readonly maxSafeActiveMg: number;
	readonly maxSafeEpinephrineMg: number;
	readonly maxSafeCarpulesCount: number;
	readonly maxSafeVolumeMl: number;

	readonly remainingSafeActiveMg: number;
	readonly remainingSafeEpinephrineMg: number;
	readonly remainingSafeCarpules: number;

	readonly activeDosePercent: number;
	readonly epinephrineDosePercent: number;
	readonly peakUtilizationPercent: number;

	readonly safetyZone: SafetyZone;
	readonly isOverdose: boolean;
	readonly isEpinephrineOverdose: boolean;
	readonly speedoMeterLabelRu: string;
	readonly speedoMeterColorHex: string;

	readonly limitingFactor: LimitingFactor;
	readonly limitingFactorDescriptionRu: string;
	readonly isCardiacRestricted: boolean;
	readonly cardiacGateActive: boolean;
	readonly isPediatricScaled: boolean;
	readonly pediatricFormulaUsed: PediatricFormula | null;
	readonly pediatricScalingFactor: number;

	readonly warnings: readonly string[];
	readonly contraindications: readonly string[];
	readonly soapDiaryText: string;
}

export function calculateClarkFactor(patientWeightKg: number): number {
	const weight = Math.max(3, Math.min(150, patientWeightKg));
	return Math.round((weight / 70) * 1000) / 1000;
}

export function calculateClarkDose(adultAbsoluteMaxMg: number, patientWeightKg: number): number {
	const factor = calculateClarkFactor(patientWeightKg);
	return Math.round(adultAbsoluteMaxMg * factor * 10) / 10;
}

export function calculateYoungFactor(ageYears: number): number {
	const age = Math.max(1, Math.min(18, ageYears));
	return Math.round((age / (age + 12)) * 1000) / 1000;
}

export function calculateYoungDose(adultAbsoluteMaxMg: number, ageYears: number): number {
	const factor = calculateYoungFactor(ageYears);
	return Math.round(adultAbsoluteMaxMg * factor * 10) / 10;
}

export function calculateAnesthesiaMrd(params: MrdCalculationParams): MrdCalculationResult {
	const drug = MRD_DRUG_CATALOG[params.drugId] ?? MRD_DRUG_CATALOG.articaine_1_100k;
	const carpuleVolume = params.carpuleVolumeMl && params.carpuleVolumeMl > 0
		? params.carpuleVolumeMl
		: drug.defaultVolumeMl;

	const weight = Math.max(5, Math.min(250, Number.isFinite(params.patientWeightKg) && params.patientWeightKg > 0 ? params.patientWeightKg : 70));
	const carpules = Math.max(0, Number.isFinite(params.carpulesCount) ? params.carpulesCount : 1);
	const age = params.patientAgeYears ?? null;

	const isPediatric = Boolean(
		params.isPediatric ||
		(age !== null && age < 18) ||
		weight < 40,
	);

	const mgActivePerCarpule = Math.round(carpuleVolume * drug.mgPerMlActive * 100) / 100;
	const mgEpiPerCarpule = Math.round(carpuleVolume * drug.epinephrineMgPerMl * 10000) / 10000;

	const injectedVolumeMl = Math.round(carpules * carpuleVolume * 100) / 100;
	const injectedActiveMg = Math.round(carpules * mgActivePerCarpule * 10) / 10;
	const injectedEpinephrineMg = Math.round(carpules * mgEpiPerCarpule * 10000) / 10000;

	let pediatricScalingFactor = 1.0;
	let pediatricFormulaUsed: PediatricFormula | null = null;
	let maxSafeActiveMg = 0;
	let limitingFactor: LimitingFactor = 'patient_weight';
	let limitingDesc = `Лимит рассчитан по массе тела (${weight} кг × ${drug.maxDoseMgPerKgAdult} мг/кг).`;

	if (isPediatric) {
		const formula: PediatricFormula = params.pediatricFormula ?? (age !== null && age <= 12 ? 'young' : 'clark');
		pediatricFormulaUsed = formula;

		if (formula === 'clark') {
			pediatricScalingFactor = calculateClarkFactor(weight);
			const clarkDose = calculateClarkDose(drug.absoluteMaxDoseMgAdult, weight);
			const weightDose = Math.round(weight * drug.maxDoseMgPerKgPediatric * 10) / 10;
			maxSafeActiveMg = Math.min(clarkDose, weightDose);
			limitingFactor = 'pediatric_clark';
			limitingDesc = `Педиатрический расчет по правилу Кларка (${weight} кг / 70 кг = ${Math.round(pediatricScalingFactor * 100)}% от взрослой дозы).`;
		} else if (formula === 'young' && age !== null && age > 0) {
			pediatricScalingFactor = calculateYoungFactor(age);
			const youngDose = calculateYoungDose(drug.absoluteMaxDoseMgAdult, age);
			const weightDose = Math.round(weight * drug.maxDoseMgPerKgPediatric * 10) / 10;
			maxSafeActiveMg = Math.min(youngDose, weightDose);
			limitingFactor = 'pediatric_young';
			limitingDesc = `Педиатрический расчет по правилу Янга (${age} лет / (${age} + 12) = ${Math.round(pediatricScalingFactor * 100)}% от взрослой дозы).`;
		} else {
			maxSafeActiveMg = Math.round(weight * drug.maxDoseMgPerKgPediatric * 10) / 10;
			limitingFactor = 'pediatric_direct_mg_kg';
			limitingDesc = `Педиатрический расчет по массе тела (${weight} кг × ${drug.maxDoseMgPerKgPediatric} мг/кг).`;
		}
	} else {
		const weightBasedMg = Math.round(weight * drug.maxDoseMgPerKgAdult * 10) / 10;
		if (weightBasedMg > drug.absoluteMaxDoseMgAdult) {
			maxSafeActiveMg = drug.absoluteMaxDoseMgAdult;
			limitingFactor = 'absolute_max_cap';
			limitingDesc = `Лимит ограничен абсолютным максимумом для взрослых (${drug.absoluteMaxDoseMgAdult} мг).`;
		} else {
			maxSafeActiveMg = weightBasedMg;
			limitingFactor = 'patient_weight';
			limitingDesc = `Лимит рассчитан по массе тела (${weight} кг × ${drug.maxDoseMgPerKgAdult} мг/кг = ${weightBasedMg} мг).`;
		}
	}

	const isCardiacRisk = Boolean(params.isCardiacRisk);
	const maxSafeEpinephrineMg = isCardiacRisk
		? EPINEPHRINE_LIMITS_MG.cardiovascularGate
		: EPINEPHRINE_LIMITS_MG.healthyAdult;

	const maxCarpulesByActive = mgActivePerCarpule > 0
		? Math.floor((maxSafeActiveMg / mgActivePerCarpule) * 10) / 10
		: 0;

	let maxCarpulesByEpi = 999;
	if (!drug.isAdrenalineFree && mgEpiPerCarpule > 0) {
		maxCarpulesByEpi = Math.floor((maxSafeEpinephrineMg / mgEpiPerCarpule) * 10) / 10;
	}

	let maxSafeCarpulesCount = Math.min(maxCarpulesByActive, maxCarpulesByEpi);
	let cardiacGateActive = false;

	if (isCardiacRisk && !drug.isAdrenalineFree && maxCarpulesByEpi < maxCarpulesByActive) {
		cardiacGateActive = true;
		maxSafeCarpulesCount = maxCarpulesByEpi;
		limitingFactor = 'cardiac_epinephrine_gate';
		limitingDesc = `Лимит строго ограничен кардиологическим шлюзом адреналина (<= 0.04 мг / макс. ${maxSafeCarpulesCount} карп.).`;
		const cardioActiveCap = Math.round(maxSafeCarpulesCount * mgActivePerCarpule * 10) / 10;
		maxSafeActiveMg = Math.min(maxSafeActiveMg, cardioActiveCap);
	}

	const maxSafeVolumeMl = Math.round(maxSafeCarpulesCount * carpuleVolume * 100) / 100;

	const remainingSafeActiveMg = Math.max(0, Math.round((maxSafeActiveMg - injectedActiveMg) * 10) / 10);
	const remainingSafeEpinephrineMg = drug.isAdrenalineFree
		? 0
		: Math.max(0, Math.round((maxSafeEpinephrineMg - injectedEpinephrineMg) * 10000) / 10000);
	const remainingSafeCarpules = Math.max(0, Math.round((maxSafeCarpulesCount - carpules) * 10) / 10);

	const activeDosePercent = maxSafeActiveMg > 0
		? Math.round((injectedActiveMg / maxSafeActiveMg) * 100)
		: 0;
	const epinephrineDosePercent = !drug.isAdrenalineFree && maxSafeEpinephrineMg > 0
		? Math.round((injectedEpinephrineMg / maxSafeEpinephrineMg) * 100)
		: 0;

	const peakUtilizationPercent = Math.max(activeDosePercent, epinephrineDosePercent);

	const isOverdose = injectedActiveMg > maxSafeActiveMg;
	const isEpinephrineOverdose = !drug.isAdrenalineFree && injectedEpinephrineMg > maxSafeEpinephrineMg;

	const warnings: string[] = [];
	const contraindications: string[] = [];

	if (drug.containsSulfites && (params.hasSulfiteAllergy || params.hasBronchialAsthma)) {
		contraindications.push(
			'ПРЕПАРАТ СОДЕРЖИТ СУЛЬФИТЫ (метабисульфит натрия E223). Противопоказан при бронхиальной астме и аллергии на сульфиты! Препарат выбора — Скандонест 3% (Мепивакаин).'
		);
	}

	if (isEpinephrineOverdose) {
		warnings.push(
			`ПРЕВЫШЕН КАРДИОЛОГИЧЕСКИЙ ЛИМИТ АДРЕНАЛИНА (${injectedEpinephrineMg} мг > ${maxSafeEpinephrineMg} мг). Риск тахикардии, ишемии миокарда и гипертонического криза!`
		);
	}

	if (isOverdose) {
		warnings.push(
			`ПРЕВЫШЕНА МАКСИМАЛЬНО ДОПУСТИМАЯ ДОЗА АНЕСТЕТИКА (${injectedActiveMg} мг > ${maxSafeActiveMg} мг / ${maxSafeCarpulesCount} карп.). Риск токсического действия на ЦНС!`
		);
	}

	let safetyZone: SafetyZone = 'green_safe';
	let speedoMeterLabelRu = 'БЕЗОПАСНО';
	let speedoMeterColorHex = '#10b981';

	if (contraindications.length > 0 || isOverdose || isEpinephrineOverdose || peakUtilizationPercent > 100) {
		safetyZone = 'red_stop';
		speedoMeterLabelRu = 'СТОП / ОПАСНОСТЬ';
		speedoMeterColorHex = '#ef4444';
	} else if (peakUtilizationPercent > 85) {
		safetyZone = 'orange_warning';
		speedoMeterLabelRu = 'ПРЕДЕЛ ДОЗЫ';
		speedoMeterColorHex = '#f97316';
	} else if (peakUtilizationPercent > 70) {
		safetyZone = 'yellow_caution';
		speedoMeterLabelRu = 'ВНИМАНИЕ';
		speedoMeterColorHex = '#eab308';
	}

	const epiText = !drug.isAdrenalineFree
		? `, вазоконстриктор ${drug.vasoconstrictorNameRu} (${injectedEpinephrineMg} мг)`
		: ', без вазоконстриктора';
	const cardioText = isCardiacRisk
		? ' [Кардиоконтроль: адреналин <= 0.04 мг]'
		: '';
	const pediaText = isPediatric
		? ` [Педиатрический расчет: ${pediatricFormulaUsed === 'clark' ? 'Кларк' : pediatricFormulaUsed === 'young' ? 'Янг' : 'мг/кг'}]`
		: '';

	const soapDiaryText = `Обезболивание: Препарат «${drug.tradeNamesRu[0]}» (${drug.activeSubstanceRu}), объем ${injectedVolumeMl} мл (${carpules} карп., ${injectedActiveMg} мг действ. в-ва${epiText}). МРД для пациента ${weight} кг: ${maxSafeActiveMg} мг (${maxSafeCarpulesCount} карп.)${cardioText}${pediaText}. Аспирационная проба отрицательная. Соматических реакций нет.`;

	return {
		drug,
		carpuleVolumeMl: carpuleVolume,
		mgActivePerCarpule,
		mgEpiPerCarpule,
		carpulesCount: carpules,
		injectedVolumeMl,
		injectedActiveMg,
		injectedEpinephrineMg,
		maxSafeActiveMg,
		maxSafeEpinephrineMg,
		maxSafeCarpulesCount,
		maxSafeVolumeMl,
		remainingSafeActiveMg,
		remainingSafeEpinephrineMg,
		remainingSafeCarpules,
		activeDosePercent,
		epinephrineDosePercent,
		peakUtilizationPercent,
		safetyZone,
		isOverdose,
		isEpinephrineOverdose,
		speedoMeterLabelRu,
		speedoMeterColorHex,
		limitingFactor,
		limitingFactorDescriptionRu: limitingDesc,
		isCardiacRestricted: isCardiacRisk && !drug.isAdrenalineFree,
		cardiacGateActive,
		isPediatricScaled: isPediatric,
		pediatricFormulaUsed,
		pediatricScalingFactor,
		warnings,
		contraindications,
		soapDiaryText,
	};
}
