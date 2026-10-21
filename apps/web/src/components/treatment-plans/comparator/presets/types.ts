export type PlanTierCode = "optimum_vip" | "standard_recommended" | "economy_basic";

export type ClinicalCategoryCode =
	| "surgery_implant"
	| "orthopedics_prosthetics"
	| "therapy_endo"
	| "hygiene_perio";

export interface PlanProcedureItem {
	readonly id: string;
	readonly code804n: string;
	readonly name: string;
	readonly category: ClinicalCategoryCode;
	readonly toothFdi?: string | undefined;
	readonly quantity: number;
	readonly unitPriceRub: number;
	readonly totalCostRub: number;
	readonly clinicalRationale: string;
}

export interface PlanStageRoadmap {
	readonly stageIndex: number;
	readonly title: string;
	readonly subtitle: string;
	readonly durationWeeks: number;
	readonly visitsCount: number;
	readonly costRub: number;
	readonly keyProcedures: readonly string[];
}

export interface ComprehensivePlanVariant {
	readonly tierCode: PlanTierCode;
	readonly title: string;
	readonly badgeText: string;
	readonly badgeType: "primary" | "success" | "neutral";
	readonly isRecommended: boolean;
	readonly headlineDescription: string;
	readonly implantSystem: string;
	readonly crownMaterial: string;
	readonly aestheticMaterial: string;
	readonly warrantyYears: number;
	readonly estimatedServiceLifeYears: number;
	readonly aestheticScore: number;
	readonly biologicalInvasivenessScore: number;
	readonly totalCostRub: number;
	readonly totalVisitsCount: number;
	readonly totalDurationWeeks: number;
	readonly isCode02HighCostSurgery: boolean;
	readonly stages: readonly PlanStageRoadmap[];
	readonly procedures: readonly PlanProcedureItem[];
	readonly keyAdvantages: readonly string[];
	readonly clinicalLimitations: readonly string[];
}
