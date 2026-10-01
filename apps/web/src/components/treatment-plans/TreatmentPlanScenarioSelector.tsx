/**
 * TreatmentPlanScenarioSelector.tsx — селектор представлений плана лечения:
 * 3-Tier сравнение вариантов («Эконом», «Оптимум», «Премиум») или 4 клинические фазы реабилитации.
 */

import React from "react";
import { TreatmentPlan3TierComparison } from "./TreatmentPlan3TierComparison";
import { TreatmentPlanPhased4StageView } from "./TreatmentPlanPhased4StageView";
import type {
	TreatmentPlanStage,
	TreatmentPlanTier,
	TreatmentPlanTierId,
} from "./types";
import { showToast } from "../GlobalToast";

export interface TreatmentPlanScenarioSelectorProps {
	readonly activeViewTab: "3tier" | "stages" | "phased4";
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
			<TreatmentPlanPhased4StageView
				stages={stages}
				patientName={patientName}
				planAgeDays={planAgeDays}
				planCreatedAtIso={planCreatedAtIso}
				onExecuteStage={(category) => {
					const matchingStage =
						stages.find((s) => {
							if (category === "hygiene_sanitation" || category === "endo_therapy") {
								return s.stageKind === "stage_1_therapy";
							}
							if (category === "surgery_implant") {
								return s.stageKind === "stage_2_surgery";
							}
							if (category === "ortho_prosthetics") {
								return s.stageKind === "stage_3_orthopedics";
							}
							return false;
						}) || stages[0];
					if (matchingStage) {
						onExecuteWriteOffStage(matchingStage);
					}
				}}
				onBookStageToVisit={(_category, items) => {
					showToast(
						`Запись на приём: сформирован визит для этапа (${items.length} услуг)`,
						"info",
						3000,
					);
					if (typeof window !== "undefined") {
						window.dispatchEvent(
							new CustomEvent("dente-book-stage-appointment", {
								detail: { patientId, patientName, items },
							}),
						);
					}
				}}
				onOpenStagePayment={onOpenFiscalPayment}
				onOpenInstallment={onOpenInstallmentModal}
				onApproveAndSign={onOpenSignModal}
				onPrintContract={onOpenContractPrint}
			/>
		);
	}

	return <>{children}</>;
};
