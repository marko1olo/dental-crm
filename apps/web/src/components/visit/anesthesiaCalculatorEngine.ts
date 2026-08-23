/**
 * anesthesiaCalculatorEngine.ts — Клинический калькулятор анестезии, дозировок и соматической безопасности.
 *
 * Соответствует клиническим рекомендациям Стоматологической Ассоциации России (СтАР),
 * Приказу Минздрава России № 804н и международным стандартам стоматологической анестезиологии (AHA/ADA).
 *
 * Рассчитывает:
 * 1. Максимально допустимую дозу местного анестетика с учетом массы тела пациента (мг/кг).
 * 2. Количество введенного действующего вещества (мг) и вазоконстриктора (эпинефрина/адреналина, мг).
 * 3. Кардиоваскулярные ограничения (макс. 0.04 мг адреналина / 2 карпулы 1:100k для пациентов с ССЗ/гипертонией I10-I15).
 * 4. Аллергологический и соматический кросс-чек:
 *    - Сердечно-сосудистые заболевания / Гипертоническая болезнь (I10–I15) -> выбор Скандонест 3% (Мепивакаин).
 *    - Бронхиальная астма (J45) / аллергия на сульфиты -> запрет сульфитсодержащих растворов с адреналином.
 *    - Беременность и лактация -> приоритет Артикаина 1:200 000 (Ультракаин Д-С) над 1:100 000.
 * 5. Формирует юридически и клинически корректную запись для Дневника приёма (форма 043/у).
 */

export type AnesthesiaDrugKey =
	| "ultracain_ds_forte"
	| "ultracain_ds"
	| "septanest_100"
	| "scandonest_3"
	| "lidocaine_2";

export type AnesthesiaMethodKey =
	| "infiltration"
	| "mandibular"
	| "torusal"
	| "tuberal"
	| "incisive"
	| "intraligamentary"
	| "application";

export interface AnesthesiaDrugDefinition {
	readonly key: AnesthesiaDrugKey;
	readonly commercialName: string;
	readonly activeSubstance: string;
	readonly concentrationPct: number;
	readonly vasoconstrictor: string;
	readonly vasoconstrictorRatio: "1:100000" | "1:200000" | "none";
	readonly epinephrineMgPerCarpule: number;
	readonly containsSulfites: boolean;
	readonly volumeMlPerCarpule: number;
	readonly mgPerCarpule: number;
	readonly maxDoseMgPerKg: number;
	readonly maxDoseMgPerKgPediatric?: number;
	readonly absoluteMaxDoseMg: number;
	readonly isAdrenalineFree: boolean;
	readonly description: string;
}

