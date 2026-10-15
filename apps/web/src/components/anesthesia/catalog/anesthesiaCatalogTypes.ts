/**
 * anesthesiaCatalogTypes.ts
 * Types for Dental Anesthetics Pharmacopeia, Needles, Techniques, and Presets.
 * Standards: СтАР / Минздрав РФ / Mandate 8e
 */

export type AnestheticDrugId =
	| 'articaine_1_100k'
	| 'articaine_1_200k'
	| 'septanest_1_100k'
	| 'mepivacaine_plain'
	| 'lidocaine_1_100k'
	| 'lidocaine_plain'
	| 'bupivacaine_05';

export type VasoconstrictorRatio = '1:100000' | '1:200000' | 'none';

export type NeedleGaugeType =
	| 'g27_long_35mm'
	| 'g30_short_21mm'
	| 'g30_ultrashort_12mm'
	| 'g30_extrashort_8mm';

export type InjectionTechniqueId =
	| 'infiltration'
	| 'mandibular_torus'
	| 'mental_incisive'
	| 'tuberal'
	| 'palatal_greater'
	| 'incisive_canal'
	| 'intraligamentary_sta'
	| 'intraseptal'
	| 'application_topical';

export interface AnestheticDrugInfo {
	readonly id: AnestheticDrugId;
	readonly tradeNamesRu: readonly string[];
	readonly activeSubstanceRu: string;
	readonly activeConcentrationPercent: number;
	readonly mgPerMlActive: number;
	readonly vasoconstrictorNameRu: string;
	readonly vasoconstrictorRatio: VasoconstrictorRatio;
	readonly epinephrineMgPerMl: number;
	readonly carpuleVolumeMl: number;
	readonly mgActivePerCarpule: number;
	readonly mgEpiPerCarpule: number;
	readonly maxDoseMgPerKgAdult: number;
	readonly absoluteMaxDoseMgAdult: number;
	readonly maxCarpules70kgAdult: number;
	readonly containsSulfites: boolean;
	readonly isAdrenalineFree: boolean;
	readonly onsetMinutes: number;
	readonly pulpalDurationMinutes: number;
	readonly softTissueDurationMinutes: number;
	readonly clinicalIndicationsRu: string;
	readonly contraindicationsRu: readonly string[];
}

export interface DentalNeedleInfo {
	readonly id: NeedleGaugeType;
	readonly gauge: string;
	readonly diameterMm: number;
	readonly lengthMm: number;
	readonly colorCode: string;
	readonly nameRu: string;
	readonly recommendedTechniques: readonly InjectionTechniqueId[];
}

export interface InjectionTechniqueInfo {
	readonly id: InjectionTechniqueId;
	readonly nameRu: string;
	readonly anatomicalLandmarksRu: string;
	readonly defaultNeedle: NeedleGaugeType;
	readonly targetAnesthesiaZonesRu: string;
	readonly aspirationCheckMandatory: boolean;
	readonly typicalVolumeCarpules: number;
}

export interface StandardAnesthesiaPreset {
	readonly id: string;
	readonly labelRu: string;
	readonly shortLabelRu: string;
	readonly testId: string;
	readonly drugId: AnestheticDrugId;
	readonly carpulesCount: number;
	readonly techniqueId: InjectionTechniqueId;
	readonly needleType: NeedleGaugeType;
	readonly descriptionRu: string;
	readonly isAdrenalineFree: boolean;
	readonly hasCardioRisk: boolean;
	readonly defaultWeightKg: number;
}
