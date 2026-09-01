/**
 * @dental/shared/anesthesia/calculator.ts
 * Chairside Anesthesia Safety Calculator, MRD & Somatic Autopilot
 */

import {
	ANESTHESIA_DRUGS,
	ANESTHESIA_METHODS,
	CARDIO_LIMIT_BADGE_TEXT,
	CARDIO_MAX_EPINEPHRINE_MG,
	EPINEPHRINE_BLOCKED_BADGE_TEXT,
	HEALTHY_MAX_EPINEPHRINE_MG,
} from "./catalog.js";
import type {
	AnesthesiaDrugKey,
	AnesthesiaSafetyLevel,
	AnesthesiaSafetyParams,
	AnesthesiaSoapRecordParams,
	AnesthesiaSomaticAlert,
	AutopilotResolutionResult,
	PatientMrdCalculation,
	SomaticCrossCheckResult,
	SomaticRiskProfile,
	VisitAnesthesiaCalculationResult,
} from "./types.js";

/**
 * Парсит соматический анамнез пациента (из текста сопутствующих патологий или МКБ-10) в структурированный профиль риска.
 */
export function extractSomaticRiskProfileFromText(text?: string | null | undefined): SomaticRiskProfile {
	const raw = (text ?? "").toLowerCase();
	if (!raw.trim()) return {};

	const hasHypertension =
		raw.includes("гипертон") ||
		raw.includes("гипертенз") ||
		raw.includes("давлен") ||
		raw.includes("аг ") ||
		raw.includes("аг,") ||
		raw.includes("криз") ||
		raw.includes("i10") ||
		raw.includes("i11") ||
		raw.includes("i12") ||
		raw.includes("i13") ||
		raw.includes("i14") ||
		raw.includes("i15");

	const hasIhd =
		raw.includes("ибс") ||
		raw.includes("стенокард") ||
		raw.includes("инфаркт") ||
		raw.includes("постинфаркт") ||
		raw.includes("стентирован") ||
		raw.includes("шунтирован") ||
		raw.includes("i20") ||
		raw.includes("i21") ||
		raw.includes("i22") ||
		raw.includes("i23") ||
		raw.includes("i24") ||
		raw.includes("i25");

	const hasArrhythmia =
		raw.includes("аритми") ||
		raw.includes("мерцательн") ||
		raw.includes("экстрасистол") ||
		raw.includes("тахикарди") ||
		raw.includes("фибрилляц") ||
		raw.includes("пароксизм") ||
		raw.includes("блокад") ||
		raw.includes("i44") ||
		raw.includes("i45") ||
		raw.includes("i47") ||
		raw.includes("i48") ||
		raw.includes("i49");

	const hasSevereHypertension =
		raw.includes("аг 3") ||
		raw.includes("аг iii") ||
		raw.includes("3 стад") ||
		raw.includes("iii стад") ||
		raw.includes("криз") ||
		raw.includes("тяжелая гипертенз") ||
		raw.includes("тяжелой гипертенз");

	const hasThyrotoxicosis =
		raw.includes("тиреотоксикоз") ||
		raw.includes("гипертиреоз") ||
		raw.includes("базедов") ||
		raw.includes("e05") ||
		raw.includes("е05") ||
		raw.includes("токсический зоб");

	const takesBetaBlockers =
		raw.includes("бета-блокатор") ||
		raw.includes("бетаблокатор") ||
		raw.includes("бисопролол") ||
		raw.includes("конкор") ||
		raw.includes("анаприлин") ||
		raw.includes("пропранолол") ||
		raw.includes("метопролол") ||
		raw.includes("эгилок") ||
		raw.includes("соталол") ||
		raw.includes("атенолол") ||
		raw.includes("карведилол");

	const hasArticaineAllergy =
		(raw.includes("аллерг") || raw.includes("непереносим")) &&
		(raw.includes("артикаин") ||
			raw.includes("ультракаин") ||
			raw.includes("септанест") ||
			raw.includes("убистезин"));

	const hasMepivacaineAllergy =
		(raw.includes("аллерг") || raw.includes("непереносим")) &&
		(raw.includes("мепивакаин") ||
			raw.includes("скандонест") ||
			raw.includes("мепивастезин"));

	const hasLidocaineAllergy =
		(raw.includes("аллерг") || raw.includes("непереносим")) &&
		(raw.includes("лидокаин") ||
			raw.includes("новокаин") ||
			raw.includes("ксилокаин"));

	const hasCardio =
		hasHypertension ||
		hasSevereHypertension ||
		hasIhd ||
		hasArrhythmia ||
		hasThyrotoxicosis ||
		takesBetaBlockers ||
		raw.includes("сердеч") ||
		raw.includes("кардио") ||
		raw.includes("пороком сердца") ||
		raw.includes("хсн");

	const hasSulfite =
		raw.includes("сульфит") ||
		raw.includes("дисульфит") ||
		raw.includes("метабисульфит") ||
		raw.includes("пиросульфит") ||
		raw.includes("е223") ||
		raw.includes("e223") ||
		raw.includes("консервант");

	const hasAsthma =
		raw.includes("астм") ||
		raw.includes("бронхиальн") ||
		raw.includes("сальбутамол") ||
		raw.includes("беродуал") ||
		raw.includes("j45") ||
		raw.includes("j46");

	const isPregnant =
		raw.includes("беременн") ||
		raw.includes("лактац") ||
		raw.includes("кормлен") ||
		raw.includes("гв") ||
		raw.includes("триместр") ||
		raw.includes("z32") ||
		raw.includes("z33") ||
		raw.includes("z34") ||
		raw.includes("z35") ||
		raw.includes("z39");

	let pregnancyTrimester: SomaticRiskProfile["pregnancyTrimester"] = "none";
	if (isPregnant) {
		if (
			raw.includes("1 триместр") ||
			raw.includes("1-й триместр") ||
			raw.includes("первый триместр")
		) {
			pregnancyTrimester = "trimester_1";
		} else if (
			raw.includes("2 триместр") ||
			raw.includes("2-й триместр") ||
			raw.includes("второй триместр")
		) {
			pregnancyTrimester = "trimester_2";
		} else if (
			raw.includes("3 триместр") ||
			raw.includes("3-й триместр") ||
			raw.includes("третий триместр")
		) {
			pregnancyTrimester = "trimester_3";
		} else if (
			raw.includes("лактац") ||
			raw.includes("гв") ||
			raw.includes("кормлен")
		) {
			pregnancyTrimester = "lactation";
		} else {
			pregnancyTrimester = "trimester_2";
		}
	}

	return {
		hasCardiovascularRisk: hasCardio,
		hasHypertension,
		hasSevereHypertensionStage3: hasSevereHypertension,
		hasIhd,
		hasArrhythmia,
		hasThyrotoxicosis,
		takesBetaBlockers,
		hasArticaineAllergy,
		hasMepivacaineAllergy,
		hasLidocaineAllergy,
		hasSulfiteAllergy: hasSulfite,
		hasBronchialAsthma: hasAsthma,
		isPregnantOrLactating: isPregnant,
		pregnancyTrimester,
		...(text ? { customNotes: text } : {}),
	};
}

