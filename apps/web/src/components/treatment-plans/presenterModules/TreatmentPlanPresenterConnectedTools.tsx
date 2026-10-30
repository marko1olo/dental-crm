/**
 * TreatmentPlanPresenterConnectedTools.tsx — Connected tools strip adapter for presenter state.
 * Mandate 8b: <= 120 lines.
 */
import React from "react";
import type { ToothData } from "../../odontogram/ToothChart";
import { TreatmentPlanPresenterToolsStrip } from "../TreatmentPlanPresenterToolsStrip";
import type { useTreatmentPlanPresenterState } from "./useTreatmentPlanPresenterState";

interface TreatmentPlanPresenterConnectedToolsProps {
	readonly s: ReturnType<typeof useTreatmentPlanPresenterState>;
	readonly teeth?: readonly ToothData[] | readonly { toothNumber?: number }[] | undefined;
	readonly hideButtonsBar?: boolean | undefined;
	readonly onApproveAndSign?: ((tier: any) => void) | undefined;
}

export const TreatmentPlanPresenterConnectedTools: React.FC<
	TreatmentPlanPresenterConnectedToolsProps
> = ({ s, teeth, hideButtonsBar, onApproveAndSign }) => {
	const normalizedTeeth: readonly ToothData[] | undefined = teeth?.map((t) => ({
		toothNumber: t.toothNumber ?? 11,
		state: "state" in t && t.state ? t.state : ("Healthy" as const),
		...("surfaces" in t && (t as any).surfaces ? { surfaces: (t as any).surfaces } : {}),
	}));

	return (
		<TreatmentPlanPresenterToolsStrip
			activeToolsPanel={s.activeToolsPanel}
			setActiveToolsPanel={s.setActiveToolsPanel}
			isCopilotExecuting={s.isCopilotExecuting}
			onExecuteCopilot={s.handleExecuteCopilot}
			onApplyClinicalBundle={s.handleApplyClinicalBundle}
			copilotFeedback={s.copilotFeedback}
			setCopilotFeedback={s.setCopilotFeedback}
			doctorDiscountPercent={s.doctorDiscountPercent}
			setDoctorDiscountPercent={s.setDoctorDiscountPercent}
			onApplyDoctorDiscount={s.handleApplyDoctorDiscount}
			doctorDiscountRub={s.doctorDiscountRub}
			setDoctorDiscountRub={s.setDoctorDiscountRub}
			doctorDiscountMode={s.doctorDiscountMode}
			setDoctorDiscountMode={s.setDoctorDiscountMode}
			doctorDiscountTargetStage={s.doctorDiscountTargetStage}
			setDoctorDiscountTargetStage={s.setDoctorDiscountTargetStage}
			onApplyDoctorFixedDiscount={s.handleApplyDoctorFixedDiscount}
			showMicroConsumables={s.showMicroConsumables}
			setShowMicroConsumables={s.setShowMicroConsumables}
			selectedTier={s.selectedTier}
			allTiers={s.allTiers}
			onSelectPlan={s.handleSelectTier}
			teeth={normalizedTeeth}
			patientChoiceBtnText={s.patientChoiceBtnText}
			choiceConfirmedBtnText={s.choiceConfirmedBtnText}
			isChoiceConfirmed={s.isChoiceConfirmed}
			onConfirmPatientChoice={s.handleConfirmPatientChoice}
			onApproveAndSign={onApproveAndSign}
			confirmedNotice={s.confirmedNotice}
			hideButtonsBar={hideButtonsBar}
		/>
	);
};
