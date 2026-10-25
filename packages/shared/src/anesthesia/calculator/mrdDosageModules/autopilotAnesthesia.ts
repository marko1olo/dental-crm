/**
 * @dental/shared/anesthesia/calculator/mrdDosageModules/autopilotAnesthesia.ts
 * Autopilot Anesthesia Selection Based on Somatic Risk (Mandate 8b, <= 120 lines)
 */

import {
	ANESTHESIA_DRUGS,
	CARDIO_LIMIT_BADGE_TEXT,
	EPINEPHRINE_BLOCKED_BADGE_TEXT,
} from "../drugCatalog.js";
import {
	checkAnesthesiaSomaticContraindications,
	resolveClinicalDefaultWeightKg,
} from "../somaticRiskAdjuster.js";
import type {
	AnesthesiaDrugKey,
	AutopilotResolutionResult,
	SomaticRiskProfile,
} from "../types.js";
import { calculatePatientMrd } from "./patientMrdCalculator.js";

export function resolveAutopilotAnesthesia(params: {
	somaticProfile?: SomaticRiskProfile | undefined;
	patientWeightKg?: number | undefined;
	patientAgeYears?: number | null | undefined;
	isPediatric?: boolean | undefined;
}): AutopilotResolutionResult {
	const somatic = params.somaticProfile ?? {};
	const hasAsthmaOrSulfite = Boolean(somatic.hasSulfiteAllergy || somatic.hasBronchialAsthma);
	const isPregnant = Boolean(somatic.isPregnantOrLactating || (somatic.pregnancyTrimester && somatic.pregnancyTrimester !== "none"));
	const isEpinephrineBlocked = Boolean(somatic.hasSevereHypertensionStage3 || somatic.hasThyrotoxicosis || somatic.takesBetaBlockers);
	const hasCardio = Boolean(
		somatic.hasCardiovascularRisk ||
			somatic.hasHypertension ||
			somatic.hasIhd ||
			somatic.hasArrhythmia ||
			isEpinephrineBlocked,
	);

	let selectedDrugKey: AnesthesiaDrugKey = "ultracain_ds_forte";
	let rationaleRu = "Стандартный статус. Препарат выбора — Ультракаин Д-С Форте 1:100 000.";
	let badgeText = "Ультракаин Д-С Форте 1:100k (Стандарт)";

	if (somatic.hasArticaineAllergy) {
		selectedDrugKey = somatic.hasMepivacaineAllergy ? "lidocaine_2" : "scandonest_3";
		rationaleRu = "Аллергия на артикаин. Автовыбор — Скандонест 3% (Мепивакаин).";
		badgeText = "Скандонест 3% (Аллергия на артикаин)";
	} else if (isEpinephrineBlocked) {
		selectedDrugKey = "scandonest_3";
		rationaleRu = "Тяжелый кардио-риск: адреналин противопоказан. Автовыбор — Скандонест 3%.";
		badgeText = "Скандонест 3% (⛔ Адреналин запрещен)";
	} else if (hasAsthmaOrSulfite) {
		selectedDrugKey = "scandonest_3";
		rationaleRu = "Бронхиальная астма / аллергия на сульфиты: автовыбор — Скандонест 3% без вазоконстриктора.";
		badgeText = "Скандонест 3% (Астма / Без сульфитов)";
	} else if (isPregnant) {
		selectedDrugKey = "ultracain_ds";
		rationaleRu = "Беременность / лактация: Артикаин 4% с пониженной концентрацией адреналина 1:200 000 (Ультракаин Д-С).";
		badgeText = "Ультракаин Д-С 1:200k (Беременность / Лактация)";
	} else if (hasCardio) {
		selectedDrugKey = "scandonest_3";
		rationaleRu = "Кардиоваскулярный риск: препарат выбора — Скандонест 3% без вазоконстриктора.";
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