/**
 * Выполняет комплексный клинический кросс-чек анестетика с соматическим статусом и аллергоанамнезом.
 */
export function checkAnesthesiaSomaticContraindications(params: {
	drugKey: AnesthesiaDrugKey;
	somaticProfile?: SomaticRiskProfile | undefined;
	carpulesCount?: number | undefined;
}): SomaticCrossCheckResult {
	const drug = ANESTHESIA_DRUGS[params.drugKey] ?? ANESTHESIA_DRUGS.ultracain_ds;
	const somatic = params.somaticProfile ?? {};
	const carpules = Math.max(
		0,
		Number.isFinite(params.carpulesCount) ? (params.carpulesCount ?? 1) : 1,
	);

	const totalEpinephrineMg =
		Math.round(carpules * drug.epinephrineMgPerCarpule * 10000) / 10000;
	const isEpinephrineBlocked = Boolean(
		somatic.hasSevereHypertensionStage3 ||
			somatic.hasThyrotoxicosis ||
			somatic.takesBetaBlockers,
	);
	const hasCardio = Boolean(
		somatic.hasCardiovascularRisk ||
			somatic.hasHypertension ||
			somatic.hasIhd ||
			somatic.hasArrhythmia ||
			isEpinephrineBlocked,
	);
	const hasAsthmaOrSulfite = Boolean(
		somatic.hasSulfiteAllergy || somatic.hasBronchialAsthma,
	);
	const isPregnant = Boolean(
		somatic.isPregnantOrLactating ||
			(somatic.pregnancyTrimester && somatic.pregnancyTrimester !== "none"),
	);

	const isCardioRestricted = (hasCardio || isEpinephrineBlocked) && !drug.isAdrenalineFree;
	const maxSafeEpinephrineMg = isEpinephrineBlocked
		? 0.0
		: isCardioRestricted
			? CARDIO_MAX_EPINEPHRINE_MG
			: HEALTHY_MAX_EPINEPHRINE_MG;

	let maxCardioCarpules: number | null = null;
	if (isEpinephrineBlocked && !drug.isAdrenalineFree) {
		maxCardioCarpules = 0;
	} else if (!drug.isAdrenalineFree && drug.epinephrineMgPerCarpule > 0) {
		if (drug.vasoconstrictorRatio === "1:100000") {
			maxCardioCarpules = 2.0;
		} else if (drug.vasoconstrictorRatio === "1:200000") {
			maxCardioCarpules = 4.0;
		} else {
			maxCardioCarpules =
				Math.floor((CARDIO_MAX_EPINEPHRINE_MG / drug.epinephrineMgPerCarpule) * 10) / 10;
		}
	}

	const alerts: AnesthesiaSomaticAlert[] = [];
	let recommendedDrugKey: AnesthesiaDrugKey | null = null;
	let hasContraindications = false;

	// 0. КРОСС-ЧЕК: АЛЛЕРГИЯ НА АНЕСТЕТИКИ (Артикаин, Мепивакаин, Лидокаин)
	if (
		somatic.hasArticaineAllergy &&
		(drug.key === "ultracain_ds_forte" ||
			drug.key === "ultracain_ds" ||
			drug.key === "septanest_100")
	) {
		hasContraindications = true;
		recommendedDrugKey = somatic.hasMepivacaineAllergy ? "lidocaine_2" : "scandonest_3";
		alerts.push({
			id: "articaine_allergy_contraindication",
			severity: "danger",
			title: "⛔ АЛЛЕРГИЯ НА АРТИКАИН (УЛЬТРАКАИН)",
			message:
				"У пациента зарегистрирована аллергическая реакция на артикаин (Ультракаин, Септанест). Препарат категорически противопоказан! Риск анафилактического шока. Препарат выбора — Скандонест 3% (Мепивакаин).",
			recommendedDrugKey,
			recommendedAction: "Заменить на Скандонест 3% (Мепивакаин)",
		});
	}

	if (somatic.hasMepivacaineAllergy && drug.key === "scandonest_3") {
		hasContraindications = true;
		recommendedDrugKey = somatic.hasArticaineAllergy ? "lidocaine_2" : "ultracain_ds";
		alerts.push({
			id: "mepivacaine_allergy_contraindication",
			severity: "danger",
			title: "⛔ АЛЛЕРГИЯ НА МЕПИВАКАИН (СКАНДОНЕСТ)",
			message:
				"У пациента аллергия на мепивакаин. Препарат Скандонест 3% категорически противопоказан!",
			recommendedDrugKey,
			recommendedAction: "Заменить на Артикаин или Лидокаин 2%",
		});
	}

	if (somatic.hasLidocaineAllergy && drug.key === "lidocaine_2") {
		hasContraindications = true;
		recommendedDrugKey = somatic.hasMepivacaineAllergy ? "ultracain_ds" : "scandonest_3";
		alerts.push({
			id: "lidocaine_allergy_contraindication",
			severity: "danger",
			title: "⛔ АЛЛЕРГИЯ НА ЛИДОКАИН",
			message: "У пациента аллергия на лидокаин. Препарат Лидокаин 2% категорически противопоказан!",
			recommendedDrugKey,
			recommendedAction: "Заменить на Скандонест 3% (Мепивакаин)",
		});
	}

	// 1. КРОСС-ЧЕК: АБСОЛЮТНЫЙ ЗАПРЕТ ВАЗОКОНСТРИКТОРА (АГ III, Тиреотоксикоз, Бета-блокаторы)
	if (isEpinephrineBlocked) {
		if (!drug.isAdrenalineFree) {
			hasContraindications = true;
			recommendedDrugKey = "scandonest_3";
			const reasonStr = somatic.hasThyrotoxicosis
				? "тиреотоксикоз / гипертиреоз (E05)"
				: somatic.takesBetaBlockers
					? "прием бета-адреноблокаторов (риск неконтролируемого криза и рефлекторной брадикардии)"
					: "тяжелая артериальная гипертензия III стадии / кризовое течение";
			alerts.push({
				id: "epinephrine_absolute_block_contraindication",
				severity: "danger",
				title: "⛔ АБСОЛЮТНЫЙ ЗАПРЕТ АДРЕНАЛИНА (ЭПИНЕФРИНА)",
				message: `У пациента выявлены критические соматические риски: ${reasonStr}! Вазоконстрикторы (адреналин/эпинефрин) АБСОЛЮТНО ПРОТИВОПОКАЗАНЫ. Разрешены строго анестетики без адреналина (Скандонест 3% / Мепивакаин).`,
				recommendedDrugKey: "scandonest_3",
				recommendedAction: "Использовать Скандонест 3% без вазоконстриктора",
			});
		} else {
			alerts.push({
				id: "epinephrine_block_safe_plain",
				severity: "safe",
				title: "Разрешено: препарат без адреналина",
				message:
					"Препарат не содержит вазоконстриктора. Безопасен при тиреотоксикозе, приеме бета-блокаторов и кризовой гипертонии.",
			});
		}
	}

	// 1. КРОСС-ЧЕК: Аллергия на сульфиты / Бронхиальная астма (J45)
	if (hasAsthmaOrSulfite) {
		if (drug.containsSulfites) {
			hasContraindications = true;
			recommendedDrugKey = "scandonest_3";
			alerts.push({
				id: "sulfite_asthma_contraindication",
				severity: "danger",
				title: "ПРОТИВОПОКАЗАНО: Содержит сульфиты (риск бронхоспазма)",
				message: `У пациента ${somatic.hasBronchialAsthma ? "бронхиальная астма" : "аллергия на сульфиты"}! Препарат «${drug.commercialName}» содержит натрия метабисульфит (антиоксидант адреналина), способный спровоцировать острый бронхоспазм и анафилаксию. Категорически показан анестетик без вазоконстриктора и сульфитов (Скандонест 3% или Лидокаин 2%).`,
				recommendedDrugKey: "scandonest_3",
				recommendedAction: "Заменить на Скандонест 3% (без сульфитов и адреналина)",
			});
		} else {
			alerts.push({
				id: "sulfite_asthma_safe",
				severity: "safe",
				title: "Безопасно при астме и аллергии на сульфиты",
				message:
					"Препарат не содержит метабисульфита натрия и консервантов. Разрешён пациентам с бронхиальной астмой и гиперчувствительностью к сульфитам.",
			});
		}
	}

	// 2. КРОСС-ЧЕК: Сердечно-сосудистые заболевания / Гипертония (I10-I15)
	if (hasCardio) {
		if (drug.key === "ultracain_ds_forte" || drug.key === "septanest_100") {
			if (!recommendedDrugKey) recommendedDrugKey = "scandonest_3";
			alerts.push({
				id: "cardio_high_vaso_alert",
				severity: "danger",
				title: "Высокий кардиоваскулярный риск (Адреналин 1:100 000)",
				message:
					"У пациента сердечно-сосудистая патология / гипертензия (I10–I15). Высокая концентрация адреналина (1:100 000) повышает риск гипертонического криза, тахикардии и ишемии миокарда. Препарат выбора — Скандонест 3% (Мепивакаин без адреналина). При крайней необходимости применения адреналина доза строго ограничена 2 карпулами (не более 0.04 мг адреналина).",
				recommendedDrugKey: "scandonest_3",
				recommendedAction: "Переключить на Скандонест 3% без вазоконстриктора",
			});
		} else if (drug.key === "ultracain_ds") {
			alerts.push({
				id: "cardio_low_vaso_caution",
				severity: "warning",
				title: "Кардиоваскулярный риск: контроль дозы адреналина (1:200 000)",
				message:
					"У пациента гипертония / ССЗ. Ультракаин Д-С (1:200 000) допустим с осторожностью при мониторинге гемодинамики (строгий лимит: не более 4 карпул / 0.034 мг адреналина). При нестабильном давлении или высоком риске рекомендуется Скандонест 3%.",
				recommendedDrugKey: "scandonest_3",
				recommendedAction: "При повышенном давлении рекомендован Скандонест 3%",
			});
		} else if (drug.isAdrenalineFree) {
			alerts.push({
				id: "cardio_safe_plain",
				severity: "safe",
				title: "Препарат выбора для кардиологических пациентов",
				message:
					"Препарат не содержит адреналина/вазоконстриктора. Не вызывает тахикардии и подъема артериального давления. Оптимален при гипертонической болезни (I10–I15) и ИБС.",
			});
		}

		if (!drug.isAdrenalineFree && totalEpinephrineMg > CARDIO_MAX_EPINEPHRINE_MG) {
			hasContraindications = true;
			alerts.push({
				id: "cardio_epinephrine_overdose",
				severity: "danger",
				title: "ПРЕВЫШЕН КАРДИОЛИМИТ АДРЕНАЛИНА!",
				message: `Суммарная доза адреналина (${totalEpinephrineMg} мг) превышает кардиологический порог безопасности (0.04 мг / макс. ${maxCardioCarpules} карп.). Высокий риск гипертонического криза и жизнеугрожающей аритмии!`,
			});
		}
	}

	// 3. КРОСС-ЧЕК: Беременность и лактация (Z32–Z39)
	if (isPregnant) {
		if (drug.key === "ultracain_ds") {
			alerts.push({
				id: "pregnancy_preferred_choice",
				severity: "safe",
				title: "Препарат выбора при беременности и лактации",
				message:
					"Ультракаин Д-С (Артикаин 4% с пониженным адреналином 1:200 000) обладает максимальным связыванием с белками плазмы (~95%), минимальным проникновением через плацентарный барьер и быстрым периодом полувыведения (~20 мин). Используйте минимально эффективный объём.",
			});
		} else if (drug.key === "ultracain_ds_forte" || drug.key === "septanest_100") {
			if (!hasAsthmaOrSulfite) {
				recommendedDrugKey = "ultracain_ds";
			}
			alerts.push({
				id: "pregnancy_high_vaso_warning",
				severity: "warning",
				title: "Высокая концентрация адреналина при беременности",
				message:
					"Концентрация адреналина 1:100 000 не рекомендована при беременности из-за риска вазоконстрикции маточных сосудов и снижения маточно-плацентарного кровотока. Рекомендуется переключить на Ультракаин Д-С (1:200 000).",
				recommendedDrugKey: "ultracain_ds",
				recommendedAction: "Переключить на Ультракаин Д-С (1:200 000)",
			});
		} else if (drug.key === "scandonest_3") {
			if (!hasAsthmaOrSulfite) {
				recommendedDrugKey = "ultracain_ds";
				alerts.push({
					id: "pregnancy_mepivacaine_caution",
					severity: "caution",
					title: "Особенности применения Мепивакаина при беременности",
					message:
						"Мепивакаин обладает меньшим связыванием с белками (~75%) и длительнее метаболизируется печенью плода. При отсутствии аллергии на сульфиты препаратом выбора является Артикаин 1:200 000 (Ультракаин Д-С).",
					recommendedDrugKey: "ultracain_ds",
					recommendedAction: "Предпочтителен Артикаин 1:200 000",
				});
			}
		} else if (drug.key === "lidocaine_2") {
			if (!hasAsthmaOrSulfite) {
				recommendedDrugKey = "ultracain_ds";
				alerts.push({
					id: "pregnancy_lidocaine_caution",
					severity: "caution",
					title: "Особенности применения Лидокаина при беременности",
					message:
						"Лидокаин активно проходит через плацентарный барьер. Препаратом выбора в современной стоматологии является Артикаин 1:200 000 в минимальной дозе.",
					recommendedDrugKey: "ultracain_ds",
					recommendedAction: "Предпочтителен Артикаин 1:200 000",
				});
			}
		}
	}

	return {
		hasContraindications,
		alerts,
		recommendedDrugKey,
		maxCardioCarpules,
		totalEpinephrineMg,
		maxSafeEpinephrineMg,
		isCardioRestricted,
		cardioLimitBadgeText: isCardioRestricted ? CARDIO_LIMIT_BADGE_TEXT : null,
		cardioLimitDetails: isCardioRestricted
			? {
					maxEpinephrineMg: CARDIO_MAX_EPINEPHRINE_MG,
					maxCarpules: maxCardioCarpules,
					currentEpinephrineMg: totalEpinephrineMg,
					isExceeded: totalEpinephrineMg > CARDIO_MAX_EPINEPHRINE_MG,
				}
			: null,
	};
}

