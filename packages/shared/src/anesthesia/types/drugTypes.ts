/**
 * @dental/shared/anesthesia/types/drugTypes.ts
 * Comprehensive Drug Identifiers, Specifications & Definitions (Mandate 8b, <= 120 lines)
 */

export type AnestheticDrugId =
	| "articaine_4_epi_100k"
	| "articaine_4_epi_200k"
	| "articaine_4_plain"
	| "mepivacaine_3_plain"
	| "lidocaine_2_epi_100k"
	| "lidocaine_2_plain"
	| "bupivacaine_05_epi_200k";

export type AnesthesiaDrugKey =
	| "ultracain_ds_forte"
	| "ultracain_ds"
	| "septanest_100"
	| "scandonest_3"
	| "lidocaine_2";

export type ChairsideAnestheticDrugId =
	| "articaine_1_100k"
	| "articaine_1_200k"
	| "septanest_1_100k"
	| "mepivacaine_plain"
	| "mepivacaine_plain_3"
	| "lidocaine_1_100k"
	| "lidocaine_2_100k"
	| "lidocaine_plain"
	| "bupivacaine_05";

/** @deprecated Use AnestheticDrugId or AnesthesiaDrugKey or ChairsideAnestheticDrugId instead */
export type LegacyAnestheticDrugKey = AnestheticDrugId;

export type VasoconstrictorRatio = "1:100000" | "1:200000" | "1:50000" | "none";

export type AnesthesiaMethodKey =
	| "infiltration"
	| "mandibular"
	| "torusal"
	| "tuberal"
	| "incisive"
	| "intraligamentary"
	| "application";

export type NeedleGaugeType =
	| "g27_long_35mm"
	| "g30_short_21mm"
	| "g30_ultrashort_12mm"
	| "g30_extrashort_8mm";

export interface AnesthesiaDrugSpec {
	readonly id: AnestheticDrugId;
	readonly nameRu: string;
	readonly tradeNamesRu: readonly string[];
	readonly activeSubstanceRu: string;
	readonly activeConcentrationPercent: number;
	readonly mgPerMlActive: number;
	readonly vasoconstrictorNameRu: string;
	readonly vasoconstrictorRatio: VasoconstrictorRatio;
	readonly epinephrineMgPerMl: number;
	readonly standardCarpuleVolumeMl: number;
	readonly mgActivePerCarpule: number;
	readonly mgEpiPerCarpule: number;
	readonly maxDoseMgPerKgAdult: number;
	readonly maxDoseMgPerKgPediatric: number;
	readonly absoluteMaxDoseMgAdult: number;
	readonly containsSulfites: boolean;
	readonly isAdrenalineFree: boolean;
	readonly durationPulpalMinutes: number;
	readonly durationSoftTissueMinutes: number;
	readonly onsetMinutes: number;
	readonly clinicalIndicationsRu: string;
	readonly contraindicationsRu: readonly string[];
}

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
