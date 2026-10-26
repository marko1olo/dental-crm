import type { TreatmentPlanItem } from "../../types";

export type StarProtocolSeverity = "pass" | "warning" | "error";

export interface StarProtocolRuleCheck {
	readonly ruleId: string;
	readonly protocolCode: "K02_CARIES" | "K04_ENDO" | "K05_PERIO" | "K08_IMPLANT_ORTHO" | "PEDIATRIC" | "NOMENCLATURE_804N" | "CATALOG_SERVICES";
	readonly protocolTitleRu: string;
	readonly toothNumber?: number | undefined;
	readonly ruleDescriptionRu: string;
	readonly status: StarProtocolSeverity;
	readonly messageRu: string;
	readonly recommendationRu?: string | undefined;
	readonly normativeRefRu: string;
	readonly serviceCatalogCodesRelated?: readonly string[];
	readonly order804nCodesRelated: readonly string[];
}

export type StarProtocolOverallCompliance =
	| "FULL_COMPLIANCE"
	| "COMPLIANT_WITH_RECOMMENDATIONS"
	| "NON_COMPLIANT_DEFECTS";

export interface StarProtocolValidationSummary {
	readonly totalChecksCount: number;
	readonly passedChecksCount: number;
	readonly warningsCount: number;
	readonly errorsCount: number;
	readonly complianceScorePercent: number;
	readonly overallStatus: StarProtocolOverallCompliance;
	readonly checks: readonly StarProtocolRuleCheck[];
	readonly criticalDefects: readonly StarProtocolRuleCheck[];
	readonly clinicalRecommendations: readonly StarProtocolRuleCheck[];
	readonly verifiedStagesCount: number;
	readonly verifiedProceduresCount: number;
	readonly validatedAtIso: string;
}

export type TreatmentPlanStarValidationReport = StarProtocolValidationSummary;

export interface MutuallyExclusiveToothConflict {
	readonly toothNumber: number;
	readonly conflictType: "EXTRACTION_VS_PRESERVATION" | "EXTRACTION_VS_PROSTHETICS";
	readonly procedureA: TreatmentPlanItem;
	readonly procedureB: TreatmentPlanItem;
	readonly descriptionRu: string;
}

export type ConflictToothGroup = MutuallyExclusiveToothConflict;