/**
 * Рассчитывает безопасность дозы анестетика с учетом массы тела и соматического статуса.
 */
export function calculateVisitAnesthesiaSafety(
	params: AnesthesiaSafetyParams,
): VisitAnesthesiaCalculationResult {
	const drug = ANESTHESIA_DRUGS[params.drugKey] ?? ANESTHESIA_DRUGS.ultracain_ds;
	const weight = Math.max(
		5,
		Math.min(
			250,
			Number.isFinite(params.patientWeightKg) && params.patientWeightKg > 0
				? params.patientWeightKg
				: 70,
		),
	);
	const carpules = Math.max(
		0,
		Number.isFinite(params.carpulesCount) ? params.carpulesCount : 1,
	);

	const isPediatric = Boolean(
		params.isPediatric ||
			(params.patientAgeYears !== null &&
				params.patientAgeYears !== undefined &&
				params.patientAgeYears < 18),
	);
	const effectiveMaxMgPerKg =
		isPediatric && drug.maxDoseMgPerKgPediatric
			? drug.maxDoseMgPerKgPediatric
			: drug.maxDoseMgPerKg;

	const totalVolumeMl =
		params.customVolumeMl !== undefined &&
		Number.isFinite(params.customVolumeMl) &&
		params.customVolumeMl > 0
			? Math.round(params.customVolumeMl * 100) / 100
			: Math.round(carpules * drug.volumeMlPerCarpule * 100) / 100;

	// Рассчитываем введенную дозу действующего вещества: (Объем мл * Концентрация % * 10 мг/мл)
	const totalDoseMg = Math.round(totalVolumeMl * (drug.concentrationPct * 10) * 10) / 10;

	// Предельная доза по весу пациента (для детей 5 мг/кг, для взрослых 7 мг/кг макс 500 мг)
	const weightLimitMg = Math.round(weight * effectiveMaxMgPerKg * 10) / 10;
	let maxSafeDoseMg = isPediatric
		? weightLimitMg
		: Math.min(weightLimitMg, drug.absoluteMaxDoseMg);

	let maxSafeCarpules =
		drug.mgPerCarpule > 0 ? Math.floor((maxSafeDoseMg / drug.mgPerCarpule) * 10) / 10 : 0;

	// Выполняем соматический кросс-чек
	const crossCheck = checkAnesthesiaSomaticContraindications({
		drugKey: drug.key,
		somaticProfile: params.somaticProfile,
		carpulesCount: carpules,
	});

	const hasCardio = Boolean(
		params.somaticProfile?.hasCardiovascularRisk ||
			params.somaticProfile?.hasHypertension ||
			params.somaticProfile?.hasIhd ||
			params.somaticProfile?.hasArrhythmia,
	);

	let isCardioRestricted = false;

	if (hasCardio && !drug.isAdrenalineFree && crossCheck.maxCardioCarpules !== null) {
		isCardioRestricted = true;
		if (crossCheck.maxCardioCarpules < maxSafeCarpules) {
			maxSafeCarpules = crossCheck.maxCardioCarpules;
			const cardioDoseCapMg = Math.round(maxSafeCarpules * drug.mgPerCarpule * 10) / 10;
			maxSafeDoseMg = Math.min(maxSafeDoseMg, cardioDoseCapMg);
		}
	}

	const maxSafeVolumeMl = Math.round(maxSafeCarpules * drug.volumeMlPerCarpule * 100) / 100;

	const doseRatio = maxSafeDoseMg > 0 ? totalDoseMg / maxSafeDoseMg : 0;
	const epiRatio =
		crossCheck.maxSafeEpinephrineMg > 0 && crossCheck.totalEpinephrineMg > 0
			? crossCheck.totalEpinephrineMg / crossCheck.maxSafeEpinephrineMg
			: 0;

	const safetyRatio = Math.max(doseRatio, epiRatio);
	const safetyPercentage = Math.round(safetyRatio * 100);

	let safetyLevel: AnesthesiaSafetyLevel = "safe";
	let warningMessage: string | null = null;

	const dangerAlert =
		crossCheck.alerts.find((a) => a.id === "cardio_epinephrine_overdose") ??
		crossCheck.alerts.find((a) => a.id === "sulfite_asthma_contraindication") ??
		crossCheck.alerts.find((a) => a.severity === "danger");
	const warningAlert = crossCheck.alerts.find((a) => a.severity === "warning");
	const cautionAlert = crossCheck.alerts.find((a) => a.severity === "caution");

	if (dangerAlert) {
		safetyLevel = "danger";
		warningMessage = dangerAlert.message;
	} else if (safetyRatio >= 1.0) {
		safetyLevel = "danger";
		if (epiRatio >= 1.0 && hasCardio) {
			warningMessage = `ВНИМАНИЕ: Превышен кардиологический лимит адреналина (${crossCheck.totalEpinephrineMg} мг из макс. ${crossCheck.maxSafeEpinephrineMg} мг / ${maxSafeCarpules} карп.)!`;
		} else {
			warningMessage = `ВНИМАНИЕ: Превышена максимально допустимая доза анестетика (${totalDoseMg} мг из макс. ${maxSafeDoseMg} мг)! Риск системной токсичности.`;
		}
	} else if (warningAlert) {
		safetyLevel = "warning";
		warningMessage = warningAlert.message;
	} else if (safetyRatio >= 0.8) {
		safetyLevel = "warning";
		warningMessage = `Предупреждение: Введено ${safetyPercentage}% от предельно допустимой дозы (${totalDoseMg} мг / ${maxSafeDoseMg} мг). Ограничьте дальнейшее введение.`;
	} else if (cautionAlert) {
		safetyLevel = "caution";
		warningMessage = cautionAlert.message;
	} else if (safetyRatio >= 0.5) {
		safetyLevel = "caution";
		warningMessage = `Умеренная дозировка: ${safetyPercentage}% от лимита массы тела (${weight} кг).`;
	}

	return {
		drug,
		patientWeightKg: weight,
		isPediatric,
		effectiveMaxMgPerKg,
		carpulesCount: carpules,
		totalVolumeMl,
		totalDoseMg,
		maxSafeDoseMg,
		maxSafeVolumeMl,
		maxSafeCarpules,
		mrdDoseMg: maxSafeDoseMg,
		mrdVolumeMl: maxSafeVolumeMl,
		mrdCarpules: maxSafeCarpules,
		totalEpinephrineMg: crossCheck.totalEpinephrineMg,
		maxSafeEpinephrineMg: crossCheck.maxSafeEpinephrineMg,
		safetyRatio,
		safetyLevel,
		safetyPercentage,
		warningMessage,
		somaticProfile: params.somaticProfile,
		somaticAlerts: crossCheck.alerts,
		recommendedDrugKey: crossCheck.recommendedDrugKey,
		isCardioRestricted,
		cardioLimitBadgeText: isCardioRestricted ? CARDIO_LIMIT_BADGE_TEXT : null,
		cardioLimitDetails: isCardioRestricted ? crossCheck.cardioLimitDetails : null,
	};
}

