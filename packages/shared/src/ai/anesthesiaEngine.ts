/**
 * @file packages/shared/src/ai/anesthesiaEngine.ts
 * @description Pure deterministic chairside anesthesia engine and dosage safety calculator.
 * Formulations of Articaine 4%, Mepivacaine 3%, Lidocaine 2%, strict double ceilings,
 * pediatric safeguards (<15 kg / <4 years), and cardiovascular / pharmacological contraindications cross-check.
 * Ported and enhanced from endochat assistant.py calculation engine.
 */

import { z } from "zod";

// ==============================================================================
// 1. DRUG FORMULATION SPECIFICATIONS
// ==============================================================================

export type AnestheticDrugType = "articaine" | "mepivacaine" | "lidocaine";
export type CarpuleVolumeMl = 1.7 | 1.8;
export type AnesthesiaVasoconstrictorRatio = "1:100000" | "1:200000" | "none";

export interface DrugFormulationSpec {
	readonly drugType: AnestheticDrugType;
	readonly commercialNameRu: string;
	readonly activeConcentrationPercent: number;
	readonly mgPerMl: number;
	readonly vasoconstrictorRatio: AnesthesiaVasoconstrictorRatio;
	readonly epinephrineMgPerMl: number;
	readonly standardVolumeMl: CarpuleVolumeMl;
	readonly mgPerCarpule: number;
	readonly adultDoseMgPerKg: number;
	readonly pediatricDoseMgPerKg: number;
	readonly absoluteMaxDoseMgAdult: number;
	readonly absoluteMaxDoseMgPediatric: number;
	readonly containsSulfites: boolean;
	readonly minWeightKgRecommended: number;
}

export const ANESTHESIA_FORMULATIONS: Record<string, DrugFormulationSpec> = {
	"articaine_4_epi_100k": {
		drugType: "articaine",
		commercialNameRu: "Артикаин 4% с адреналином 1:100 000 (Ультракаин Д-С форте, Септонест)",
		activeConcentrationPercent: 4.0,
		mgPerMl: 40.0,
		vasoconstrictorRatio: "1:100000",
		epinephrineMgPerMl: 0.01,
		standardVolumeMl: 1.7,
		mgPerCarpule: 68.0,
		adultDoseMgPerKg: 7.0,
		pediatricDoseMgPerKg: 5.0,
		absoluteMaxDoseMgAdult: 500.0,
		absoluteMaxDoseMgPediatric: 500.0,
		containsSulfites: true,
		minWeightKgRecommended: 15.0 // Противопоказан детям < 4 лет / < 15 кг
	},
	"articaine_4_epi_200k": {
		drugType: "articaine",
		commercialNameRu: "Артикаин 4% с адреналином 1:200 000 (Ультракаин Д-С, Убистезин)",
		activeConcentrationPercent: 4.0,
		mgPerMl: 40.0,
		vasoconstrictorRatio: "1:200000",
		epinephrineMgPerMl: 0.005,
		standardVolumeMl: 1.7,
		mgPerCarpule: 68.0,
		adultDoseMgPerKg: 7.0,
		pediatricDoseMgPerKg: 5.0,
		absoluteMaxDoseMgAdult: 500.0,
		absoluteMaxDoseMgPediatric: 500.0,
		containsSulfites: true,
		minWeightKgRecommended: 15.0
	},
	"articaine_4_plain": {
		drugType: "articaine",
		commercialNameRu: "Артикаин 4% без вазоконстриктора (Ультракаин Д)",
		activeConcentrationPercent: 4.0,
		mgPerMl: 40.0,
		vasoconstrictorRatio: "none",
		epinephrineMgPerMl: 0.0,
		standardVolumeMl: 1.7,
		mgPerCarpule: 68.0,
		adultDoseMgPerKg: 7.0,
		pediatricDoseMgPerKg: 5.0,
		absoluteMaxDoseMgAdult: 500.0,
		absoluteMaxDoseMgPediatric: 500.0,
		containsSulfites: false,
		minWeightKgRecommended: 15.0
	},
	"mepivacaine_3_plain": {
		drugType: "mepivacaine",
		commercialNameRu: "Мепивакаин 3% без вазоконстриктора (Скандонест 3%, Мепивастезин)",
		activeConcentrationPercent: 3.0,
		mgPerMl: 30.0,
		vasoconstrictorRatio: "none",
		epinephrineMgPerMl: 0.0,
		standardVolumeMl: 1.8,
		mgPerCarpule: 54.0,
		adultDoseMgPerKg: 4.4,
		pediatricDoseMgPerKg: 4.4,
		absoluteMaxDoseMgAdult: 400.0,
		absoluteMaxDoseMgPediatric: 300.0,
		containsSulfites: false,
		minWeightKgRecommended: 5.0
	},
	"lidocaine_2_epi_100k": {
		drugType: "lidocaine",
		commercialNameRu: "Лидокаин 2% с адреналином 1:100 000 (Ксилонор)",
		activeConcentrationPercent: 2.0,
		mgPerMl: 20.0,
		vasoconstrictorRatio: "1:100000",
		epinephrineMgPerMl: 0.01,
		standardVolumeMl: 1.8,
		mgPerCarpule: 36.0,
		adultDoseMgPerKg: 7.0,
		pediatricDoseMgPerKg: 4.4,
		absoluteMaxDoseMgAdult: 500.0,
		absoluteMaxDoseMgPediatric: 300.0,
		containsSulfites: true,
		minWeightKgRecommended: 5.0
	},
	"lidocaine_2_plain": {
		drugType: "lidocaine",
		commercialNameRu: "Лидокаин 2% без вазоконстриктора",
		activeConcentrationPercent: 2.0,
		mgPerMl: 20.0,
		vasoconstrictorRatio: "none",
		epinephrineMgPerMl: 0.0,
		standardVolumeMl: 1.8,
		mgPerCarpule: 36.0,
		adultDoseMgPerKg: 4.4,
		pediatricDoseMgPerKg: 4.4,
		absoluteMaxDoseMgAdult: 300.0,
		absoluteMaxDoseMgPediatric: 300.0,
		containsSulfites: false,
		minWeightKgRecommended: 5.0
	}
};