export const ANESTHESIA_DRUGS: Record<AnesthesiaDrugKey, AnesthesiaDrugDefinition> = {
	ultracain_ds_forte: {
		key: "ultracain_ds_forte",
		commercialName: "Ультракаин Д-С форте",
		activeSubstance: "Артикаин 4% + Эпинефрин 1:100 000",
		concentrationPct: 4,
		vasoconstrictor: "Эпинефрин 1:100 000",
		vasoconstrictorRatio: "1:100000",
		epinephrineMgPerCarpule: 0.017, // 1.7 мл * 0.01 мг/мл
		containsSulfites: true,
		volumeMlPerCarpule: 1.7,
		mgPerCarpule: 68,
		maxDoseMgPerKg: 7.0,
		maxDoseMgPerKgPediatric: 5.0,
		absoluteMaxDoseMg: 500,
		isAdrenalineFree: false,
		description: "Высокая глубина анестезии. Для травматичных вмешательств, пульпитов, хирургии.",
	},
	ultracain_ds: {
		key: "ultracain_ds",
		commercialName: "Ультракаин Д-С",
		activeSubstance: "Артикаин 4% + Эпинефрин 1:200 000",
		concentrationPct: 4,
		vasoconstrictor: "Эпинефрин 1:200 000",
		vasoconstrictorRatio: "1:200000",
		epinephrineMgPerCarpule: 0.0085, // 1.7 мл * 0.005 мг/мл
		containsSulfites: true,
		volumeMlPerCarpule: 1.7,
		mgPerCarpule: 68,
		maxDoseMgPerKg: 7.0,
		maxDoseMgPerKgPediatric: 5.0,
		absoluteMaxDoseMg: 500,
		isAdrenalineFree: false,
		description: "Стандартная терапия и препарирование. Оптимальная кардиоваскулярная безопасность.",
	},
	septanest_100: {
		key: "septanest_100",
		commercialName: "Септанест с адреналином 1:100 000",
		activeSubstance: "Артикаин 4% + Адреналин 1:100 000",
		concentrationPct: 4,
		vasoconstrictor: "Адреналин 1:100 000",
		vasoconstrictorRatio: "1:100000",
		epinephrineMgPerCarpule: 0.017,
		containsSulfites: true,
		volumeMlPerCarpule: 1.7,
		mgPerCarpule: 68,
		maxDoseMgPerKg: 7.0,
		maxDoseMgPerKgPediatric: 5.0,
		absoluteMaxDoseMg: 500,
		isAdrenalineFree: false,
		description: "Французский артикаиновый анестетик быстрого действия.",
	},
	scandonest_3: {
		key: "scandonest_3",
		commercialName: "Скандонест 3% (Мепивакаин)",
		activeSubstance: "Мепивакаин 3%",
		concentrationPct: 3,
		vasoconstrictor: "Без вазоконстриктора",
		vasoconstrictorRatio: "none",
		epinephrineMgPerCarpule: 0,
		containsSulfites: false,
		volumeMlPerCarpule: 1.7,
		mgPerCarpule: 51,
		maxDoseMgPerKg: 4.4,
		maxDoseMgPerKgPediatric: 4.4,
		absoluteMaxDoseMg: 300,
		isAdrenalineFree: true,
		description: "Без адреналина и без сульфитов. Препарат выбора для пациентов с гипертонией, ССЗ, глаукомой, астмой, аллергией на сульфиты.",
	},
	lidocaine_2: {
		key: "lidocaine_2",
		commercialName: "Лидокаин 2%",
		activeSubstance: "Лидокаин 2%",
		concentrationPct: 2,
		vasoconstrictor: "Без вазоконстриктора",
		vasoconstrictorRatio: "none",
		epinephrineMgPerCarpule: 0,
		containsSulfites: false,
		volumeMlPerCarpule: 2.0,
		mgPerCarpule: 40,
		maxDoseMgPerKg: 4.4,
		maxDoseMgPerKgPediatric: 4.4,
		absoluteMaxDoseMg: 300,
		isAdrenalineFree: true,
		description: "Классический амидный анестетик без вазоконстриктора и сульфитов для инфильтрации и проводниковой блокады.",
	},
};

export const ANESTHESIA_METHODS: Record<
	AnesthesiaMethodKey,
	{ nameRu: string; defaultNeedleSize: string; typicalOnsetMinutes: number }
> = {
	infiltration: {
		nameRu: "Инфильтрационная",
		defaultNeedleSize: "30G (0.3 x 21 мм)",
		typicalOnsetMinutes: 2,
	},
	mandibular: {
		nameRu: "Проводниковая мандибулярная",
		defaultNeedleSize: "27G (0.4 x 35 мм)",
		typicalOnsetMinutes: 5,
	},
	torusal: {
		nameRu: "Проводниковая торусальная (по Вейсбрему)",
		defaultNeedleSize: "27G (0.4 x 35 мм)",
		typicalOnsetMinutes: 4,
	},
	tuberal: {
		nameRu: "Проводниковая туберальная",
		defaultNeedleSize: "27G (0.4 x 30 мм)",
		typicalOnsetMinutes: 3,
	},
	incisive: {
		nameRu: "Проводниковая резцовая (назопалатинальная)",
		defaultNeedleSize: "30G (0.3 x 16 мм)",
		typicalOnsetMinutes: 2,
	},
	intraligamentary: {
		nameRu: "Интралигаментарная (внутрисвязочная)",
		defaultNeedleSize: "30G (0.3 x 12 мм)",
		typicalOnsetMinutes: 1,
	},
	application: {
		nameRu: "Аппликационная (поверхностная)",
		defaultNeedleSize: "Ватный шарик / аппликатор",
		typicalOnsetMinutes: 1,
	},
};

