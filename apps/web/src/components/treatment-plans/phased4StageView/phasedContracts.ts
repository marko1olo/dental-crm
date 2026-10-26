/**
 * apps/web/src/components/treatment-plans/phased4StageView/phasedContracts.ts
 *
 * Контракты и интерфейсы 4-фазного представления планов лечения.
 */

import type {
	TreatmentPlanStageCategory,
	StageCategoryMetadata,
	Kopecks,
} from "@dental/shared";
import type { TreatmentPlanStage } from "../types";

export interface PhasedStageItem {
	id: string;
	name: string;
	serviceCode?: string;
	code804n: string;
	toothNumber?: number | undefined;
	category: TreatmentPlanStageCategory;
	priceKopecks: Kopecks;
	priceRub: number;
	durationLabel?: string | undefined;
	clinicalJustification?: string | undefined;
}

export type PhasedStageStatus = "draft" | "agreed" | "in_progress" | "completed";

export interface TreatmentPlanPhased4StageViewProps {
	stages: readonly TreatmentPlanStage[];
	planTierTitle?: string | undefined;
	patientName?: string | undefined;
	planAgeDays?: number | undefined;
	planCreatedAtIso?: string | undefined;
	onToggleStage?: ((category: TreatmentPlanStageCategory) => void) | undefined;
	onExecuteStage?: ((category: TreatmentPlanStageCategory) => void) | undefined;
	onBookStageToVisit?:
		| ((category: TreatmentPlanStageCategory, items: readonly PhasedStageItem[]) => void)
		| undefined;
	onOpenStagePayment?:
		| ((category: TreatmentPlanStageCategory, amountRub: number) => void)
		| undefined;
	onOpenInstallment?: ((totalRub: number) => void) | undefined;
	onApproveAndSign?: (() => void) | undefined;
	onPrintContract?: (() => void) | undefined;
	onChangeStageStatus?:
		| ((category: TreatmentPlanStageCategory, newStatus: PhasedStageStatus) => void)
		| undefined;
}

export interface PhasedStageCategoryBucket {
	meta: StageCategoryMetadata;
	items: PhasedStageItem[];
	subtotalKopecks: Kopecks;
	subtotalRub: number;
}

export type CategorizedStageData = PhasedStageCategoryBucket;

export interface CategorizedPhasedPlanData {
	map: Record<TreatmentPlanStageCategory, PhasedStageCategoryBucket>;
	grandTotalKopecks: Kopecks;
	grandTotalRub: number;
	totalItemsCount: number;
}

export type InstallmentMonthsOption = 6 | 12 | 24;