// ==============================================================================
// 2. INPUT AND OUTPUT INTERFACES
// ==============================================================================

export interface AnesthesiaPatientProfile {
	readonly weightKg: number;
	readonly ageYears?: number;
	readonly isPediatric?: boolean;
	readonly isPregnant?: boolean;
	readonly somaticConditions?: {
		readonly hasIhd?: boolean; // ИБС / стенокардия / инфаркт
		readonly hasHypertension?: boolean; // Гипертония
		readonly bloodPressureSystolic?: number;
		readonly bloodPressureDiastolic?: number;
		readonly hasArrhythmia?: boolean;
		readonly hasBronchialAsthma?: boolean;
		readonly hasSulfiteAllergy?: boolean;
		readonly takesBetaBlockers?: boolean; // Неселективные бета-блокаторы
		readonly takesMaoInhibitors?: boolean; // Ингибиторы МАО
	};
}

export interface DeterministicAnesthesiaInput {
	readonly formulationKey: keyof typeof ANESTHESIA_FORMULATIONS | string;
	readonly patient: AnesthesiaPatientProfile;
	readonly customCarpuleVolumeMl?: CarpuleVolumeMl;
}

export type AnesthesiaEngineInput = DeterministicAnesthesiaInput;

export interface AnesthesiaCalculationResult {
	readonly drugKey: string;
	readonly drugNameRu: string;
	readonly patientCategory: "adult" | "pediatric";
	readonly patientWeightKg: number;
	readonly mgPerKgNorm: number;
	readonly doseByWeightMg: number;
	readonly absoluteCeilingMg: number;
	readonly effectiveMaxDoseMg: number;
	readonly hitCeiling: boolean;
	readonly carpuleVolumeMl: CarpuleVolumeMl;
	readonly mgPerCarpule: number;
	readonly exactCarpules: number;
	readonly safeCarpulesMax: number; // Math.floor
	readonly maxSafeVolumeMl: number;
	readonly isContraindicated: boolean;
	readonly contraindicationReasonRu?: string;
	readonly epinephrineAudit: {
		readonly epiPerCarpuleMg: number;
		readonly maxEpiAllowedMg: number;
		readonly maxCarpulesByEpinephrine: number;
		readonly isCardioRestricted: boolean;
	};
	readonly safetyWarningsRu: readonly string[];
}