/**
 * Рассчитывает максимальную разовую дозу (МРД) анестетика в мг, мл и карпулах
 * на основе точной массы тела пациента и соматических кардио-ограничений.
 */
export function calculatePatientMrd(params: {
	drugKey: AnesthesiaDrugKey;
	patientWeightKg: number;
	patientAgeYears?: number | null | undefined;
	isPediatric?: boolean | undefined;
	isCardioRestricted?: boolean | undefined;
	isEpinephrineBlocked?: boolean | undefined;
}): PatientMrdCalculation {
	const drug = ANESTHESIA_DRUGS[params.drugKey] ?? ANESTHESIA_DRUGS.ultracain_ds;
	const weight = Math.max(
		5,
		Math.min(
			250,
			Number.isFinite(params.patientWeightKg) && params.patientWeightKg > 0
				? params.patientWeightKg
				: 70,
		),
	);
	const isPediatric = Boolean(
		params.isPediatric ||
			(params.patientAgeYears !== null &&
				params.patientAgeYears !== undefined &&
				params.patientAgeYears < 18),
	);
	const maxDoseMgPerKg =
		isPediatric && drug.maxDoseMgPerKgPediatric
			? drug.maxDoseMgPerKgPediatric
			: drug.maxDoseMgPerKg;

	const weightLimitMg = Math.round(weight * maxDoseMgPerKg * 10) / 10;
	let mrdDoseMg = isPediatric ? weightLimitMg : Math.min(weightLimitMg, drug.absoluteMaxDoseMg);
	const isCappedByAbsoluteMax = !isPediatric && weightLimitMg > drug.absoluteMaxDoseMg;

	let mrdCarpules =
		drug.mgPerCarpule > 0 ? Math.floor((mrdDoseMg / drug.mgPerCarpule) * 10) / 10 : 0;

	let isCappedByCardio = false;
	let maxSafeEpinephrineMg = HEALTHY_MAX_EPINEPHRINE_MG;

	if (params.isEpinephrineBlocked && !drug.isAdrenalineFree) {
		maxSafeEpinephrineMg = 0.0;
		mrdCarpules = 0;
		mrdDoseMg = 0;
		isCappedByCardio = true;
	} else if (
		params.isCardioRestricted &&
		!drug.isAdrenalineFree &&
		drug.epinephrineMgPerCarpule > 0
	) {
		maxSafeEpinephrineMg = CARDIO_MAX_EPINEPHRINE_MG;
		const maxCardioCarp =
			drug.vasoconstrictorRatio === "1:100000"
				? 2.0
				: drug.vasoconstrictorRatio === "1:200000"
					? 4.0
					: Math.floor((CARDIO_MAX_EPINEPHRINE_MG / drug.epinephrineMgPerCarpule) * 10) / 10;

		if (maxCardioCarp < mrdCarpules) {
			mrdCarpules = maxCardioCarp;
			mrdDoseMg = Math.min(mrdDoseMg, Math.round(mrdCarpules * drug.mgPerCarpule * 10) / 10);
			isCappedByCardio = true;
		}
	}

	const mrdVolumeMl = Math.round(mrdCarpules * drug.volumeMlPerCarpule * 100) / 100;
	const formattedNoteRu =
		params.isEpinephrineBlocked && !drug.isAdrenalineFree
			? `МРД (${drug.commercialName}): 0 мг / 0 карп. [${EPINEPHRINE_BLOCKED_BADGE_TEXT}]`
			: `МРД (${drug.commercialName}, ${weight} кг${isPediatric ? ", дети" : ""}): ${mrdDoseMg} мг (${mrdVolumeMl} мл / ${mrdCarpules} карп.)${isCappedByCardio ? ` [${CARDIO_LIMIT_BADGE_TEXT}: <= 0.04 мг адреналина]` : ""}`;

	return {
		drugKey: drug.key,
		commercialName: drug.commercialName,
		activeSubstance: drug.activeSubstance,
		patientWeightKg: weight,
		isPediatric,
		maxDoseMgPerKg,
		mrdDoseMg,
		mrdVolumeMl,
		mrdCarpules,
		isCappedByAbsoluteMax,
		isCappedByCardio,
		maxSafeEpinephrineMg,
		cardioLimitBadgeText:
			params.isEpinephrineBlocked && !drug.isAdrenalineFree
				? EPINEPHRINE_BLOCKED_BADGE_TEXT
				: isCappedByCardio
					? CARDIO_LIMIT_BADGE_TEXT
					: null,
		formattedNoteRu,
	};
}

