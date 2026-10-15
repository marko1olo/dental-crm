/**
 * TreatmentPlanPresenterModal.tsx — Интерактивная студия презентации планов лечения пациенту у кресла
 * (Wave 19: Chairside Treatment Plan Presenter & Official Appendix #1 Generator).
 *
 * Декомпозирован строго по Мандату 8b (лимит <= 120 строк).
 */

import React from "react";
import { createPortal } from "react-dom";
import "./treatmentPlans.css";
import { isMicroConsumable, type PlanItemLike } from "./treatmentPlanConsumables";
import { TreatmentPlanPresenterHeader } from "./TreatmentPlanPresenterHeader";
import { TreatmentPlanPresenterToolsStrip } from "./TreatmentPlanPresenterToolsStrip";
import { TreatmentPlanPresenterFooter } from "./TreatmentPlanPresenterFooter";
import { TreatmentPlanPresenterBody } from "./presenterModules/TreatmentPlanPresenterBody";
import {
	useTreatmentPlanPresenterState,
	getTierLetter,
	formatRubles,
} from "./presenterModules/useTreatmentPlanPresenterState";
import type { TreatmentPlanPresenterModalProps } from "./presenterModules/treatmentPlanPresenterTypes";

export { isMicroConsumable, type PlanItemLike };
export { TreatmentPlanStagesList } from "./presenterModules/TreatmentPlanStagesList";
export { TreatmentPlanPaymentSchedule } from "./presenterModules/TreatmentPlanPaymentSchedule";
export { TreatmentPlanAcceptanceFooter } from "./presenterModules/TreatmentPlanAcceptanceFooter";
export { useTreatmentPlanPresenterState, getTierLetter, formatRubles };
export type { TreatmentPlanPresenterModalProps };

export const TreatmentPlanPresenterModal: React.FC<TreatmentPlanPresenterModalProps> = (props) => {
	const { isOpen, onClose, patientName = "", doctorFullName = "", teeth, onSelectPlan, onApproveAndSign, className = "" } = props;
	const s = useTreatmentPlanPresenterState(props);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className={"treatment-presenter-backdrop " + (s.isFullscreen ? "fullscreen-mode" : "")}
			data-testid="treatment-plan-presenter-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="treatment-presenter-modal-title"
		>
			<div className={`treatment-presenter-modal treatment-presenter-container ${s.isFullscreen ? "treatment-presenter-fullscreen " : ""}${className}`}>
				{/* Apple HIG Drag Handle for Mobile Viewports (<= 768px) */}
				<div className="treatment-presenter-drag-handle sm:hidden" />

				{/* Top Header */}
				<TreatmentPlanPresenterHeader
					patientName={patientName}
					doctorFullName={doctorFullName}
					planAgeDays={s.planAgeDays}
					isFullscreen={s.isFullscreen}
					onToggleFullscreen={() => s.setIsFullscreen((prev) => !prev)}
					activeTab={s.activeTab}
					onSelectTab={s.setActiveTab}
					onCopyTiersSummary={s.handleCopyTiersSummary}
					onPrintAppendix={s.handlePrintAppendix}
					onClose={onClose}
					aiAuditResult={s.aiAuditResult}
					isAiAuditing={s.isAiAuditing}
					onRunAiAudit={s.handleRunAiAudit}
				/>

				{/* Chairside Assistant & Clinical Tools Strip */}
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
					onSelectPlan={onSelectPlan}
					teeth={teeth}
					patientChoiceBtnText={s.patientChoiceBtnText}
					choiceConfirmedBtnText={s.choiceConfirmedBtnText}
					isChoiceConfirmed={s.isChoiceConfirmed}
					confirmedNotice={s.confirmedNotice}
					onConfirmPatientChoice={s.handleConfirmPatientChoice}
					onApproveAndSign={onApproveAndSign}
				/>

				{/* Main Body */}
				<TreatmentPlanPresenterBody s={s} props={props} />

				{/* Sticky Bottom Action Footer */}
				<TreatmentPlanPresenterFooter
					selectedTier={s.selectedTier}
					getTierLetter={getTierLetter}
					onPrintAppendix={s.handlePrintAppendix}
					onConfirmPatientChoice={s.handleConfirmPatientChoice}
					onApproveAndSign={onApproveAndSign}
					isChoiceConfirmed={s.isChoiceConfirmed}
					patientChoiceBtnText={s.patientChoiceBtnText}
					choiceConfirmedBtnText={s.choiceConfirmedBtnText}
				/>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};