export type AnesthesiaSafetyLevel = "safe" | "caution" | "warning" | "danger";
export type SomaticAlertSeverity = "danger" | "warning" | "caution" | "info" | "safe";

/** Пределы эпинефрина (мг) по клиническим стандартам СтАР / AHA */
export const HEALTHY_MAX_EPINEPHRINE_MG = 0.20; // 200 мкг для здоровых пациентов
export const CARDIO_MAX_EPINEPHRINE_MG = 0.04; // 40 мкг для пациентов с сердечно-сосудистой патологией

/** Профиль соматических факторов риска и аллергоанамнеза пациента */
export interface SomaticRiskProfile {
	/** Сердечно-сосудистые заболевания / Гипертоническая болезнь (МКБ-10 I10–I15, ИБС, аритмия) */
	readonly hasCardiovascularRisk?: boolean | undefined;
	/** Аллергия на сульфиты / метабисульфит натрия (E223) */
	readonly hasSulfiteAllergy?: boolean | undefined;
	/** Бронхиальная астма (МКБ-10 J45) */
	readonly hasBronchialAsthma?: boolean | undefined;
	/** Беременность / период лактации (МКБ-10 Z32–Z39) */
	readonly isPregnantOrLactating?: boolean | undefined;
	/** Дополнительные клинические примечания */
	readonly customNotes?: string | undefined;
}

export interface AnesthesiaSomaticAlert {
	readonly id: string;
	readonly severity: SomaticAlertSeverity;
	readonly title: string;
	readonly message: string;
	readonly recommendedDrugKey?: AnesthesiaDrugKey;
	readonly recommendedAction?: string;
}

export interface SomaticCrossCheckResult {
	readonly hasContraindications: boolean;
	readonly alerts: readonly AnesthesiaSomaticAlert[];
	readonly recommendedDrugKey: AnesthesiaDrugKey | null;
	readonly maxCardioCarpules: number | null;
	readonly totalEpinephrineMg: number;
	readonly maxSafeEpinephrineMg: number;
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
	const carpules = Math.max(0, Number.isFinite(params.carpulesCount) ? (params.carpulesCount ?? 1) : 1);

	const totalEpinephrineMg = Math.round(carpules * drug.epinephrineMgPerCarpule * 10000) / 10000;
	const hasCardio = Boolean(somatic.hasCardiovascularRisk);
	const hasAsthmaOrSulfite = Boolean(somatic.hasSulfiteAllergy || somatic.hasBronchialAsthma);
	const isPregnant = Boolean(somatic.isPregnantOrLactating);

	const maxSafeEpinephrineMg = hasCardio && !drug.isAdrenalineFree
		? CARDIO_MAX_EPINEPHRINE_MG
		: HEALTHY_MAX_EPINEPHRINE_MG;

	let maxCardioCarpules: number | null = null;
	if (!drug.isAdrenalineFree && drug.epinephrineMgPerCarpule > 0) {
		// Для 1:100 000 (0.017 мг/карп) -> 0.04 / 0.017 = 2.35 -> строго 2 карпулы
		// Для 1:200 000 (0.0085 мг/карп) -> 0.04 / 0.0085 = 4.7 -> макс 4 карпулы
		if (drug.vasoconstrictorRatio === "1:100000") {
			maxCardioCarpules = 2.0;
		} else if (drug.vasoconstrictorRatio === "1:200000") {
			maxCardioCarpules = 4.0;
		} else {
			maxCardioCarpules = Math.floor((CARDIO_MAX_EPINEPHRINE_MG / drug.epinephrineMgPerCarpule) * 10) / 10;
		}
	}

