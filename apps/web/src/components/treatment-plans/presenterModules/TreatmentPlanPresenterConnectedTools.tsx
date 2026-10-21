/**
 * TreatmentPlanPresenterConnectedTools.tsx — Connected tools strip adapter for presenter state.
 * Mandate 8b: <= 120 lines.
 */
import type React from "react";
import type { ToothData } from "../../odontogram/ToothChart";
import { TreatmentPlanPresenterToolsStrip } from "../TreatmentPlanPresenterToolsStrip";
import type { useTreatmentPlanPresenterState } from "./useTreatmentPlanPresenterState";

interface TreatmentPlanPresenterConnectedToolsProps {
	readonly s: ReturnType<typeof useTreatmentPlanPresenterState>;
	readonly teeth?: readonly ToothData[] | readonly { toothNumber?: number }[] | undefined;
}

export const TreatmentPlanPresenterConnectedTools: React.FC<
	TreatmentPlanPresenterConnectedToolsProps
> = ({ s, teeth }) => {
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
			selectedTier={s.selectedTier}
			teeth={normalizedTeeth}
			confirmedNotice={s.confirmedNotice}
		/>
	);
};
