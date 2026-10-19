/**
 * anesthesiaDrugCatalogData.ts — Anesthetic Drugs Catalog Data
 * Standards: Минздрав РФ / СтАР. Mandate 8b (<= 120 lines).
 */

import {
	type AnestheticDrugInfo,
	DENTAL_ANESTHETICS,
} from "../../anesthesia/anesthesiaCatalog";
import type {
	AnestheticDrugKey,
	AnestheticDrugSpec,
} from "./anesthesiaTechniqueTypes";

function toDrugSpec(
	d: AnestheticDrugInfo,
	drugId: AnestheticDrugKey,
): AnestheticDrugSpec {
	return {
		drugId,
		tradeNamesRu: d.tradeNamesRu,
		activeSubstanceRu: d.activeSubstanceRu,
		activeConcentrationPercent: d.activeConcentrationPercent,
		mgPerMlActive: d.mgPerMlActive,
		vasoconstrictorRatio: d.vasoconstrictorRatio,
		vasoconstrictorNameRu: d.vasoconstrictorNameRu,
		epinephrineMgPerMl: d.epinephrineMgPerMl,
		standardCarpuleVolumeMl: d.carpuleVolumeMl,
		maxDoseMgPerKgAdult: d.maxDoseMgPerKgAdult,
		absoluteMaxDoseMgAdult: d.absoluteMaxDoseMgAdult,
		isAdrenalineFree: d.isAdrenalineFree,
		containsSulfites: d.containsSulfites,
	};
}

export const ANESTHETIC_DRUGS_CATALOG: Record<
	AnestheticDrugKey,
	AnestheticDrugSpec
> = {
	articaine_1_100k: toDrugSpec(
		DENTAL_ANESTHETICS.articaine_1_100k,
		"articaine_1_100k",
	),
	articaine_1_200k: toDrugSpec(
		DENTAL_ANESTHETICS.articaine_1_200k,
		"articaine_1_200k",
	),
	mepivacaine_plain_3: toDrugSpec(
		DENTAL_ANESTHETICS.mepivacaine_plain,
		"mepivacaine_plain_3",
	),
	lidocaine_2_100k: toDrugSpec(
		DENTAL_ANESTHETICS.lidocaine_1_100k,
		"lidocaine_2_100k",
	),
	bupivacaine_05: toDrugSpec(
		DENTAL_ANESTHETICS.bupivacaine_05,
		"bupivacaine_05",
	),
};

export { type AnestheticDrugInfo, DENTAL_ANESTHETICS };
