/**
 * anesthesiaTechniqueTypes.ts — Clinical types for dental anesthesia techniques and needles
 * Standards: Минздрав РФ, СтАР. Mandates: 8e, 8n (Solo Doctor), 8b (<= 120 lines SSOT)
 */

export type ConductionTechniqueId =
	| "mandibular_weisbrem"
	| "mandibular_gow_gates"
	| "mandibular_akinosi"
	| "torusal"
	| "tuberal"
	| "incisive_canal"
	| "greater_palatine"
	| "infiltration_supraperiosteal"
	| "intraligamentary_pdl"
	| "intraosseous_quicksleeper"
	| "mental_incisive"
	| "infraorbital";

export type TechniqueCategory =
	| "conduction_mandibular"
	| "conduction_maxillary"
	| "conduction_palatal"
	| "infiltration"
	| "intraligamentary_pressure"
	| "intraosseous";

export type NeedleGaugeId =
	| "gauge_27_long_35mm"
	| "gauge_30_medium_25mm"
	| "gauge_30_short_21mm"
	| "gauge_30_ultrashort_12mm"
	| "gauge_30_extrashort_8mm";

export type AnestheticDrugKey =
	| "articaine_1_100k"
	| "articaine_1_200k"
	| "mepivacaine_plain_3"
	| "lidocaine_2_100k"
	| "bupivacaine_05";

export type VascularRiskTier = "critical_high" | "moderate" | "low" | "minimal";

export interface NeedleSpecification {
	readonly id: NeedleGaugeId;
	readonly gauge: string;
	readonly externalDiameterMm: number;
	readonly internalDiameterMm: number;
	readonly lengthMm: number;
	readonly colorCode: string;
	readonly capColorRu: string;
	readonly nameRu: string;
	readonly primaryIndicationsRu: string;
	readonly aspirationLumenSafety: "high" | "medium" | "restricted_lumen";
	readonly deflectionResistancePercent: number;
}

export interface AnatomicNumbnessZones {
	readonly teethDescRu: string;
	readonly targetQuadrantRu: string;
	readonly tongueNumbness: boolean;
	readonly lowerLipNumbness: boolean;
	readonly cheekMucosaNumbness: boolean;
	readonly hardPalateNumbness: boolean;
	readonly softTissueCollateral: boolean;
	readonly sensoryNervesRu: readonly string[];
	readonly summaryRu: string;
}

export interface TechniqueSpecification {
	readonly id: ConductionTechniqueId;
	readonly nameRu: string;
	readonly shortNameRu: string;
	readonly category: TechniqueCategory;
	readonly anatomicalLandmarksRu: string;
	readonly puncturePointRu: string;
	readonly targetNervesRu: readonly string[];
	readonly recommendedNeedle: NeedleGaugeId;
	readonly allowedNeedles: readonly NeedleGaugeId[];
	readonly insertionDepthMm: { readonly min: number; readonly max: number; readonly target: number };
	readonly requiresBoneContact: boolean;
	readonly typicalVolumeCarpules: number;
	readonly typicalVolumeMl: number;
	readonly minVolumeMl: number;
	readonly maxVolumeMl: number;
	readonly targetPressureAtm: { readonly min: number; readonly max: number; readonly isHighPressure: boolean };
	readonly baseVascularHitRiskPercent: number;
	readonly vascularRiskTier: VascularRiskTier;
	readonly onsetMinutes: { readonly min: number; readonly max: number; readonly defaultWaitTimeSec: number };
	readonly pulpalDurationMinutes: { readonly min: number; readonly max: number };
	readonly softTissueDurationMinutes: { readonly min: number; readonly max: number };
	readonly anatomicZones: AnatomicNumbnessZones;
	readonly aspirationPlanesRequired: number;
	readonly clinicalRecommendationsRu: string;
	readonly contraindicationsOrCautionsRu: readonly string[];
}

export interface AnestheticDrugSpec {
	readonly drugId: AnestheticDrugKey;
	readonly tradeNamesRu: readonly string[];
	readonly activeSubstanceRu: string;
	readonly activeConcentrationPercent: number;
	readonly mgPerMlActive: number;
	readonly vasoconstrictorRatio: "1:100000" | "1:200000" | "none";
	readonly vasoconstrictorNameRu: string;
	readonly epinephrineMgPerMl: number;
	readonly standardCarpuleVolumeMl: number;
	readonly maxDoseMgPerKgAdult: number;
	readonly absoluteMaxDoseMgAdult: number;
	readonly isAdrenalineFree: boolean;
	readonly containsSulfites: boolean;
}
