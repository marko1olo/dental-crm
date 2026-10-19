/**
 * anesthesiaTechniqueFactory.ts — Helper factory for dental anesthesia technique specifications
 * Standards: Минздрав РФ, СтАР. Mandate 8b (<= 120 lines).
 */
import type {
	ConductionTechniqueId,
	NeedleGaugeId,
	TechniqueCategory,
	TechniqueSpecification,
	VascularRiskTier,
} from "./anesthesiaTechniqueTypes";

export interface CreateTechniqueParams {
	id: ConductionTechniqueId;
	nameRu: string;
	shortNameRu: string;
	category: TechniqueCategory;
	landmarksRu: string;
	punctureRu: string;
	targetNervesRu: readonly string[];
	recommendedNeedle: NeedleGaugeId;
	allowedNeedles: readonly NeedleGaugeId[];
	depthMm: { min: number; max: number; target: number };
	requiresBoneContact: boolean;
	typicalCarpules: number;
	typicalVolumeMl: number;
	targetPressureAtm?: { min: number; max: number; isHighPressure: boolean };
	riskPercent: number;
	riskTier: VascularRiskTier;
	onsetMin: { min: number; max: number; defaultWaitTimeSec: number };
	pulpalMin: { min: number; max: number };
	softTissueMin: { min: number; max: number };
	zones: {
		teethDescRu: string;
		quadrantRu: string;
		tongue: boolean;
		lip: boolean;
		cheek: boolean;
		palate: boolean;
		summaryRu: string;
	};
	aspirationPlanes: number;
	recommendationsRu: string;
	cautionsRu?: readonly string[];
}

export function createTechniqueSpec(
	p: CreateTechniqueParams,
): TechniqueSpecification {
	return {
		id: p.id,
		nameRu: p.nameRu,
		shortNameRu: p.shortNameRu,
		category: p.category,
		anatomicalLandmarksRu: p.landmarksRu,
		puncturePointRu: p.punctureRu,
		targetNervesRu: p.targetNervesRu,
		recommendedNeedle: p.recommendedNeedle,
		allowedNeedles: p.allowedNeedles,
		insertionDepthMm: p.depthMm,
		requiresBoneContact: p.requiresBoneContact,
		typicalVolumeCarpules: p.typicalCarpules,
		typicalVolumeMl: p.typicalVolumeMl,
		minVolumeMl: Math.max(0.2, p.typicalVolumeMl - 0.3),
		maxVolumeMl: p.typicalVolumeMl + 0.3,
		targetPressureAtm: p.targetPressureAtm ?? {
			min: 1.0,
			max: 2.0,
			isHighPressure: false,
		},
		baseVascularHitRiskPercent: p.riskPercent,
		vascularRiskTier: p.riskTier,
		onsetMinutes: p.onsetMin,
		pulpalDurationMinutes: p.pulpalMin,
		softTissueDurationMinutes: p.softTissueMin,
		anatomicZones: {
			teethDescRu: p.zones.teethDescRu,
			targetQuadrantRu: p.zones.quadrantRu,
			tongueNumbness: p.zones.tongue,
			lowerLipNumbness: p.zones.lip,
			cheekMucosaNumbness: p.zones.cheek,
			hardPalateNumbness: p.zones.palate,
			softTissueCollateral: true,
			sensoryNervesRu: p.targetNervesRu,
			summaryRu: p.zones.summaryRu,
		},
		aspirationPlanesRequired: p.aspirationPlanes,
		clinicalRecommendationsRu: p.recommendationsRu,
		contraindicationsOrCautionsRu: p.cautionsRu ?? [],
	};
}
