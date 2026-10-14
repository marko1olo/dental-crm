/**
 * TreatmentPlanPresenterModal.tsx — Интерактивная студия презентации планов лечения пациенту у кресла
 * (Wave 19: Chairside Treatment Plan Presenter & Official Appendix #1 Generator).
 *
 * Фасад декомпозирован строго по Мандату 8b (лимит <= 250 строк):
 * - presenterModules/useTreatmentPlanPresenterState.ts — состояние, 3-Tier сравнение, скидки, ИИ
 * - presenterModules/TreatmentPlanStagesList.tsx — GPU-ускоренный список этапов и зубов FDI
 * - presenterModules/TreatmentPlanPaymentSchedule.tsx — график 30/40/30, рассрочка 0%, вычет 13%
 * - presenterModules/TreatmentPlanAcceptanceFooter.tsx — цифровая подпись, согласие ст. 20 № 323-ФЗ
 * - TreatmentPlanPresenterHeader.tsx — шапка презентации и табы навигации
 * - TreatmentPlanPresenterToolsStrip.tsx — кресельная панель инструментов врача
 * - TreatmentPlanPresenterComparisonTab.tsx — 3-Tier сравнение («Эконом», «Оптимум», «Премиум»)
 * - TreatmentPlanPresenterStagesTab.tsx — детальный просмотр клинических этапов
 * - TreatmentPlanPresenterFinanceTab.tsx — рассрочка 0% и 13% вычет НДФЛ
 * - TreatmentPlanPresenterPrintView.tsx — печать Приложения №1 к Договору (ПП РФ № 736)
 * - TreatmentPlanPresenterAiAuditTab.tsx — ИИ-аудит и студия кресельного комментария
 */

import React from "react";
import { createPortal } from "react-dom";
import "./treatmentPlans.css";
import { isMicroConsumable, type PlanItemLike } from "./treatmentPlanConsumables";
import { TreatmentPlanRoadmap } from "./TreatmentPlanRoadmap";
import { TreatmentPlanPresenterHeader } from "./TreatmentPlanPresenterHeader";
import { TreatmentPlanPresenterToolsStrip } from "./TreatmentPlanPresenterToolsStrip";
import { TreatmentPlanPresenterComparisonTab } from "./TreatmentPlanPresenterComparisonTab";
import { TreatmentPlanPresenterStagesTab } from "./TreatmentPlanPresenterStagesTab";
import { TreatmentPlanPresenterFinanceTab } from "./TreatmentPlanPresenterFinanceTab";
import { TreatmentPlanPresenterPrintView } from "./TreatmentPlanPresenterPrintView";
import { TreatmentPlanPresenterAiAuditTab } from "./TreatmentPlanPresenterAiAuditTab";
import { TreatmentPlanPresenterFooter } from "./TreatmentPlanPresenterFooter";
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
	const {
		isOpen,
		onClose,
		patientName = "",
		patientId = "",
		patientPhone = "",
		patientBirthDate,
		doctorFullName = "",
		doctorSpecialty = "",
		clinicName = "DENTE Стоматология",
		clinicLegalName = "",
		clinicInn = "",
		clinicOgrn = "",
		clinicAddress = "",
		clinicPhone = "",
		clinicLicense = "",
		teeth,
		onSelectPlan,
		onApproveAndSign,
		planId,
		watermarkText,
		className = "",
	} = props;

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
				<main className="treatment-presenter-body" data-testid="treatment-presenter-body">
					{s.activeTab === "comparison" && (
						<TreatmentPlanPresenterComparisonTab
							allTiers={s.allTiers}
							selectedTierId={s.selectedTierId}
							onSelectTier={s.handleSelectTier}
							getTierLetter={getTierLetter}
							formatRubles={formatRubles}
							expandedStages={s.expandedStages}
							onToggleStage={s.toggleStage}
							onToggleAllStages={s.toggleAllStages}
							showMicroConsumables={s.showMicroConsumables}
							onUpdateItemPrice={s.handleUpdateItemPrice}
							onConfirmPatientChoice={s.handleConfirmPatientChoice}
							isChoiceConfirmed={s.isChoiceConfirmed}
							confirmedTierId={s.confirmedTierId}
							onApproveAndSign={onApproveAndSign}
							teeth={teeth}
							planId={planId}
							patientId={patientId}
							patientName={patientName}
							patientPhone={patientPhone}
							doctorFullName={doctorFullName}
						/>
					)}

					{s.activeTab === "stages" && (
						<TreatmentPlanPresenterStagesTab
							selectedTier={s.selectedTier}
							selectedTierId={s.selectedTierId}
							allTiers={s.allTiers}
							onSelectTier={s.handleSelectTier}
							showMicroConsumables={s.showMicroConsumables}
							onUpdateItemPrice={s.handleUpdateItemPrice}
						/>
					)}

					{s.activeTab === "roadmap" && (
						<TreatmentPlanRoadmap
							tier={s.selectedTier}
							patientName={patientName}
							patientId={patientId}
							planId={planId}
							doctorName={doctorFullName}
							clinicName={clinicName}
							displayContractNumber={s.displayContractNumber}
							todayRu={s.todayRu}
							getTierLetter={getTierLetter}
							onPrint={s.handlePrintAppendix}
							onConfirmPatientChoice={() => s.handleConfirmPatientChoice(s.selectedTier)}
						/>
					)}

					{s.activeTab === "finance" && (
						<TreatmentPlanPresenterFinanceTab
							selectedTier={s.selectedTier}
							installmentMonths={s.installmentMonths}
							setInstallmentMonths={s.setInstallmentMonths}
						/>
					)}

					{s.activeTab === "print_appendix" && (
						<TreatmentPlanPresenterPrintView
							printDocFormat={s.printDocFormat}
							setPrintDocFormat={s.setPrintDocFormat}
							showMicroConsumables={s.showMicroConsumables}
							setShowMicroConsumables={s.setShowMicroConsumables}
							selectedTier={s.selectedTier}
							patientName={patientName}
							patientBirthDate={patientBirthDate}
							patientPhone={patientPhone}
							doctorFullName={doctorFullName}
							doctorSpecialty={doctorSpecialty}
							clinicName={clinicName}
							clinicLegalName={clinicLegalName}
							clinicInn={clinicInn}
							clinicOgrn={clinicOgrn}
							clinicAddress={clinicAddress}
							clinicPhone={clinicPhone}
							clinicLicense={clinicLicense}
							displayContractNumber={s.displayContractNumber}
							todayRu={s.todayRu}
							watermarkText={watermarkText}
							getTierLetter={getTierLetter}
							patientId={patientId}
							planAgeDays={s.planAgeDays}
						/>
					)}

					{s.activeTab === "ai_audit" && (
						<TreatmentPlanPresenterAiAuditTab
							aiAuditResult={s.aiAuditResult}
							isAiAuditing={s.isAiAuditing}
							aiAuditError={s.aiAuditError}
							onRunAiAudit={s.handleRunAiAudit}
							onExecuteCopilot={s.handleExecuteCopilot}
							selectedTier={s.selectedTier}
						/>
					)}
				</main>

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
