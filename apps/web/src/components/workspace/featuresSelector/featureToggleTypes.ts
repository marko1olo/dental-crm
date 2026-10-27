import type React from "react";
import type { WorkspaceFeatureFlags } from "../../../hooks/useWorkspaceProfile";

export interface FeatureToggleDef {
	readonly key: keyof Pick<
		WorkspaceFeatureFlags,
		| "hasAssistants"
		| "hasMultipleChairs"
		| "hasDentalLab"
		| "hasInsuranceCoPay"
		| "hasInstallments"
		| "hasPayrollModule"
		| "hasMarketingModule"
		| "hasAnalyticsModule"
		| "hasCsoScanner"
		| "hasLeadsKanban"
		| "hasOmnichannel"
		| "hasOrthodontics"
		| "hasGnathology"
		| "hasTasks"
		| "hasReclamations"
		| "hasPediatricMode"
		| "hasInventoryModule"
		| "aiEnableTreatmentPlan"
		| "aiEnableRecommendations"
		| "aiEnableDocuments"
		| "hasEngineeringStatus"
		| "hasClinicalRules"
	>;
	readonly label: string;
	readonly description: string;
	readonly icon: React.ReactNode;
	readonly color: string;
}