// ==============================================================================
// 3. PURE CALCULATION ENGINE
// ==============================================================================

/**
 * Детерминированный клинический расчет анестезии у кресла.
 */
export function calculateDeterministicAnesthesia(input: DeterministicAnesthesiaInput): AnesthesiaCalculationResult {
	const defaultSpec = ANESTHESIA_FORMULATIONS["articaine_4_epi_200k"]!;
	const spec: DrugFormulationSpec = (ANESTHESIA_FORMULATIONS[input.formulationKey] as DrugFormulationSpec | undefined) ?? defaultSpec;
	const weight = input.patient.weightKg;

	const isChild = Boolean(
		input.patient.isPediatric ||
		(input.patient.ageYears !== undefined && input.patient.ageYears < 12) ||
		weight < 40
	);

	const carpuleVol = input.customCarpuleVolumeMl ?? spec.standardVolumeMl;
	const mgPerCarpule = spec.mgPerMl * carpuleVol;

	const mgPerKg = isChild ? spec.pediatricDoseMgPerKg : spec.adultDoseMgPerKg;
	const absMaxMg = isChild ? spec.absoluteMaxDoseMgPediatric : spec.absoluteMaxDoseMgAdult;

	const calcByWeightMg = weight * mgPerKg;
	const effectiveMaxMg = Math.min(calcByWeightMg, absMaxMg);
	const hitCeiling = calcByWeightMg >= absMaxMg;

	// Округление строго ВНИЗ к целому безопасному количеству карпул
	let safeCarpules = Math.floor(effectiveMaxMg / mgPerCarpule);
	const exactCarpules = Number((effectiveMaxMg / mgPerCarpule).toFixed(2));
	const maxSafeVolumeMl = Number((safeCarpules * carpuleVol).toFixed(2));

	const warnings: string[] = [];
	let isContraindicated = false;
	let contraindicationReason: string | undefined;

	// 1. Педиатрический предохранитель для Артикаина
	if (spec.drugType === "articaine" && (weight < 15 || (input.patient.ageYears !== undefined && input.patient.ageYears < 4))) {
		isContraindicated = true;
		safeCarpules = 0;
		contraindicationReason =
			"⛔ КЛИНИЧЕСКОЕ ПРОТИВОПОКАЗАНИЕ: Артикаин противопоказан детям в возрасте до 4 лет (масса тела менее 15 кг) " +
			"согласно официальной инструкции Минздрава РФ! Допустимо строго 0 карпул в амбулаторной практике.";
		warnings.push(contraindicationReason);
	}

	// 2. Кардиоваскулярный аудит вазоконстриктора (эпинефрина)
	const somatic = input.patient.somaticConditions ?? {};
	const isCardio = Boolean(
		somatic.hasIhd ||
		somatic.hasHypertension ||
		somatic.hasArrhythmia ||
		somatic.takesBetaBlockers ||
		(somatic.bloodPressureSystolic && somatic.bloodPressureSystolic >= 140) ||
		(somatic.bloodPressureDiastolic && somatic.bloodPressureDiastolic >= 90)
	);

	const epiPerCarpule = spec.epinephrineMgPerMl * carpuleVol;
	const maxEpiAllowed = isCardio ? 0.04 : 0.2; // 0.04 мг для сердечно-сосудистых патологий, 0.2 мг для здоровых

	let maxCarpulesByEpi = 999;
	if (epiPerCarpule > 0) {
		maxCarpulesByEpi = Math.floor(maxEpiAllowed / epiPerCarpule);
	}

	if (isCardio && spec.vasoconstrictorRatio !== "none") {
		if (safeCarpules > maxCarpulesByEpi) {
			safeCarpules = maxCarpulesByEpi;
			warnings.push(
				`⚠️ КАРДИОВАСКУЛЯРНОЕ ОГРАНИЧЕНИЕ: В связи с сопутствующей кардиопатологией доза адреналина ограничена 0.04 мг ` +
				`(максимум ${maxCarpulesByEpi} карпул(ы) ${spec.vasoconstrictorRatio}). Превышение опасно развитием тахиаритмии и гипертонического криза!`
			);
		}
	}

	// 3. Неселективные бета-блокаторы
	if (somatic.takesBetaBlockers && spec.vasoconstrictorRatio === "1:100000") {
		warnings.push(
			"⚠️ ОПАСНОЕ ЛЕКАРСТВЕННОЕ ВЗАИМОДЕЙСТВИЕ: Прием неселективных бета-блокаторов в сочетании с адреналином 1:100 000 " +
			"грозит резким подъемом артериального давления и рефлекторной брадикардией. Рекомендуется раствор 1:200 000 или Мепивакаин без адреналина."
		);
	}

	// 4. Сульфитная аллергия / бронхиальная астма
	if ((somatic.hasSulfiteAllergy || somatic.hasBronchialAsthma) && spec.containsSulfites) {
		warnings.push(
			"⚠️ СУЛЬФИТНЫЙ РИСК: Карпулы с вазоконстриктором содержат дисульфит натрия (антиоксидант), " +
			"способный спровоцировать острый бронхоспазм у пациентов с астмой или аллергией на сульфиты. Препарат выбора: Мепивакаин 3% без вазоконстриктора."
		);
	}

	// 5. Беременность
	if (input.patient.isPregnant) {
		if (spec.drugType === "mepivacaine" || spec.drugType === "lidocaine") {
			warnings.push(
				"⚠️ БЕРЕМЕННОСТЬ: Лидокаин и мепивакаин быстрее проникают через плацентарный барьер. " +
				"Золотым стандартом при беременности является Артикаин 4% 1:200 000 (высокое связывание с белками крови 95%, минимальный фетальный клиренс)."
			);
		}
	}

	// 6. Неконтролируемая артериальная гипертензия
	if (somatic.bloodPressureSystolic && somatic.bloodPressureSystolic >= 180) {
		isContraindicated = true;
		safeCarpules = 0;
		const htnWarning =
			"🚨 АБСОЛЮТНОЕ ПРОТИВОПОКАЗАНИЕ: Систолическое АД >= 180 мм рт. ст. (Гипертонический криз). " +
			"Плановое стоматологическое вмешательство запрещено! Показана неотложная гипотензивная терапия.";
		contraindicationReason = htnWarning;
		warnings.unshift(htnWarning);
	}

	return {
		drugKey: input.formulationKey,
		drugNameRu: spec.commercialNameRu,
		patientCategory: isChild ? "pediatric" : "adult",
		patientWeightKg: weight,
		mgPerKgNorm: mgPerKg,
		doseByWeightMg: calcByWeightMg,
		absoluteCeilingMg: absMaxMg,
		effectiveMaxDoseMg: effectiveMaxMg,
		hitCeiling,
		carpuleVolumeMl: carpuleVol,
		mgPerCarpule,
		exactCarpules,
		safeCarpulesMax: isContraindicated ? 0 : Math.max(0, safeCarpules),
		maxSafeVolumeMl,
		isContraindicated,
		...(contraindicationReason ? { contraindicationReasonRu: contraindicationReason } : {}),
		epinephrineAudit: {
			epiPerCarpuleMg: Number(epiPerCarpule.toFixed(4)),
			maxEpiAllowedMg: maxEpiAllowed,
			maxCarpulesByEpinephrine: maxCarpulesByEpi,
			isCardioRestricted: isCardio
		},
		safetyWarningsRu: warnings
	};
}

