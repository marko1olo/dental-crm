import type { TreatmentPlanItem, TreatmentPlanStage } from "../types";
import type { CatalogServiceLookupItem } from "../treatmentPlanPricingEngine";

export interface TreatmentPlanAddServiceModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly stages: readonly TreatmentPlanStage[];
	readonly targetStage: TreatmentPlanStage | null;
	readonly catalog: readonly CatalogServiceLookupItem[] | undefined;
	readonly onAddService: (targetStageNumber: number, item: Partial<TreatmentPlanItem>) => void;
}
