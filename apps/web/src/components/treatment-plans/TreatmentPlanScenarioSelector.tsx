/**
 * TreatmentPlanScenarioSelector.tsx — селектор представлений плана лечения:
 * 3-Tier сравнение вариантов («Эконом», «Оптимум», «Премиум») или 4 клинические фазы реабилитации.
 */

import React from "react";
import { TreatmentPlan3TierComparison } from "./TreatmentPlan3TierComparison.js";
import { TreatmentPlanRoadmap } from "./TreatmentPlanRoadmap.js";
import type {
	TreatmentPlanStage,
	TreatmentPlanTier,
	TreatmentPlanTierId,
} from "./types.js";
import { Phased4StageViewWrapper } from "./scenarioSelector/Phased4StageViewWrapper.js";

export interface TreatmentPlanScenarioSelectorProps {
	readonly activeViewTab: "3tier" | "stages" | "phased4" | "roadmap";
	readonly planTiers: readonly TreatmentPlanTier[];
	readonly selectedTierId: TreatmentPlanTierId;
	readonly onSelectTier: (tier: TreatmentPlanTier) => void;
	readonly onApproveAndSignTier: (tier: TreatmentPlanTier) => void;
	readonly onOpenComparatorStudio: () => void;
	readonly onOpenStagePaymentStudio: () => void;
	readonly onOpenPriceValidatorStudio: () => void;
	readonly onOpenInstallmentForTier: (tier: TreatmentPlanTier) => void;
	readonly onPrintContractForTier: (tier: TreatmentPlanTier) => void;
	readonly stages: readonly TreatmentPlanStage[];
	readonly patientName: string;
	readonly patientId?: string | undefined;
	readonly planAgeDays: number;
	readonly planCreatedAtIso?: string | undefined;
	readonly onExecuteWriteOffStage: (stage: TreatmentPlanStage) => void;
	readonly onOpenFiscalPayment: () => void;
	readonly onOpenInstallmentModal: () => void;
	readonly onOpenSignModal: () => void;
	readonly onOpenContractPrint: () => void;
	readonly onChangeStageStatus?: ((stage: TreatmentPlanStage, newStatus: any) => void) | undefined;
	readonly children?: React.ReactNode | undefined;
}

export const TreatmentPlanScenarioSelector: React.FC<TreatmentPlanScenarioSelectorProps> = ({
	activeViewTab,
	planTiers,
	selectedTierId,
	onSelectTier,
	onApproveAndSignTier,
	onOpenComparatorStudio,
	onOpenStagePaymentStudio,
	onOpenPriceValidatorStudio,
	onOpenInstallmentForTier,
	onPrintContractForTier,
	stages,
	patientName,
	patientId,
	planAgeDays,
	planCreatedAtIso,
	onExecuteWriteOffStage,
	onOpenFiscalPayment,
	onOpenInstallmentModal,
	onOpenSignModal,
	onOpenContractPrint,
	onChangeStageStatus,
	children,
}) => {
	if (activeViewTab === "3tier") {
		return (
			<TreatmentPlan3TierComparison
				tiers={planTiers}
				selectedTierId={selectedTierId}
				planAgeDays={planAgeDays}
				planCreatedAtIso={planCreatedAtIso}
				onSelectTier={onSelectTier}
				onApproveAndSign={onApproveAndSignTier}
				onOpenComparatorStudio={onOpenComparatorStudio}
				onOpenStagePaymentStudio={onOpenStagePaymentStudio}
				onOpenPriceValidatorStudio={onOpenPriceValidatorStudio}
				onOpenInstallment={onOpenInstallmentForTier}
				onPrintContract={onPrintContractForTier}
			/>
		);
	}

	if (activeViewTab === "phased4") {
		return (
			<Phased4StageViewWrapper
				stages={stages}
				patientName={patientName}
				patientId={patientId}
				planAgeDays={planAgeDays}
				planCreatedAtIso={planCreatedAtIso}
				onExecuteWriteOffStage={onExecuteWriteOffStage}
				onOpenFiscalPayment={onOpenFiscalPayment}
				onOpenInstallmentModal={onOpenInstallmentModal}
				onOpenSignModal={onOpenSignModal}
				onOpenContractPrint={onOpenContractPrint}
				onChangeStageStatus={onChangeStageStatus}
			/>
		);
	}

	if (activeViewTab === "roadmap") {
		return (
			<TreatmentPlanRoadmap
				stages={stages}
				patientName={patientName}
				patientFullName={patientName}
				patientId={patientId}
				planId="PLAN-SHOWCASE-01"
				onBookStage={(_stage) => {
					if (typeof window !== "undefined") {
						window.location.hash = "#schedule";
					}
				}}
			/>
		);
	}

	return <>{children}</>;
};
