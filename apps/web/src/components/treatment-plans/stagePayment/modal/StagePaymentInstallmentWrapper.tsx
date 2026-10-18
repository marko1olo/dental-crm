import React from "react";
import { BankInstallmentQrModal } from "../../../payments/BankInstallmentQrModal";
import type { MilestoneStage } from "../stagePaymentEngine.js";

export interface StagePaymentInstallmentWrapperProps {
	readonly stage: MilestoneStage;
	readonly isOpen: boolean;
	readonly patientId: string;
	readonly patientName: string;
	readonly clinicName: string;
	readonly clinicInn: string;
	readonly planTitle: string;
	readonly onClose: () => void;
	readonly onApproved: (stage: MilestoneStage) => void;
}

export const StagePaymentInstallmentWrapper: React.FC<StagePaymentInstallmentWrapperProps> = ({
	stage,
	isOpen,
	patientId,
	patientName,
	clinicName,
	clinicInn,
	planTitle,
	onClose,
	onApproved,
}) => {
	if (!isOpen) return null;

	return (
		<BankInstallmentQrModal
			isOpen={isOpen}
			onClose={onClose}
			stageTitle={`Этап №${stage.stageNumber}: ${stage.title}`}
			stageNumber={stage.stageNumber}
			stageAmountKopecks={stage.totalKopecks}
			patientId={patientId}
			patientName={patientName}
			clinicName={clinicName}
			clinicInn={clinicInn}
			planId={planTitle}
			onInstallmentApproved={() => onApproved(stage)}
		/>
	);
};
