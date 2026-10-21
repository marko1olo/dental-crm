/**
 * TreatmentPlanPresenterConnectedTools.tsx — Connected tools strip adapter for presenter state.
 * Mandate 8b: <= 120 lines.
 */
import type React from "react";
import { TreatmentPlanPresenterToolsStrip } from "../TreatmentPlanPresenterToolsStrip";
import type { useTreatmentPlanPresenterState } from "./useTreatmentPlanPresenterState";

interface TreatmentPlanPresenterConnectedToolsProps {
	readonly s: ReturnType<typeof useTreatmentPlanPresenterState>;
	readonly teeth?: readonly any[] | undefined;
}

export const TreatmentPlanPresenterConnectedTools: React.FC<
	TreatmentPlanPresenterConnectedToolsProps
> = ({ s, teeth }) => (
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
		selectedTier={s.selectedTier}
		teeth={teeth}
		confirmedNotice={s.confirmedNotice}
	/>
);
