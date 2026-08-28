/**
 * @dental/shared/anesthesia/safety.ts
 * Comprehensive Anesthesia Safety & Maximum Recommended Dose (MRD) Engine
 */

import { ANESTHESIA_DRUG_CATALOG, EPINEPHRINE_CEILINGS_MG } from "./catalog.js";
import type {
	AnesthesiaCalculationInput,
	AnesthesiaDrugSpec,
	AnesthesiaSafetyZone,
	AnestheticDrugId,
	ComprehensiveAnesthesiaCalculationResult,
	PatientAnesthesiaProfile,
} from "./types.js";

export function isPediatricPatient(ageYears?: number, weightKg?: number): boolean {
	if (typeof ageYears === "number" && ageYears > 0 && ageYears < 18) return true;
	if (typeof weightKg === "number" && weightKg > 0 && weightKg < 40) return true;
	return false;
}

export function isGeriatricPatient(ageYears?: number): boolean {
	return typeof ageYears === "number" && ageYears >= 65;
}

export function calculateEffectiveMgPerKg(
	drug: AnesthesiaDrugSpec,
	isPediatric: boolean,
	isGeriatric: boolean,
): { effectiveMgPerKg: number; ageFactor: number } {
	if (isPediatric) {
		return { effectiveMgPerKg: drug.maxDoseMgPerKgPediatric, ageFactor: 1.0 };
	}
	if (isGeriatric) {
		return {
			effectiveMgPerKg: Number((drug.maxDoseMgPerKgAdult * 0.8).toFixed(2)),
			ageFactor: 0.8,
		};
	}
	return { effectiveMgPerKg: drug.maxDoseMgPerKgAdult, ageFactor: 1.0 };
}

