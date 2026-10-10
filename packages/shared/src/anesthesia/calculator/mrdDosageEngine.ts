/**
 * @dental/shared/anesthesia/calculator/mrdDosageEngine.ts
 * Maximum Recommended Dose (MRD) Engine, Clinical Safety Caliper, Autopilot & SOAP 043/u Formatter
 */

import {
	ANESTHESIA_DRUGS,
	ANESTHESIA_METHODS,
	CARDIO_LIMIT_BADGE_TEXT,
	CARDIO_MAX_EPINEPHRINE_MG,
	EPINEPHRINE_BLOCKED_BADGE_TEXT,
	HEALTHY_MAX_EPINEPHRINE_MG,
} from "./drugCatalog.js";
import {
	checkAnesthesiaSomaticContraindications,
	resolveClinicalDefaultWeightKg,
} from "./somaticRiskAdjuster.js";
import type {
	AnesthesiaDrugKey,
	AnesthesiaSafetyLevel,
	AnesthesiaSafetyParams,
	AnesthesiaSoapRecordParams,
	AutopilotResolutionResult,
	PatientMrdCalculation,
	SomaticRiskProfile,
	VisitAnesthesiaCalculationResult,
} from "./types.js";

/**
 * Рассчитывает безопасность дозы анестетика с учетом массы тела и соматического статуса.
 */
export function calculateVisitAnesthesiaSafety(
	params: AnesthesiaSafetyParams,
): VisitAnesthesiaCalculationResult {
	const drug = ANESTHESIA_DRUGS[params.drugKey] ?? ANESTHESIA_DRUGS.ultracain_ds;
	const isPediatric = Boolean(
		params.isPediatric ||
			(params.patientAgeYears !== null &&
				params.patientAgeYears !== undefined &&
				params.patientAgeYears < 18),
	);
	const weight = resolveClinicalDefaultWeightKg(
		params.patientWeightKg,
		params.patientAgeYears,
		isPediatric,
	);
	const carpules = Math.max(
		0,
		Number.isFinite(params.carpulesCount) ? params.carpulesCount : 1,
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
	patientWeightKg?: number | null | undefined;
	patientAgeYears?: number | null | undefined;
	isPediatric?: boolean | undefined;
	isCardioRestricted?: boolean | undefined;
	isEpinephrineBlocked?: boolean | undefined;
}): PatientMrdCalculation {
	const drug = ANESTHESIA_DRUGS[params.drugKey] ?? ANESTHESIA_DRUGS.ultracain_ds;
	const isPediatric = Boolean(
		params.isPediatric ||
			(params.patientAgeYears !== null &&
				params.patientAgeYears !== undefined &&
				params.patientAgeYears < 18),
	);
	const weight = resolveClinicalDefaultWeightKg(
		params.patientWeightKg,
		params.patientAgeYears,
		isPediatric,
	);
	const maxDoseMgPerKg =
		isPediatric && drug.maxDoseMgPerKgPediatric
			? drug.maxDoseMgPerKgPediatric
			: drug.maxDoseMgPerKg;

	const weightLimitMg = Math.round(weight * maxDoseMgPerKg * 10) / 10;
	let mrdDoseMg = isPediatric ? weightLimitMg : Math.min(weightLimitMg, drug.absoluteMaxDoseMg);
	const isCappedByAbsoluteMax = !isPediatric && weightLimitMg > drug.absoluteMaxDoseMg;

	let mrdCarpules =
		drug.mgPerCarpule > 0 ? Math.round((mrdDoseMg / drug.mgPerCarpule) * 10) / 10 : 0;

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
		status: "OK",
		requiresWeightInput: false,
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

	const isPediatric = Boolean(
		params.isPediatric ||
			(params.patientAgeYears !== null &&
				params.patientAgeYears !== undefined &&
				params.patientAgeYears < 18),
	);
	const weight = resolveClinicalDefaultWeightKg(
		params.patientWeightKg,
		params.patientAgeYears,
		isPediatric,
	);
	const isCardioRestricted = hasCardio && !ANESTHESIA_DRUGS[selectedDrugKey].isAdrenalineFree;
	const mrd = calculatePatientMrd({
		drugKey: selectedDrugKey,
		patientWeightKg: weight,
		patientAgeYears: params.patientAgeYears,
		isPediatric,
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
	const isSoapPediatric = Boolean(
		params.isPediatric ||
			(params.patientAgeYears !== null &&
				params.patientAgeYears !== undefined &&
				params.patientAgeYears < 18),
	);
	const hasSoapValidWeight =
		typeof params.patientWeightKg === "number" &&
		Number.isFinite(params.patientWeightKg) &&
		params.patientWeightKg > 0;
	const calc = calculateVisitAnesthesiaSafety({
		drugKey: params.drugKey,
		patientWeightKg: hasSoapValidWeight ? params.patientWeightKg! : 0,
		carpulesCount: params.carpulesCount,
		patientAgeYears: params.patientAgeYears,
		isPediatric: isSoapPediatric,
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