/**
 * Склонение слова «карпула» в русском языке.
 */
export function formatCarpulesDeclensionRu(count: number): string {
	const rem100 = count % 100;
	const rem10 = count % 10;
	if (rem100 >= 11 && rem100 <= 14) return `${count} карпул`;
	if (rem10 === 1) return `${count} карпула`;
	if (rem10 >= 2 && rem10 <= 4) return `${count} карпулы`;
	return `${count} карпул`;
}

/**
 * Формирует человекочитаемое клиническое заключение для врача у кресла.
 */
export function formatAnesthesiaSummaryRu(result: AnesthesiaCalculationResult): string {
	const lines: string[] = [
		`🧮 <b>Клинический расчет дозировки анестезии</b>`,
		`💊 <b>Препарат:</b> ${result.drugNameRu}`,
		`👤 <b>Пациент:</b> ${result.patientCategory === "pediatric" ? "Ребёнок" : "Взрослый"}, вес <b>${result.patientWeightKg} кг</b>`,
		`📏 <b>Фармакологическая норма:</b> ${result.mgPerKgNorm} мг/кг (абсолютный потолок: ${result.absoluteCeilingMg} мг)`,
		`📊 <b>Расчет по массе тела:</b> ${result.patientWeightKg} кг × ${result.mgPerKgNorm} мг/кг = <b>${result.doseByWeightMg} мг</b>`
	];

	if (result.hitCeiling) {
		lines.push(`⚠️ <i>Сработал абсолютный потолок токсичности: предельная доза ограничена ${result.effectiveMaxDoseMg} мг!</i>`);
	} else {
		lines.push(`• <b>Эффективный безопасный предел:</b> <b>${result.effectiveMaxDoseMg} мг</b>`);
	}

	lines.push(
		`💉 <b>Количество карпул по ${result.carpuleVolumeMl} мл (${result.mgPerCarpule} мг):</b>`,
		`• Точный расчет: <code>${result.effectiveMaxDoseMg} / ${result.mgPerCarpule}</code> = <b>${result.exactCarpules} карпул(ы)</b>`,
		`• <b>Безопасный максимум (округление вниз):</b> <b>${formatCarpulesDeclensionRu(result.safeCarpulesMax)}</b> (до ${result.maxSafeVolumeMl} мл)`
	);

	if (result.isContraindicated) {
		lines.unshift(`🚨 <b>ВНИМАНИЕ: ПРОТИВОПОКАЗАНО!</b> ${result.contraindicationReasonRu ?? ""}\n`);
	}

	if (result.safetyWarningsRu.length > 0) {
		lines.push(`\n🛡 <b>Предупреждения безопасности:</b>`);
		for (const w of result.safetyWarningsRu) {
			lines.push(`• ${w}`);
		}
	}

	return lines.join("\n");
}

