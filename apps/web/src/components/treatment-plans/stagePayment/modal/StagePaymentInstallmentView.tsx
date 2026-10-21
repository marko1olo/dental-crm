import React from "react";
import { StagePaymentInstallmentWrapper } from "./StagePaymentInstallmentWrapper";
import type { MilestoneStage } from "../stagePaymentEngine";

export interface StagePaymentInstallmentViewProps {
	readonly stage: MilestoneStage;
	readonly isOpen: boolean;
	readonly patientId: string;
	readonly patientName: string;
	readonly clinicName: string;
	readonly clinicInn: string;
	readonly planTitle: string;
	readonly onClose: () => void;
	readonly onApproved: () => void;
}

export const StagePaymentInstallmentView: React.FC<StagePaymentInstallmentViewProps> = (
	props,
) => {
	return <StagePaymentInstallmentWrapper {...props} />;
};