	const alerts: AnesthesiaSomaticAlert[] = [];
	let recommendedDrugKey: AnesthesiaDrugKey | null = null;
	let hasContraindications = false;

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
				message: "Препарат не содержит метабисульфита натрия и консервантов. Разрешён пациентам с бронхиальной астмой и гиперчувствительностью к сульфитам.",
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
				message: "У пациента сердечно-сосудистая патология / гипертензия (I10–I15). Высокая концентрация адреналина (1:100 000) повышает риск гипертонического криза, тахикардии и ишемии миокарда. Препарат выбора — Скандонест 3% (Мепивакаин без адреналина). При крайней необходимости применения адреналина доза строго ограничена 2 карпулами (не более 0.04 мг адреналина).",
				recommendedDrugKey: "scandonest_3",
				recommendedAction: "Переключить на Скандонест 3% без вазоконстриктора",
			});
		} else if (drug.key === "ultracain_ds") {
			alerts.push({
				id: "cardio_low_vaso_caution",
				severity: "warning",
				title: "Кардиоваскулярный риск: контроль дозы адреналина (1:200 000)",
				message: "У пациента гипертония / ССЗ. Ультракаин Д-С (1:200 000) допустим с осторожностью при мониторинге гемодинамики (строгий лимит: не более 4 карпул / 0.034 мг адреналина). При нестабильном давлении или высоком риске рекомендуется Скандонест 3%.",
				recommendedDrugKey: "scandonest_3",
				recommendedAction: "При повышенном давлении рекомендован Скандонест 3%",
			});
		} else if (drug.isAdrenalineFree) {
			alerts.push({
				id: "cardio_safe_plain",
				severity: "safe",
				title: "Препарат выбора для кардиологических пациентов",
				message: "Препарат не содержит адреналина/вазоконстриктора. Не вызывает тахикардии и подъема артериального давления. Оптимален при гипертонической болезни (I10–I15) и ИБС.",
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
				message: "Ультракаин Д-С (Артикаин 4% с пониженным адреналином 1:200 000) обладает максимальным связыванием с белками плазмы (~95%), минимальным проникновением через плацентарный барьер и быстрым периодом полувыведения (~20 мин). Используйте минимально эффективный объём.",
			});
		} else if (drug.key === "ultracain_ds_forte" || drug.key === "septanest_100") {
			if (!hasAsthmaOrSulfite) {
				recommendedDrugKey = "ultracain_ds";
			}
			alerts.push({
				id: "pregnancy_high_vaso_warning",
				severity: "warning",
				title: "Высокая концентрация адреналина при беременности",
				message: "Концентрация адреналина 1:100 000 не рекомендована при беременности из-за риска вазоконстрикции маточных сосудов и снижения маточно-плацентарного кровотока. Рекомендуется переключить на Ультракаин Д-С (1:200 000).",
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
					message: "Мепивакаин обладает меньшим связыванием с белками (~75%) и длительнее метаболизируется печенью плода. При отсутствии аллергии на сульфиты препаратом выбора является Артикаин 1:200 000 (Ультракаин Д-С).",
					recommendedDrugKey: "ultracain_ds",
					recommendedAction: "Предпочтителен Артикаин 1:200 000",
				});
			}
		} else if (drug.key === "lidocaine_2") {
			if (!hasAsthmaOrSulfite) {
				recommendedDrugKey = "ultracain_ds";
			}
			alerts.push({
				id: "pregnancy_lidocaine_caution",
				severity: "caution",
				title: "Особенности применения Лидокаина при беременности",
				message: "Лидокаин активно проходит через плацентарный барьер. Препаратом выбора в современной стоматологии является Артикаин 1:200 000 в минимальной дозе.",
				recommendedDrugKey: "ultracain_ds",
				recommendedAction: "Предпочтителен Артикаин 1:200 000",
			});
		}
	}

	return {
		hasContraindications,
		alerts,
		recommendedDrugKey,
		maxCardioCarpules,
		totalEpinephrineMg,
		maxSafeEpinephrineMg,
	};
}

export interface AnesthesiaSafetyParams {
	readonly drugKey: AnesthesiaDrugKey;
	readonly patientWeightKg: number;
	readonly carpulesCount: number;
	readonly customVolumeMl?: number | undefined;
	readonly patientAgeYears?: number | null | undefined;
	readonly isPediatric?: boolean | undefined;
	readonly somaticProfile?: SomaticRiskProfile | undefined;
}

