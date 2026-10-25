/**
 * @dental/shared/anesthesia/catalogModules/catalogKeyMappings.ts
 * Key mappings and chairside spec resolvers (Mandate 8b, <= 120 lines)
 */

import type { AnesthesiaDrugKey, AnesthesiaDrugSpec, AnestheticDrugId, ChairsideAnestheticDrugId } from "../types.js";
import { ARTICAINE_SPECS } from "./catalogArticaineSpecs.js";
import { OTHER_DRUG_SPECS } from "./catalogOtherSpecs.js";

export const ANESTHESIA_DRUG_CATALOG: Record<AnestheticDrugId, AnesthesiaDrugSpec> = {
	...ARTICAINE_SPECS,
	...OTHER_DRUG_SPECS,
};

export const ANESTHESIA_KEY_TO_CLINICAL_ID: Record<AnesthesiaDrugKey, AnestheticDrugId> = {
	ultracain_ds_forte: "articaine_4_epi_100k",
	ultracain_ds: "articaine_4_epi_200k",
	septanest_100: "articaine_4_epi_100k",
	scandonest_3: "mepivacaine_3_plain",
	lidocaine_2: "lidocaine_2_plain",
} as const;

export const CHAIRSIDE_KEY_TO_CLINICAL_ID: Record<ChairsideAnestheticDrugId, AnestheticDrugId> = {
	articaine_1_100k: "articaine_4_epi_100k",
	articaine_1_200k: "articaine_4_epi_200k",
	septanest_1_100k: "articaine_4_epi_100k",
	mepivacaine_plain: "mepivacaine_3_plain",
	mepivacaine_plain_3: "mepivacaine_3_plain",
	lidocaine_1_100k: "lidocaine_2_epi_100k",
	lidocaine_2_100k: "lidocaine_2_epi_100k",
	lidocaine_plain: "lidocaine_2_plain",
	bupivacaine_05: "bupivacaine_05_epi_200k",
} as const;

export function getClinicalSpecForChairsideDrug(drugKey: string): AnesthesiaDrugSpec | null {
	const clinicalId = CHAIRSIDE_KEY_TO_CLINICAL_ID[drugKey as ChairsideAnestheticDrugId];
	if (!clinicalId) return null;
	return ANESTHESIA_DRUG_CATALOG[clinicalId] ?? null;
}
