/**
 * anesthesiaMrdCatalog.ts
 * Clinical catalog and specifications for Dental Local Anesthetics.
 * Standards: Минздрав РФ, СтАР, AHA/ADA, Malamed.
 */

import { DENTAL_ANESTHETICS } from "../anesthesiaCatalog.js";

export type MrdDrugId =
	| "articaine_1_100k"
	| "articaine_1_200k"
	| "mepivacaine_plain"
	| "lidocaine_1_100k"
	| "lidocaine_plain"
	| "bupivacaine_05";

export type CarpuleVolumeMl = 1.7 | 1.8 | 2.0;
export type PediatricFormula = "clark" | "young" | "direct_mg_kg";
export type SafetyZone = "green_safe" | "yellow_caution" | "orange_warning" | "red_stop";
export type LimitingFactor =
	| "patient_weight"
	| "absolute_max_cap"
	| "cardiac_epinephrine_gate"
	| "pediatric_clark"
	| "pediatric_young"
	| "pediatric_direct_mg_kg"
	| "absolute_contraindication";

export interface MrdDrugSpecification {
	readonly id: MrdDrugId;
	readonly tradeNamesRu: readonly string[];
	readonly activeSubstanceRu: string;
	readonly concentrationPercent: number;
	readonly mgPerMlActive: number;
	readonly vasoconstrictorNameRu: string;
	readonly vasoconstrictorRatio: "1:100000" | "1:200000" | "none";
	readonly epinephrineMgPerMl: number;
	readonly defaultVolumeMl: CarpuleVolumeMl;
	readonly maxDoseMgPerKgAdult: number;
	readonly absoluteMaxDoseMgAdult: number;
	readonly maxDoseMgPerKgPediatric: number;
	readonly containsSulfites: boolean;
	readonly isAdrenalineFree: boolean;
	readonly clinicalDescriptionRu: string;
}

export const EPINEPHRINE_LIMITS_MG = {
	healthyAdult: 0.2,
	cardiovascularGate: 0.04,
} as const;

export const MRD_DRUG_CATALOG: Record<MrdDrugId, MrdDrugSpecification> =
	Object.fromEntries(
		(Object.keys(DENTAL_ANESTHETICS) as MrdDrugId[]).map((drugId) => {
			const drug = DENTAL_ANESTHETICS[drugId];
			const maxDoseMgPerKgPediatric = drugId.startsWith("articaine")
				? 5.0
				: drugId === "bupivacaine_05"
					? 1.5
					: 4.4;
			return [
				drugId,
				{
					id: drug.id as MrdDrugId,
					tradeNamesRu: drug.tradeNamesRu,
					activeSubstanceRu: drug.activeSubstanceRu,
					concentrationPercent: drug.activeConcentrationPercent,
					mgPerMlActive: drug.mgPerMlActive,
					vasoconstrictorNameRu: drug.vasoconstrictorNameRu,
					vasoconstrictorRatio: drug.vasoconstrictorRatio,
					epinephrineMgPerMl: drug.epinephrineMgPerMl,
					defaultVolumeMl: (drug.id === "lidocaine_plain"
						? 2.0
						: drug.id === "bupivacaine_05"
							? 1.8
							: 1.7) as CarpuleVolumeMl,
					maxDoseMgPerKgAdult: drug.maxDoseMgPerKgAdult,
					absoluteMaxDoseMgAdult: drug.absoluteMaxDoseMgAdult,
					maxDoseMgPerKgPediatric,
					containsSulfites: drug.containsSulfites,
					isAdrenalineFree: drug.isAdrenalineFree,
					clinicalDescriptionRu: drug.clinicalIndicationsRu,
				},
			];
		}),
	) as unknown as Record<MrdDrugId, MrdDrugSpecification>;
