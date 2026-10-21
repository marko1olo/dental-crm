/**
 * TreatmentPlanPresenterModal.tsx — Интерактивная студия презентации планов лечения пациенту у кресла
 * (Wave 19: Chairside Treatment Plan Presenter & Official Appendix #1 Generator).
 *
 * Декомпозирован строго по Мандату 8b (лимит <= 120 строк).
 */

import type React from "react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import "./treatmentPlans.css";
import { TreatmentPlanPresenterBody } from "./presenterModules/TreatmentPlanPresenterBody";
import { TreatmentPlanPresenterConnectedTools } from "./presenterModules/TreatmentPlanPresenterConnectedTools";
import { TreatmentPlanStagePaymentModal } from "./presenterModules/TreatmentPlanStagePaymentModal";
import type { TreatmentPlanPresenterModalProps } from "./presenterModules/treatmentPlanPresenterTypes";
import { getTierLetter, useTreatmentPlanPresenterState } from "./presenterModules/useTreatmentPlanPresenterState";
import { PresenterToolsButtonsBar } from "./presenterTools/PresenterToolsButtonsBar";
import { TreatmentPlanPresenterFooter } from "./TreatmentPlanPresenterFooter";
import { TreatmentPlanPresenterHeader } from "./TreatmentPlanPresenterHeader";
import type { TreatmentPlanStage } from "./types";

export { formatRubles, getTierLetter, useTreatmentPlanPresenterState } from "./presenterModules/useTreatmentPlanPresenterState";
export { isMicroConsumable, type PlanItemLike } from "./treatmentPlanConsumables";
export type { TreatmentPlanPresenterModalProps };

export const TreatmentPlanPresenterModal: React.FC<
	TreatmentPlanPresenterModalProps
> = (props) => {
	const {
		isOpen,
		onClose,
		patientName = "",
		doctorFullName = "",
		teeth,
		onApproveAndSign,
		className = "",
	} = props;
	const [stageForPayment, setStageForPayment] = useState<TreatmentPlanStage | null>(null);

	const effectiveProps = useMemo(
		() => ({
			...props,
			onPayStage: props.onPayStage || ((st: TreatmentPlanStage) => setStageForPayment(st)),
		}),
		[props],
	);

	const s = useTreatmentPlanPresenterState(effectiveProps);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className={`treatment-presenter-backdrop ${s.isFullscreen ? "fullscreen-mode" : ""}`}
			data-testid="treatment-plan-presenter-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="treatment-presenter-modal-title"
		>
			<div
				className={`treatment-presenter-modal treatment-presenter-container ${s.isFullscreen ? "treatment-presenter-fullscreen " : ""}${className}`}
			>
				<div className="treatment-presenter-drag-handle sm:hidden" />
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
					toolsBarSlot={
						<PresenterToolsButtonsBar
							embedded
							activeToolsPanel={s.activeToolsPanel}
							setActiveToolsPanel={s.setActiveToolsPanel}
							doctorDiscountPercent={s.doctorDiscountPercent}
							doctorDiscountRub={s.doctorDiscountRub}
							doctorDiscountMode={s.doctorDiscountMode}
						/>
					}
				/>
				<TreatmentPlanPresenterConnectedTools s={s} teeth={teeth} hideButtonsBar onApproveAndSign={onApproveAndSign} />
				<TreatmentPlanPresenterBody s={s} props={effectiveProps} />
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
				<TreatmentPlanStagePaymentModal
					stage={stageForPayment}
					patientId={props.patientId}
					patientName={props.patientName}
					patientPhone={props.patientPhone}
					doctorFullName={props.doctorFullName}
					clinicName={props.clinicName}
					onClose={() => setStageForPayment(null)}
				/>
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
};
