/**
 * anesthesiaTechniqueTypes.ts — Type definitions for dental anesthesia techniques, needles, and zones
 * Standards: Минздрав РФ, СтАР, ФАР, Malamed
 */

export type ConductionTechniqueId =
	| 'mandibular_weisbrem'
	| 'mandibular_gow_gates'
	| 'mandibular_akinosi'
	| 'torusal'
	| 'tuberal'
	| 'incisive_canal'
	| 'greater_palatine'
	| 'infiltration_supraperiosteal'
	| 'intraligamentary_pdl'
	| 'intraosseous_quicksleeper'
	| 'mental_incisive'
	| 'infraorbital';

export type TechniqueCategory =
	| 'conduction_mandibular'
	| 'conduction_maxillary'
	| 'conduction_palatal'
	| 'infiltration'
	| 'intraligamentary_pressure'
	| 'intraosseous';

export type NeedleGaugeId =
	| 'gauge_27_long_35mm'
	| 'gauge_30_medium_25mm'
	| 'gauge_30_short_21mm'
	| 'gauge_30_ultrashort_12mm'
	| 'gauge_30_extrashort_8mm';

export type AnestheticDrugKey =
	| 'articaine_1_100k'
	| 'articaine_1_200k'
	| 'mepivacaine_plain_3'
	| 'lidocaine_2_100k'
	| 'bupivacaine_05';

export type VascularRiskTier = 'critical_high' | 'moderate' | 'low' | 'minimal';

export interface NeedleSpecification {
	readonly id: NeedleGaugeId;
	readonly gauge: string; // "27G" | "30G"
	readonly externalDiameterMm: number; // 0.40 | 0.30
	readonly internalDiameterMm: number; // 0.20 | 0.15
	readonly lengthMm: number; // 35 | 25 | 21 | 12 | 8
	readonly colorCode: string; // "#eab308" (Yellow), "#3b82f6" (Blue), "#22c55e" (Green), "#a855f7" (Purple)
	readonly capColorRu: string; // "Желтый", "Синий", "Зеленый", "Фиолетовый"
	readonly nameRu: string;
	readonly primaryIndicationsRu: string;
	readonly aspirationLumenSafety: 'high' | 'medium' | 'restricted_lumen';
	readonly deflectionResistancePercent: number; // e.g. 90% for 27G vs 45% for 30G 25mm
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
	readonly insertionDepthMm: {
		readonly min: number;
		readonly max: number;
		readonly target: number;
	};
	readonly requiresBoneContact: boolean;
	readonly typicalVolumeCarpules: number;
	readonly typicalVolumeMl: number;
	readonly minVolumeMl: number;
	readonly maxVolumeMl: number;
	readonly targetPressureAtm: {
		readonly min: number;
		readonly max: number;
		readonly isHighPressure: boolean;
	};
	readonly baseVascularHitRiskPercent: number;
	readonly vascularRiskTier: VascularRiskTier;
	readonly onsetMinutes: {
		readonly min: number;
		readonly max: number;
		readonly defaultWaitTimeSec: number;
	};
	readonly pulpalDurationMinutes: {
		readonly min: number;
		readonly max: number;
	};
	readonly softTissueDurationMinutes: {
		readonly min: number;
		readonly max: number;
	};
	readonly anatomicZones: AnatomicNumbnessZones;
	readonly aspirationPlanesRequired: number; // 2 for mandibular/tuberal, 1 for infiltration
	readonly clinicalRecommendationsRu: string;
	readonly contraindicationsOrCautionsRu: readonly string[];
}

export interface AnestheticDrugSpec {
	readonly drugId: AnestheticDrugKey;
	readonly tradeNamesRu: readonly string[];
	readonly activeSubstanceRu: string;
	readonly activeConcentrationPercent: number;
	readonly mgPerMlActive: number;
	readonly vasoconstrictorRatio: '1:100000' | '1:200000' | 'none';
	readonly vasoconstrictorNameRu: string;
	readonly epinephrineMgPerMl: number;
	readonly standardCarpuleVolumeMl: number;
	readonly maxDoseMgPerKgAdult: number;
	readonly absoluteMaxDoseMgAdult: number;
	readonly isAdrenalineFree: boolean;
	readonly containsSulfites: boolean;
}
