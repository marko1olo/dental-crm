/**
 * @dental/shared/anesthesia/calculator/somaticAdjusterModules/somaticCheckEngine.ts
 * Main contraindications checker orchestration (Mandate 8b, <= 120 lines)
 */

import { ANESTHESIA_DRUGS, CARDIO_LIMIT_BADGE_TEXT, CARDIO_MAX_EPINEPHRINE_MG, HEALTHY_MAX_EPINEPHRINE_MG } from "../drugCatalog.js";
import type { AnesthesiaDrugKey, SomaticCrossCheckResult, SomaticRiskProfile } from "../types.js";
import { checkAllergiesAndEpiBlock } from "./somaticAllergyCheck.js";
import { checkCardioAsthmaPregnancy } from "./somaticCardioCheck.js";

export function checkAnesthesiaSomaticContraindications(params: {
	drugKey: AnesthesiaDrugKey;
	somaticProfile?: SomaticRiskProfile | undefined;
	carpulesCount?: number | undefined;
}): SomaticCrossCheckResult {
	const drug = ANESTHESIA_DRUGS[params.drugKey] ?? ANESTHESIA_DRUGS.ultracain_ds;
	const somatic = params.somaticProfile ?? {};
	const carpules = Math.max(0, Number.isFinite(params.carpulesCount) ? (params.carpulesCount ?? 1) : 1);
	const totalEpinephrineMg = Math.round(carpules * drug.epinephrineMgPerCarpule * 10000) / 10000;
	const isEpinephrineBlocked = Boolean(somatic.hasSevereHypertensionStage3 || somatic.hasThyrotoxicosis || somatic.takesBetaBlockers);
	const hasCardio = Boolean(somatic.hasCardiovascularRisk || somatic.hasHypertension || somatic.hasIhd || somatic.hasArrhythmia || isEpinephrineBlocked);
	const hasAsthmaOrSulfite = Boolean(somatic.hasSulfiteAllergy || somatic.hasBronchialAsthma);
	const isPregnant = Boolean(somatic.isPregnantOrLactating || (somatic.pregnancyTrimester && somatic.pregnancyTrimester !== "none"));

	const isCardioRestricted = (hasCardio || isEpinephrineBlocked) && !drug.isAdrenalineFree;
	const maxSafeEpinephrineMg = isEpinephrineBlocked ? 0.0 : isCardioRestricted ? CARDIO_MAX_EPINEPHRINE_MG : HEALTHY_MAX_EPINEPHRINE_MG;

	let maxCardioCarpules: number | null = null;
	if (isEpinephrineBlocked && !drug.isAdrenalineFree) {
		maxCardioCarpules = 0;
	} else if (!drug.isAdrenalineFree && drug.epinephrineMgPerCarpule > 0) {
		if (drug.vasoconstrictorRatio === "1:100000") maxCardioCarpules = 2.0;
		else if (drug.vasoconstrictorRatio === "1:200000") maxCardioCarpules = 4.0;
		else maxCardioCarpules = Math.floor((CARDIO_MAX_EPINEPHRINE_MG / drug.epinephrineMgPerCarpule) * 10) / 10;
	}

	const res1 = checkAllergiesAndEpiBlock(drug, somatic, isEpinephrineBlocked);
	const res2 = checkCardioAsthmaPregnancy(drug, somatic, { hasCardio, hasAsthmaOrSulfite, isPregnant, totalEpinephrineMg, maxCardioCarpules });

	const alerts = [...res1.alerts, ...res2.alerts];
	const recommendedDrugKey = res1.recommendedDrugKey ?? res2.recommendedDrugKey;
	const hasContraindications = res1.hasContraindications || res2.hasContraindications;

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
