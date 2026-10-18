import React from "react";
import type { TreatmentPlanStage } from "../types";
import type { StageFooterActionFlags } from "./stageFooterHelpers";
import { StageFooterAccountingActions } from "./StageFooterAccountingActions";
import { StageFooterLabAndDiscountActions } from "./StageFooterLabAndDiscountActions";

export interface StageFooterSecondaryActionsProps {
	readonly stage: TreatmentPlanStage;
	readonly flags: StageFooterActionFlags;
	readonly onClose: () => void;
	readonly onExecuteWriteOffStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onPayStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onExportStageEstimate?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onOpenLabOrder?: ((teeth?: number[], options?: Record<string, unknown>) => void) | undefined;
	readonly onOneClickLabOrder?: ((teeth?: number[]) => void) | undefined;
	readonly onApplyStageDiscount?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onOpenInstallment?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onDeleteStage?: ((stage: TreatmentPlanStage) => void) | undefined;
}

export const StageFooterSecondaryActions: React.FC<StageFooterSecondaryActionsProps> = ({
	stage,
	flags,
	onClose,
	onExecuteWriteOffStage,
	onPayStage,
	onExportStageEstimate,
	onOpenLabOrder,
	onOneClickLabOrder,
	onApplyStageDiscount,
	onOpenInstallment,
	onDeleteStage,
}) => {
	return (
		<>
			<StageFooterAccountingActions
				stage={stage}
				flags={flags}
				onClose={onClose}
				onExecuteWriteOffStage={onExecuteWriteOffStage}
				onPayStage={onPayStage}
				onExportStageEstimate={onExportStageEstimate}
			/>

			<StageFooterLabAndDiscountActions
				stage={stage}
				flags={flags}
				onClose={onClose}
				onOpenLabOrder={onOpenLabOrder}
				onOneClickLabOrder={onOneClickLabOrder}
				onApplyStageDiscount={onApplyStageDiscount}
				onOpenInstallment={onOpenInstallment}
				onDeleteStage={onDeleteStage}
			/>
		</>
	);
};
