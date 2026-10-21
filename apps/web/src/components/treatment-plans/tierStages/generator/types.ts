import type { CatalogServiceLookupItem } from "../../treatmentPlanPricingEngine";
import type { TreatmentPlanItem, TreatmentPlanTierId } from "../../types";

export interface TierGeneratorContext {
	tierId: TreatmentPlanTierId;
	catalog?: readonly CatalogServiceLookupItem[] | undefined;
	validDiscountPct: number;
	isDemo: boolean;
	stage1Items: TreatmentPlanItem[];
	stage2Items: TreatmentPlanItem[];
	stage3Items: TreatmentPlanItem[];
	markHasImplants: () => void;
}