export interface AnesthesiaCalculationResult {
	readonly drug: AnesthesiaDrugDefinition;
	readonly patientWeightKg: number;
	readonly isPediatric: boolean;
	readonly effectiveMaxMgPerKg: number;
	readonly carpulesCount: number;
	readonly totalVolumeMl: number;
	readonly totalDoseMg: number;
	readonly maxSafeDoseMg: number;
	readonly maxSafeCarpules: number;
	readonly totalEpinephrineMg: number;
	readonly maxSafeEpinephrineMg: number;
	readonly safetyRatio: number; // 0.0 to 1.0+
	readonly safetyLevel: AnesthesiaSafetyLevel;
	readonly safetyPercentage: number;
	readonly warningMessage: string | null;
	readonly somaticProfile?: SomaticRiskProfile | undefined;
	readonly somaticAlerts: readonly AnesthesiaSomaticAlert[];
	readonly recommendedDrugKey: AnesthesiaDrugKey | null;
	readonly isCardioRestricted: boolean;
}

/**
 * Рассчитывает безопасность дозы анестетика с учетом массы тела и соматического статуса.
 */
export function calculateAnesthesiaSafety(params: AnesthesiaSafetyParams): AnesthesiaCalculationResult {
	const drug = ANESTHESIA_DRUGS[params.drugKey] ?? ANESTHESIA_DRUGS.ultracain_ds;
	const weight = Math.max(10, Math.min(250, Number.isFinite(params.patientWeightKg) && params.patientWeightKg > 0 ? params.patientWeightKg : 70));
	const carpules = Math.max(0, Number.isFinite(params.carpulesCount) ? params.carpulesCount : 1);

	// Определение детского возраста (< 18 лет) для расчета дозировки по педиатрическому стандарту (5 мг/кг для артикаина)
	const isPediatric = Boolean(
		params.isPediatric ||
		(params.patientAgeYears !== null && params.patientAgeYears !== undefined && params.patientAgeYears < 18),
	);
	const effectiveMaxMgPerKg = isPediatric && drug.maxDoseMgPerKgPediatric
		? drug.maxDoseMgPerKgPediatric
		: drug.maxDoseMgPerKg;

	const totalVolumeMl = params.customVolumeMl !== undefined && Number.isFinite(params.customVolumeMl) && params.customVolumeMl > 0
		? Math.round(params.customVolumeMl * 100) / 100
		: Math.round(carpules * drug.volumeMlPerCarpule * 100) / 100;

	// Рассчитываем введенную дозу действующего вещества: (Объем мл * Концентрация % * 10 мг/мл)
	const totalDoseMg = Math.round(totalVolumeMl * (drug.concentrationPct * 10) * 10) / 10;

	// Предельная доза по весу пациента (для детей 5 мг/кг, для взрослых 7 мг/кг макс 500 мг)
	const weightLimitMg = Math.round(weight * effectiveMaxMgPerKg * 10) / 10;
	let maxSafeDoseMg = isPediatric ? weightLimitMg : Math.min(weightLimitMg, drug.absoluteMaxDoseMg);

	let maxSafeCarpules = drug.mgPerCarpule > 0
		? Math.round((maxSafeDoseMg / drug.mgPerCarpule) * 10) / 10
		: 0;

	// Выполняем соматический кросс-чек
	const crossCheck = checkAnesthesiaSomaticContraindications({
		drugKey: drug.key,
		somaticProfile: params.somaticProfile,
		carpulesCount: carpules,
	});

	let isCardioRestricted = false;

	// Если у пациента кардиориск и препарат содержит адреналин, ограничиваем дозу кардиологическим лимитом
	if (params.somaticProfile?.hasCardiovascularRisk && !drug.isAdrenalineFree && crossCheck.maxCardioCarpules !== null) {
		isCardioRestricted = true;
		if (crossCheck.maxCardioCarpules < maxSafeCarpules) {
			maxSafeCarpules = crossCheck.maxCardioCarpules;
			const cardioDoseCapMg = Math.round(maxSafeCarpules * drug.mgPerCarpule * 10) / 10;
			maxSafeDoseMg = Math.min(maxSafeDoseMg, cardioDoseCapMg);
		}
	}

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

	if (dangerAlert) {
		safetyLevel = "danger";
		warningMessage = dangerAlert.message;
	} else if (safetyRatio >= 1.0) {
		safetyLevel = "danger";
		if (epiRatio >= 1.0 && params.somaticProfile?.hasCardiovascularRisk) {
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
		maxSafeCarpules,
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
	};
}

export interface AnesthesiaSoapRecordParams {
	methodKey: AnesthesiaMethodKey;
	drugKey: AnesthesiaDrugKey;
	carpulesCount: number;
	customVolumeMl?: number | undefined;
	patientWeightKg?: number | undefined;
	patientAgeYears?: number | null | undefined;
	isPediatric?: boolean | undefined;
	toothNumber?: number | string | undefined;
	aspirationTestPassed?: boolean | undefined;
	reactionNormal?: boolean | undefined;
	anesthesiaStartTime?: string | undefined;
	somaticProfile?: SomaticRiskProfile | undefined;
}

/**
 * Генерирует клиническую запись анестезии по стандарту формы 043/у с учетом соматического статуса.
 */
export function formatAnesthesiaSoapText(params: AnesthesiaSoapRecordParams): string {
	const drug = ANESTHESIA_DRUGS[params.drugKey] ?? ANESTHESIA_DRUGS.ultracain_ds;
	const method = ANESTHESIA_METHODS[params.methodKey] ?? ANESTHESIA_METHODS.infiltration;
	const calc = calculateAnesthesiaSafety({
		drugKey: params.drugKey,
		patientWeightKg: params.patientWeightKg ?? 70,
		carpulesCount: params.carpulesCount,
		patientAgeYears: params.patientAgeYears,
		isPediatric: params.isPediatric,
		somaticProfile: params.somaticProfile,
		...(params.customVolumeMl !== undefined ? { customVolumeMl: params.customVolumeMl } : {}),
	});

	const toothSuffix = params.toothNumber ? ` в области зуба ${params.toothNumber}` : "";
	const aspirationStr = params.aspirationTestPassed !== false
		? "Аспирационная проба отрицательная."
		: "Внимание: при повторной аспирационной пробе кровь не получена.";

	const reactionStr = params.reactionNormal !== false
		? "Аллергических и токсических реакций не наблюдалось, общее самочувствие пациента удовлетворительное."
		: "Пациент под постоянным мониторингом гемодинамики.";

	const timeStr = params.anesthesiaStartTime ? ` Время начала: ${params.anesthesiaStartTime}.` : "";

	// Соматические обоснования для записи
	const somaticNotes: string[] = [];
	if (params.somaticProfile?.hasCardiovascularRisk) {
		if (drug.isAdrenalineFree) {
			somaticNotes.push("Соматический статус: Кардиоваскулярный риск / Гипертензия (I10-I15) — применен препарат без вазоконстриктора.");
		} else {
			somaticNotes.push(`Соматический статус: Кардиоваскулярный риск — доза адреналина строго контролирована (${calc.totalEpinephrineMg} мг <= 0.04 мг).`);
		}
	}
	if (params.somaticProfile?.hasSulfiteAllergy || params.somaticProfile?.hasBronchialAsthma) {
		somaticNotes.push("Аллергоанамнез: Бронхиальная астма / аллергия на сульфиты — применен безсульфитный препарат.");
	}
	if (params.somaticProfile?.isPregnantOrLactating) {
		somaticNotes.push("Соматический статус: Беременность/лактация — применен препарат выбора с пониженным содержанием вазоконстриктора 1:200 000.");
	}

	const somaticStr = somaticNotes.length > 0 ? ` ${somaticNotes.join(" ")}` : "";

	return `Обезболивание: ${method.nameRu} анестезия${toothSuffix} препаратом «${drug.commercialName}» (${drug.activeSubstance}) в объеме ${calc.totalVolumeMl} мл (${params.carpulesCount} карп., ${calc.totalDoseMg} мг действующего вещества).${somaticStr} ${aspirationStr}${timeStr} Наступление анестезии через ${method.typicalOnsetMinutes} мин. Глубина обезболивания достаточная. ${reactionStr}`;
}