export function screenPatientContraindications(
	profile: PatientAnesthesiaProfile,
	drugId: AnestheticDrugId,
): {
	isBlocked: boolean;
	blockingContraindications: string[];
	warnings: string[];
	recommendedAlternativeId?: AnestheticDrugId | undefined;
	recommendedAlternativeKey?: AnestheticDrugId | undefined;
} {
	const drug = ANESTHESIA_DRUG_CATALOG[drugId] || ANESTHESIA_DRUG_CATALOG.articaine_4_epi_100k;
	const blockingContraindications: string[] = [];
	const warnings: string[] = [];
	let recommendedAlternativeId: AnestheticDrugId | undefined = undefined;

	// 1. MAO Inhibitors
	if (profile.takesMaoInhibitors && !drug.isAdrenalineFree) {
		blockingContraindications.push(
			"БЛОКИРУЮЩЕЕ ПРОТИВОПОКАЗАНИЕ: Пациент принимает ингибиторы МАО (ИМАО). Категорически запрещено применение адреналинсодержащих анестетиков из-за риска фатального гипертонического криза, гиперпирексии и желудочковых аритмий! Препарат выбора — Мепивакаин 3% (Скандонест).",
		);
		recommendedAlternativeId = "mepivacaine_3_plain";
	}

	// 2. Tricyclic Antidepressants
	if (profile.takesTricyclicAntidepressants) {
		if (drug.vasoconstrictorRatio === "1:100000") {
			blockingContraindications.push(
				"БЛОКИРУЮЩЕЕ ПРЕДУПРЕЖДЕНИЕ: Пациент принимает трициклические антидепрессанты (ТЦА). Высокая концентрация адреналина (1:100 000) противопоказана из-за 2-4 кратного потенцирования прессорного эффекта адреналина и риска кардиотоксичности! Рекомендуется Мепивакаин 3% или Артикаин 1:200 000 (макс 1 карпула).",
			);
			recommendedAlternativeId = "mepivacaine_3_plain";
		} else if (!drug.isAdrenalineFree) {
			warnings.push(
				"ВНИМАНИЕ (ТЦА): Прием трициклических антидепрессантов потенцирует действие адреналина. Максимальная доза адреналина строго ограничена 0.02-0.04 мг (макс. 1-2 карпулы 1:200 000). Обязательна аспирационная проба!",
			);
		}
	}

	// 3. Thyrotoxicosis
	if (profile.hasThyrotoxicosis && !drug.isAdrenalineFree) {
		blockingContraindications.push(
			"БЛОКИРУЮЩЕЕ ПРОТИВОПОКАЗАНИЕ: Декомпенсированный тиреотоксикоз. Адреналинсодержащие анестетики противопоказаны из-за гиперчувствительности адренорецепторов миокарда и риска тиреотоксического криза и фибрилляции желудочков! Препарат выбора — Мепивакаин 3% (Скандонест).",
		);
		recommendedAlternativeId = "mepivacaine_3_plain";
	}

	// 4. Severe Arrhythmias
	if (profile.hasCardiacArrhythmia) {
		if (drug.vasoconstrictorRatio === "1:100000") {
			blockingContraindications.push(
				"БЛОКИРУЮЩЕЕ ПРЕДУПРЕЖДЕНИЕ: Тяжелые нарушения ритма сердца (пароксизмальная тахикардия, желудочковая экстрасистолия, АВ-блокада). Анестетики с адреналином 1:100 000 противопоказаны! Рекомендуется Мепивакаин 3% (Скандонест) или Артикаин 1:200 000 с кардиолимитом <= 0.04 мг.",
			);
			recommendedAlternativeId = "mepivacaine_3_plain";
		} else if (!drug.isAdrenalineFree) {
			warnings.push(
				"КАРДИОРИСК: Нарушение ритма сердца. Доза адреналина строго лимитирована 0.04 мг. Обязателен контроль ЧСС и АД.",
			);
		}
	}

	// 5. Sulfites / Asthma
	if (drug.containsSulfites && (profile.hasSulfiteAllergy || profile.hasBronchialAsthma)) {
		blockingContraindications.push(
			"БЛОКИРУЮЩЕЕ ПРОТИВОПОКАЗАНИЕ: Препарат содержит метабисульфит натрия (E223, антиоксидант адреналина). Категорически противопоказан при бронхиальной астме и аллергии на сульфиты из-за риска тяжелого бронхоспазма и анафилаксии! Препарат выбора — Мепивакаин 3% (Скандонест, не содержит сульфитов).",
		);
		recommendedAlternativeId = "mepivacaine_3_plain";
	}

	// 6. Uncontrolled Hypertension
	const isSevereHypertension =
		(typeof profile.bpSystolic === "number" && profile.bpSystolic >= 180) ||
		(typeof profile.bpDiastolic === "number" && profile.bpDiastolic >= 110);

	if (isSevereHypertension && !drug.isAdrenalineFree) {
		blockingContraindications.push(
			`БЛОКИРУЮЩЕЕ ПРЕДУПРЕЖДЕНИЕ: Неконтролируемая артериальная гипертензия (АД ${profile.bpSystolic ?? 180}/${profile.bpDiastolic ?? 110} мм рт. ст.). Плановое лечение отложить! При неотложной помощи запрещены вазоконстрикторы — применять Мепивакаин 3%.`,
		);
		recommendedAlternativeId = "mepivacaine_3_plain";
	}

	// 7. Pheochromocytoma & Glaucoma
	if (profile.hasPheochromocytoma && !drug.isAdrenalineFree) {
		blockingContraindications.push(
			"БЛОКИРУЮЩЕЕ ПРОТИВОПОКАЗАНИЕ: Феохромоцитома. Вазоконстрикторы абсолютно противопоказаны!",
		);
		recommendedAlternativeId = "mepivacaine_3_plain";
	}

	if (profile.hasGlaucoma && !drug.isAdrenalineFree) {
		warnings.push(
			"ВНИМАНИЕ: Закрытоугольная глаукома. Опасность повышения внутриглазного давления при всасывании адреналина.",
		);
	}

	// 8. Amide allergy
	if (profile.hasAmideAllergy) {
		blockingContraindications.push(
			"КРИТИЧЕСКАЯ АЛЛЕРГИЯ: Анамнез аллергических реакций на амидные анестетики. Требуется консультация аллерголога и аллергопробы!",
		);
	}

	// 9. Pregnancy & Lactation
	if (profile.isPregnantOrLactating) {
		if (drug.vasoconstrictorRatio === "1:100000") {
			warnings.push(
				"БЕРЕМЕННОСТЬ / ЛАКТАЦИЯ: Высокая концентрация адреналина (1:100 000) может вызывать спазм маточных сосудов. Предпочтителен Артикаин 1:200 000 (Ультракаин Д-С) или Мепивакаин 3%.",
			);
		}
	}

	// 10. Liver Disease
	if (profile.hasSevereLiverDisease && drugId === "mepivacaine_3_plain") {
		warnings.push(
			"ПЕЧЕНОЧНАЯ НЕДОСТАТОЧНОСТЬ: Мепивакаин на 95% метаболизируется в печени. Артикаин предпочтительнее, так как на 90-95% расщепляется эстеразами плазмы крови.",
		);
	}

	return {
		isBlocked: blockingContraindications.length > 0,
		blockingContraindications,
		warnings,
		recommendedAlternativeId,
		recommendedAlternativeKey: recommendedAlternativeId,
	};
}