/**
 * Автоматически сканирует соматический статус пациента и подбирает безопасный препарат,
 * выставляя жесткие дозировки, кардио-лимиты и бейджи без необходимости ручного подбора врачом.
 */
export function resolveAutopilotAnesthesia(params: {
	somaticProfile?: SomaticRiskProfile | undefined;
	patientWeightKg?: number | undefined;
	patientAgeYears?: number | null | undefined;
	isPediatric?: boolean | undefined;
}): AutopilotResolutionResult {
	const somatic = params.somaticProfile ?? {};
	const hasAsthmaOrSulfite = Boolean(
		somatic.hasSulfiteAllergy || somatic.hasBronchialAsthma,
	);
	const isPregnant = Boolean(
		somatic.isPregnantOrLactating ||
			(somatic.pregnancyTrimester && somatic.pregnancyTrimester !== "none"),
	);
	const isEpinephrineBlocked = Boolean(
		somatic.hasSevereHypertensionStage3 ||
			somatic.hasThyrotoxicosis ||
			somatic.takesBetaBlockers,
	);
	const hasCardio = Boolean(
		somatic.hasCardiovascularRisk ||
			somatic.hasHypertension ||
			somatic.hasIhd ||
			somatic.hasArrhythmia ||
			isEpinephrineBlocked,
	);

	let selectedDrugKey: AnesthesiaDrugKey = "ultracain_ds_forte";
	let rationaleRu =
		"Стандартный соматический статус без отягощающих факторов. Препарат выбора — Ультракаин Д-С Форте 1:100 000.";
	let badgeText = "Ультракаин Д-С Форте 1:100k (Стандарт)";

	// 0. Аллергия на артикаин -> Скандонест 3%
	if (somatic.hasArticaineAllergy) {
		selectedDrugKey = somatic.hasMepivacaineAllergy ? "lidocaine_2" : "scandonest_3";
		rationaleRu =
			"Аллергия на артикаин (Ультракаин): артикаин-содержащие препараты категорически запрещены. Автовыбор — Скандонест 3% (Мепивакаин).";
		badgeText = "Скандонест 3% (Аллергия на артикаин)";
	}
	// 1. Абсолютный запрет адреналина (Тиреотоксикоз, АГ III ст., Бета-блокаторы)
	else if (isEpinephrineBlocked) {
		selectedDrugKey = "scandonest_3";
		const reasonStr = somatic.hasThyrotoxicosis
			? "тиреотоксикоз (МКБ-10 E05)"
			: somatic.takesBetaBlockers
				? "прием бета-блокаторов"
				: "артериальная гипертензия III стадии";
		rationaleRu = `Тяжелый соматический риск (${reasonStr}): адреналин абсолютно противопоказан из-за риска криза и аритмии. Автовыбор — Скандонест 3% (Мепивакаин без адреналина).`;
		badgeText = "Скандонест 3% (⛔ Адреналин запрещен)";
	}
	// 2. Бронхиальная астма / Аллергия на сульфиты -> Скандонест 3%
	else if (hasAsthmaOrSulfite) {
		selectedDrugKey = "scandonest_3";
		rationaleRu =
			"Бронхиальная астма (J45) / аллергия на сульфиты: метабисульфит натрия (E223) в адреналиновых растворах противопоказан из-за риска бронхоспазма. Автовыбор — Скандонест 3% (Мепивакаин без вазоконстриктора и сульфитов).";
		badgeText = "Скандонест 3% (Астма / Без сульфитов)";
	}
	// 3. Беременность / Лактация -> Ультракаин Д-С 1:200 000
	else if (isPregnant) {
		selectedDrugKey = "ultracain_ds";
		rationaleRu =
			"Беременность / период лактации: золотой стандарт СтАР — Артикаин 4% с пониженной концентрацией адреналина 1:200 000 (Ультракаин Д-С). Высокое связывание с белками (95%), минимальный плацентарный переход.";
		badgeText = "Ультракаин Д-С 1:200k (Беременность / Лактация)";
	}
	// 4. Сердечно-сосудистые заболевания / Гипертония / ИБС / Аритмия -> Скандонест 3% или адреналиновый лимит
	else if (hasCardio) {
		selectedDrugKey = "scandonest_3";
		rationaleRu =
			"Гипертоническая болезнь (I10–I15) / ИБС / Аритмия: препарат выбора — Скандонест 3% без вазоконстриктора. При использовании адреналина действует жесткий кардиологический лимит 0.04 мг (макс. 2 карпулы 1:100k или 4 карпулы 1:200k).";
		badgeText = "Скандонест 3% (Кардио-безопасный)";
	}

	const weight = params.patientWeightKg ?? 70;
	const isCardioRestricted = hasCardio && !ANESTHESIA_DRUGS[selectedDrugKey].isAdrenalineFree;
	const mrd = calculatePatientMrd({
		drugKey: selectedDrugKey,
		patientWeightKg: weight,
		patientAgeYears: params.patientAgeYears,
		isPediatric: params.isPediatric,
		isCardioRestricted: hasCardio,
		isEpinephrineBlocked,
	});

	const crossCheck = checkAnesthesiaSomaticContraindications({
		drugKey: selectedDrugKey,
		somaticProfile: somatic,
		carpulesCount: 1,
	});

	return {
		selectedDrugKey,
		drug: ANESTHESIA_DRUGS[selectedDrugKey],
		rationaleRu,
		badgeText,
		isCardioRestricted,
		cardioLimitBadgeText: isEpinephrineBlocked
			? EPINEPHRINE_BLOCKED_BADGE_TEXT
			: hasCardio
				? CARDIO_LIMIT_BADGE_TEXT
				: null,
		mrdDoseMg: mrd.mrdDoseMg,
		mrdVolumeMl: mrd.mrdVolumeMl,
		mrdCarpules: mrd.mrdCarpules,
		maxSafeVolumeMl: mrd.mrdVolumeMl,
		maxSafeEpinephrineMg: mrd.maxSafeEpinephrineMg,
		crossCheck,
	};
}

