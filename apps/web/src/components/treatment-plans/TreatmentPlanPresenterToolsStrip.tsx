import React from "react";
import { ClinicalBundlesPanel } from "./ClinicalBundlesPanel";
import { PresenterCopilotPanel } from "./presenterTools/PresenterCopilotPanel";
import { PresenterDoctorDiscountPanel } from "./presenterTools/PresenterDoctorDiscountPanel";
import { PresenterToolsButtonsBar } from "./presenterTools/PresenterToolsButtonsBar";
import type { TreatmentPlanPresenterToolsStripProps } from "./presenterTools/presenterToolsTypes";

export { type TreatmentPlanPresenterToolsStripProps } from "./presenterTools/presenterToolsTypes";

export const TreatmentPlanPresenterToolsStrip: React.FC<TreatmentPlanPresenterToolsStripProps> = ({
	activeToolsPanel, setActiveToolsPanel, isCopilotExecuting, onExecuteCopilot,
	onApplyClinicalBundle, copilotFeedback, setCopilotFeedback, doctorDiscountPercent,
	onApplyDoctorDiscount, doctorDiscountRub = 0, doctorDiscountMode = "percent",
	setDoctorDiscountMode, doctorDiscountTargetStage = 0, setDoctorDiscountTargetStage,
	onApplyDoctorFixedDiscount, selectedTier, teeth, confirmedNotice, hideButtonsBar = false,
}) => {
	return (
		<>
			{!hideButtonsBar && (
				<PresenterToolsButtonsBar
					activeToolsPanel={activeToolsPanel}
					setActiveToolsPanel={setActiveToolsPanel}
					doctorDiscountPercent={doctorDiscountPercent}
					doctorDiscountRub={doctorDiscountRub}
					doctorDiscountMode={doctorDiscountMode}
				/>
			)}

			<PresenterCopilotPanel
				isActive={activeToolsPanel === "copilot"}
				isCopilotExecuting={isCopilotExecuting}
				onExecuteCopilot={onExecuteCopilot}
				copilotFeedback={copilotFeedback}
				setCopilotFeedback={setCopilotFeedback}
				confirmedNotice={confirmedNotice}
			/>

			<div className={`px-6 py-2.5 bg-[var(--tp-surface-soft)] border-b border-[var(--tp-border)] no-print ${activeToolsPanel === "bundles" ? "" : "hidden"}`}>
				<ClinicalBundlesPanel
					compact
					onApplyBundle={onApplyClinicalBundle}
					initialToothNumber={teeth && teeth.length > 0 ? (teeth[0]?.toothNumber || 16) : 16}
				/>
			</div>

			<PresenterDoctorDiscountPanel
				isActive={activeToolsPanel === "doctorDiscount"}
				selectedTier={selectedTier}
				doctorDiscountMode={doctorDiscountMode}
				setDoctorDiscountMode={setDoctorDiscountMode}
				doctorDiscountTargetStage={doctorDiscountTargetStage}
				setDoctorDiscountTargetStage={setDoctorDiscountTargetStage}
				doctorDiscountPercent={doctorDiscountPercent}
				onApplyDoctorDiscount={onApplyDoctorDiscount}
				doctorDiscountRub={doctorDiscountRub}
				onApplyDoctorFixedDiscount={onApplyDoctorFixedDiscount}
			/>
		</>
	);
};
