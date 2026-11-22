import type { TreatmentPlanItem as SharedTreatmentPlanItem } from "@dental/shared";
import type { TreatmentPlanItem as UiTreatmentPlanItem } from "../../treatment-plans/types";

export type AnyTreatmentPlanItem = SharedTreatmentPlanItem | UiTreatmentPlanItem;

export type TreatmentPlanStatusFilter = "all" | "in_progress" | "approved" | "proposed" | "completed";

export interface TreatmentPlansListProps {
	readonly items: readonly AnyTreatmentPlanItem[];
	readonly onOpenPlan?: ((planId: string) => void) | undefined;
	readonly onNewPlanItem?: (() => void) | undefined;
	readonly className?: string | undefined;
}
