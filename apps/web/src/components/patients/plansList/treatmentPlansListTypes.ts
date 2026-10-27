import type { TreatmentPlanItem } from "@dental/shared";

export type TreatmentPlanStatusFilter = "all" | "in_progress" | "approved" | "proposed" | "completed";

export interface TreatmentPlansListProps {
	readonly items: readonly TreatmentPlanItem[];
	readonly onOpenPlan?: ((planId: string) => void) | undefined;
	readonly onNewPlanItem?: (() => void) | undefined;
	readonly className?: string | undefined;
}
