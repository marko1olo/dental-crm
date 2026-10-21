import React from "react";
import { TreatmentPlanPhased4StageView } from "../TreatmentPlanPhased4StageView.js";
import type { TreatmentPlanStage } from "../types.js";
import { showToast } from "../../GlobalToast.js";

export interface Phased4StageViewWrapperProps {
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
}

export const Phased4StageViewWrapper: React.FC<Phased4StageViewWrapperProps> = ({
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
}) => {
	const findMatchingStage = (category: string) => {
		return (
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
			}) || stages[0]
		);
	};

	return (
		<TreatmentPlanPhased4StageView
			stages={stages}
			patientName={patientName}
			planAgeDays={planAgeDays}
			planCreatedAtIso={planCreatedAtIso}
			onExecuteStage={(category) => {
				const matching = findMatchingStage(category);
				if (matching) onExecuteWriteOffStage(matching);
			}}
			onBookStageToVisit={(_category, items) => {
				showToast(`Запись на приём: сформирован визит для этапа (${items.length} услуг)`, "info", 3000);
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
			onChangeStageStatus={(category, newStatus) => {
				const matching = findMatchingStage(category);
				if (matching && onChangeStageStatus) {
					onChangeStageStatus(matching, newStatus);
				}
			}}
		/>
	);
};