// ==============================================================================
// 4. ZOD SCHEMAS
// ==============================================================================

export const anesthesiaPatientProfileSchema = z.object({
	weightKg: z.number().positive().min(3).max(300),
	ageYears: z.number().nonnegative().max(120).optional(),
	isPediatric: z.boolean().optional(),
	isPregnant: z.boolean().optional(),
	somaticConditions: z.object({
		hasIhd: z.boolean().optional(),
		hasHypertension: z.boolean().optional(),
		bloodPressureSystolic: z.number().optional(),
		bloodPressureDiastolic: z.number().optional(),
		hasArrhythmia: z.boolean().optional(),
		hasBronchialAsthma: z.boolean().optional(),
		hasSulfiteAllergy: z.boolean().optional(),
		takesBetaBlockers: z.boolean().optional(),
		takesMaoInhibitors: z.boolean().optional()
	}).optional()
});

export const anesthesiaCalculationInputSchema = z.object({
	formulationKey: z.string().min(1),
	patient: anesthesiaPatientProfileSchema,
	customCarpuleVolumeMl: z.union([z.literal(1.7), z.literal(1.8)]).optional()
});

export const anesthesiaCalculationResultSchema = z.object({
	drugKey: z.string(),
	drugNameRu: z.string(),
	patientCategory: z.enum(["pediatric", "adult"]),
	patientWeightKg: z.number(),
	mgPerKgNorm: z.number(),
	doseByWeightMg: z.number(),
	absoluteCeilingMg: z.number(),
	effectiveMaxDoseMg: z.number(),
	hitCeiling: z.boolean(),
	carpuleVolumeMl: z.number(),
	mgPerCarpule: z.number(),
	exactCarpules: z.number(),
	safeCarpulesMax: z.number(),
	maxSafeVolumeMl: z.number(),
	isContraindicated: z.boolean(),
	contraindicationReasonRu: z.string().optional(),
	epinephrineAudit: z.object({
		epiPerCarpuleMg: z.number(),
		maxEpiAllowedMg: z.number(),
		maxCarpulesByEpinephrine: z.number(),
		isCardioRestricted: z.boolean()
	}),
	safetyWarningsRu: z.array(z.string())
});