/**
 * Генерирует клиническую запись анестезии по стандарту формы 043/у с учетом соматического статуса.
 */
export function formatAnesthesiaSoapText(params: AnesthesiaSoapRecordParams): string {
	const drug = ANESTHESIA_DRUGS[params.drugKey] ?? ANESTHESIA_DRUGS.ultracain_ds;
	const method = ANESTHESIA_METHODS[params.methodKey] ?? ANESTHESIA_METHODS.infiltration;
	const calc = calculateVisitAnesthesiaSafety({
		drugKey: params.drugKey,
		patientWeightKg: params.patientWeightKg ?? 70,
		carpulesCount: params.carpulesCount,
		patientAgeYears: params.patientAgeYears,
		isPediatric: params.isPediatric,
		somaticProfile: params.somaticProfile,
		...(params.customVolumeMl !== undefined ? { customVolumeMl: params.customVolumeMl } : {}),
	});

	const toothSuffix = params.toothNumber ? ` в области зуба ${params.toothNumber}` : "";
	const aspirationStr =
		params.aspirationTestPassed !== false
			? "Аспирационная проба отрицательная."
			: "Внимание: при повторной аспирационной пробе кровь не получена.";

	const reactionStr =
		params.reactionNormal !== false
			? "Аллергических и токсических реакций не наблюдалось, общее самочувствие пациента удовлетворительное."
			: "Пациент под постоянным мониторингом гемодинамики.";

	const timeStr = params.anesthesiaStartTime ? ` Время начала: ${params.anesthesiaStartTime}.` : "";

	// Соматические обоснования для записи
	const somaticNotes: string[] = [];
	const hasCardio = Boolean(
		params.somaticProfile?.hasCardiovascularRisk ||
			params.somaticProfile?.hasHypertension ||
			params.somaticProfile?.hasIhd ||
			params.somaticProfile?.hasArrhythmia,
	);

	if (hasCardio) {
		if (drug.isAdrenalineFree) {
			somaticNotes.push(
				"Соматический статус: Кардиоваскулярный риск / Гипертензия (I10-I15) — применен препарат без вазоконстриктора.",
			);
		} else {
			somaticNotes.push(
				`Соматический статус: Кардиоваскулярный риск — доза адреналина строго контролирована (${calc.totalEpinephrineMg} мг <= 0.04 мг).`,
			);
		}
	}
	if (
		params.somaticProfile?.hasSulfiteAllergy ||
		params.somaticProfile?.hasBronchialAsthma
	) {
		somaticNotes.push(
			"Аллергоанамнез: Бронхиальная астма / аллергия на сульфиты — применен безсульфитный препарат.",
		);
	}
	if (
		params.somaticProfile?.isPregnantOrLactating ||
		(params.somaticProfile?.pregnancyTrimester &&
			params.somaticProfile.pregnancyTrimester !== "none")
	) {
		somaticNotes.push(
			"Соматический статус: Беременность/лактация — применен препарат выбора с пониженным содержанием вазоконстриктора 1:200 000.",
		);
	}

	const somaticStr = somaticNotes.length > 0 ? ` ${somaticNotes.join(" ")}` : "";
	const batchPart = params.carpuleBatch?.seriesNumber
		? ` [Серия: ${params.carpuleBatch.seriesNumber}, Партия: ${params.carpuleBatch.batchNumber}, Годен до: ${params.carpuleBatch.expirationDate}]`
		: "";
	const nursePart = params.nurseFullName ? ` Медсестра/ассистент: ${params.nurseFullName}.` : "";
	const vitalsPart =
		params.vitals &&
		typeof params.vitals.bpSystolic === "number" &&
		typeof params.vitals.heartRateBpm === "number"
			? ` Исходные гемодинамические показатели: АД ${params.vitals.bpSystolic}/${params.vitals.bpDiastolic ?? 80} мм рт. ст., ЧСС ${params.vitals.heartRateBpm} уд/мин${typeof params.vitals.spo2Percent === "number" ? `, SpO2 ${params.vitals.spo2Percent}%` : ""}.`
			: "";

	return `Обезболивание: ${method.nameRu} анестезия${toothSuffix} препаратом «${drug.commercialName}» (${drug.activeSubstance})${batchPart} в объеме ${calc.totalVolumeMl} мл (${params.carpulesCount} карп., ${calc.totalDoseMg} мг действующего вещества).${somaticStr}${vitalsPart} ${aspirationStr}${timeStr} Наступление анестезии через ${method.typicalOnsetMinutes} мин. Глубина обезболивания достаточная. ${reactionStr}${nursePart}`;
}