export function calculateComprehensiveAnesthesiaSafety(
	input: AnesthesiaCalculationInput,
): ComprehensiveAnesthesiaCalculationResult {
	const activeDrugId = input.drugId || "articaine_4_epi_100k";
	const drug = ANESTHESIA_DRUG_CATALOG[activeDrugId] || ANESTHESIA_DRUG_CATALOG.articaine_4_epi_100k;
	const carpuleVolume =
		input.carpuleVolumeMl && input.carpuleVolumeMl > 0
			? input.carpuleVolumeMl
			: drug.standardCarpuleVolumeMl;

	const weight = Math.max(
		5,
		Math.min(
			250,
			Number.isFinite(input.patientWeightKg) && input.patientWeightKg > 0
				? input.patientWeightKg
				: 70,
		),
	);
	const carpules = Math.max(0, Number.isFinite(input.carpulesCount) ? input.carpulesCount : 1);

	const isPediatric = input.isPediatric ?? isPediatricPatient(input.patientAgeYears, weight);
	const isGeriatric = input.isGeriatric ?? isGeriatricPatient(input.patientAgeYears);

	const { effectiveMgPerKg: effectiveMaxMgPerKg, ageFactor } = calculateEffectiveMgPerKg(
		drug,
		isPediatric,
		isGeriatric,
	);

	// Actual injected amounts
	const injectedVolumeMl = Number((carpules * carpuleVolume).toFixed(2));
	const mgActivePerCarpule = Number((carpuleVolume * drug.mgPerMlActive).toFixed(1));
	const mgEpiPerCarpule = Number((carpuleVolume * drug.epinephrineMgPerMl).toFixed(4));

	const injectedActiveMg = Number((carpules * mgActivePerCarpule).toFixed(1));
	const injectedEpinephrineMg = Number((carpules * mgEpiPerCarpule).toFixed(4));

	// Max safe limits
	const weightBasedMaxActiveMg = Number((weight * effectiveMaxMgPerKg).toFixed(1));
	const absoluteCapMg = Number((drug.absoluteMaxDoseMgAdult * ageFactor).toFixed(1));
	const maxSafeActiveMg = Math.min(weightBasedMaxActiveMg, absoluteCapMg);

	const isCardioRestricted = Boolean(
		input.hasCardiovascularRisk ||
			input.hasHypertension ||
			input.hasCardiacArrhythmia ||
			input.takesTricyclicAntidepressants ||
			input.asaStatus === "asa_3" ||
			input.asaStatus === "asa_4",
	);

	const maxSafeEpinephrineMg = isCardioRestricted
		? EPINEPHRINE_CEILINGS_MG.cardiovascularGate
		: EPINEPHRINE_CEILINGS_MG.healthyAdult;

	// Max safe carpules calculations
	const maxCarpulesByActive =
		mgActivePerCarpule > 0 ? Number((maxSafeActiveMg / mgActivePerCarpule).toFixed(1)) : 0;

	let maxCarpulesByEpi = 999;
	if (!drug.isAdrenalineFree && mgEpiPerCarpule > 0) {
		maxCarpulesByEpi = Number((maxSafeEpinephrineMg / mgEpiPerCarpule).toFixed(1));
	}

	const maxSafeCarpulesCount = Math.min(maxCarpulesByActive, maxCarpulesByEpi);
	const maxSafeVolumeMl = Number((maxSafeCarpulesCount * carpuleVolume).toFixed(2));

	const remainingSafeActiveMg = Math.max(0, Number((maxSafeActiveMg - injectedActiveMg).toFixed(1)));
	const remainingSafeEpinephrineMg = drug.isAdrenalineFree
		? 0
		: Math.max(0, Number((maxSafeEpinephrineMg - injectedEpinephrineMg).toFixed(4)));
	const remainingSafeCarpulesCount = Math.max(
		0,
		Number((maxSafeCarpulesCount - carpules).toFixed(1)),
	);

	// Percentage calculations
	const percentOfMaxDose =
		maxSafeActiveMg > 0 ? Math.round((injectedActiveMg / maxSafeActiveMg) * 100) : 0;
	const percentOfEpiMaxDose =
		!drug.isAdrenalineFree && maxSafeEpinephrineMg > 0
			? Math.round((injectedEpinephrineMg / maxSafeEpinephrineMg) * 100)
			: 0;

	const peakUtilizationPercent = Math.max(percentOfMaxDose, percentOfEpiMaxDose);

	const isOverdose = injectedActiveMg > maxSafeActiveMg;
	const isEpinephrineOverdose =
		!drug.isAdrenalineFree && injectedEpinephrineMg > maxSafeEpinephrineMg;

	// Screening
	const screening = screenPatientContraindications(input, activeDrugId);

	// Multi-zone safety rating
	let safetyZone: AnesthesiaSafetyZone = "safe";
	if (
		screening.isBlocked ||
		isOverdose ||
		isEpinephrineOverdose ||
		peakUtilizationPercent > 100
	) {
		safetyZone = "overdose_danger";
	} else if (peakUtilizationPercent > 85) {
		safetyZone = "warning";
	} else if (peakUtilizationPercent > 65) {
		safetyZone = "caution";
	}

	// Limiting factor description
	let limitingFactor = `Масса тела (${weight} кг × ${effectiveMaxMgPerKg} мг/кг = ${weightBasedMaxActiveMg} мг)`;
	if (weightBasedMaxActiveMg > absoluteCapMg) {
		limitingFactor = `Абсолютный максимум для взрослых (${absoluteCapMg} мг)`;
	}
	if (isCardioRestricted && !drug.isAdrenalineFree && maxCarpulesByEpi < maxCarpulesByActive) {
		limitingFactor = `Кардиологический лимит адреналина (≤ 0.04 мг / макс ${maxCarpulesByEpi} карп.)`;
	}
	if (isPediatric) {
		limitingFactor = `Педиатрический норматив (${weight} кг × ${effectiveMaxMgPerKg} мг/кг)`;
	}

	const allWarnings = [...screening.warnings];
	if (isOverdose) {
		allWarnings.unshift(
			`ПРЕВЫШЕНА ПРЕДЕЛЬНО ДОПУСТИМАЯ ДОЗА АНЕСТЕТИКА (${injectedActiveMg} мг > ${maxSafeActiveMg} мг / ${maxSafeCarpulesCount} карп.). Риск токсического действия на ЦНС и миокард!`,
		);
	}
	if (isEpinephrineOverdose) {
		allWarnings.unshift(
			`ПРЕВЫШЕН КАРДИОЛИМИТ АДРЕНАЛИНА (${injectedEpinephrineMg.toFixed(3)} мг > ${maxSafeEpinephrineMg.toFixed(2)} мг). Риск тахикардии, ишемии миокарда и гипертонического криза!`,
		);
	}

	// Clinical recommendation
	let clinicalAdviceRu = `Дозировка безопасна (${percentOfMaxDose}% от МРД).`;
	if (safetyZone === "overdose_danger") {
		clinicalAdviceRu = screening.isBlocked
			? "Введение противопоказано! Переключите препарат на безопасную альтернативу."
			: "Опасность передозировки! Уменьшите количество карпул.";
	} else if (safetyZone === "warning") {
		clinicalAdviceRu = "Внимание: доза близка к предельной. Повторные инъекции ограничены.";
	} else if (safetyZone === "caution") {
		clinicalAdviceRu = "Умеренная нагрузка. Рекомендуется мониторинг гемодинамики.";
	}

	// Diary entry synthesis (Форма № 043/у)
	const toothPart = input.targetToothFdi ? ` в области зуба ${input.targetToothFdi}` : "";
	const aspPart =
		input.aspirationConfirmed === false
			? "Аспирационная проба не проводилась."
			: "Аспирационная проба отрицательна (кровь в карпуле отсутствует).";
	const epiText = !drug.isAdrenalineFree
		? `, вазоконстриктор ${drug.vasoconstrictorNameRu} (${injectedEpinephrineMg.toFixed(3)} мг)`
		: ", без вазоконстриктора";
	const cardioText = isCardioRestricted ? " [Кардиоконтроль: адреналин ≤ 0.04 мг]" : "";
	const pediaText = isPediatric ? ` [Педиатрический расчет: ${effectiveMaxMgPerKg} мг/кг]` : "";

	const soapDiaryText = `Проведена местная анестезия${toothPart}. Препарат: «${drug.tradeNamesRu[0]}» (${drug.activeSubstanceRu}), объем ${injectedVolumeMl} мл (${carpules} карп., ${injectedActiveMg} мг действ. в-ва${epiText}). МРД для пациента ${weight} кг: ${maxSafeActiveMg} мг (${maxSafeCarpulesCount} карп.)${cardioText}${pediaText}. ${aspPart} Анестезия наступила через ${drug.onsetMinutes} мин, глубина достаточная, соматических реакций нет.`;

	return {
		drug,
		carpulesCount: carpules,
		carpuleVolumeMl: carpuleVolume,
		injectedVolumeMl,
		injectedActiveMg,
		injectedEpinephrineMg,
		maxSafeActiveMg,
		maxSafeEpinephrineMg,
		maxSafeCarpulesCount,
		maxSafeVolumeMl,
		remainingSafeActiveMg,
		remainingSafeEpinephrineMg,
		remainingSafeCarpulesCount,
		percentOfMaxDose,
		percentOfEpiMaxDose,
		peakUtilizationPercent,
		effectiveMaxMgPerKg,
		isPediatric,
		isGeriatric,
		ageReductionFactor: ageFactor,
		safetyZone,
		isOverdose,
		isEpinephrineOverdose,
		isBlocked: screening.isBlocked,
		limitingFactor,
		blockingContraindications: screening.blockingContraindications,
		warnings: allWarnings,
		recommendedAlternativeId: screening.recommendedAlternativeId,
		recommendedAlternativeKey: screening.recommendedAlternativeId,
		clinicalAdviceRu,
		soapDiaryText,
	};
}
