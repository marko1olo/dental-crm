/**
 * StagePaymentPlanModal.tsx — Студия поэтапной оплаты и эскроу-депозита планов лечения (DENTE CRM).
 * Декомпозирован по Мандату 8b (все файлы <= 120 строк).
 */

import React from "react";
import { createPortal } from "react-dom";
import type { StagePaymentModalTab, StagePaymentPlanModalProps } from "./modal/stagePaymentModalTypes";
import { useStagePaymentPlanState } from "./modal/useStagePaymentPlanState";
import { StagePaymentModalHeader } from "./modal/StagePaymentModalHeader";
import { StagePaymentModalTabs } from "./modal/StagePaymentModalTabs";
import { StagePaymentModalBody } from "./modal/StagePaymentModalBody";
import { StagePaymentInstallmentWrapper } from "./modal/StagePaymentInstallmentWrapper";
import { StagePaymentStatusBanner } from "./modal/StagePaymentStatusBanner";
import "./stagePayment.css";

export type { StagePaymentModalTab, StagePaymentPlanModalProps };

export const StagePaymentPlanModal: React.FC<StagePaymentPlanModalProps> = (props) => {
	const {
		isOpen,
		onClose,
		planTitle = "Комплексный план лечения",
		patientName = "",
		patientId = "",
		clinicName = "Стоматологическая клиника",
		clinicInn = "",
		doctorFullName = "Лечащий врач",
		initialStages,
		initialDepositKopecks,
		initialTab = "schedule",
	} = props;

	if (!isOpen) return null;

	const state = useStagePaymentPlanState({
		initialStages, initialDepositKopecks, initialTab, patientId, patientName, planTitle, clinicName, clinicInn,
	});

	if (state.isInstallmentModalOpen && state.selectedStageForInstallment) {
		const stg = state.selectedStageForInstallment;
		return (
			<StagePaymentInstallmentWrapper
				stage={stg}
				isOpen={state.isInstallmentModalOpen}
				patientId={patientId}
				patientName={patientName}
				clinicName={clinicName}
				clinicInn={clinicInn}
				planTitle={planTitle}
				onClose={() => { state.setIsInstallmentModalOpen(false); state.setSelectedStageForInstallment(null); }}
				onApproved={() => {
					state.setStages((prev) => prev.map((s) => (s.id === stg.id ? { ...s, status: "advance_paid", advancePaidKopecks: s.advanceRequiredKopecks, escrowLockedKopecks: s.advanceRequiredKopecks } : s)));
					state.setStatusMessage(`Рассрочка по этапу №${stg.stageNumber} одобрена! Аванс зачислен в эскроу.`);
					state.setIsInstallmentModalOpen(false);
					state.setSelectedStageForInstallment(null);
				}}
			/>
		);
	}

	const modalContent = (
		<div className="stage-payment-modal-overlay" role="dialog" aria-modal="true">
			<div className="stage-payment-modal-container">
				<StagePaymentModalHeader
					planTitle={planTitle}
					patientName={patientName}
					patientId={patientId}
					onDownloadCsv={state.handleDownloadCsv}
					onPrint={() => window.print()}
					onClose={onClose}
				/>
				<StagePaymentStatusBanner message={state.statusMessage} onClose={() => state.setStatusMessage(null)} />
				<StagePaymentModalTabs
					activeTab={state.activeTab}
					onSelectTab={state.setActiveTab}
					stagesCount={state.stages.length}
					depositWallet={state.depositWallet}
				/>
				<StagePaymentModalBody
					{...state}
					onToggleStageMenu={(id) => state.setActiveStageMenuId(state.activeStageMenuId === id ? null : id)}
					onPayAdvance={state.handlePayAdvanceForStage}
					onOpenActTab={(id) => { state.setSelectedStageForActId(id); state.setActiveTab("act"); }}
					onOpenInstallmentModal={(stg) => { state.setSelectedStageForInstallment(stg); state.setIsInstallmentModalOpen(true); }}
					onOpenFiscalTab={(id) => { state.setSelectedStageForFiscalId(id); state.setActiveTab("fiscal54fz"); }}
					onSelectStageForAct={state.setSelectedStageForActId}
					onActNumberChange={state.setActNumberInput}
					onActSignDateChange={state.setActSignDate}
					onSignStageAct={state.handleSignStageAct}
					onNewExpenseTitleChange={state.setNewExpenseTitle}
					onNewExpenseRubChange={state.setNewExpenseRub}
					onNewExpenseCategoryChange={state.setNewExpenseCategory}
					onAddCustomExpense={state.handleAddCustomExpense}
					onSelectStageForFiscal={state.setSelectedStageForFiscalId}
					onFiscalPaymentTypeChange={state.setFiscalPaymentType}
					onFiscalPaymentMethodChange={state.setFiscalPaymentMethod}
					onGenerateFiscalReceipt={state.handleGenerateFiscalReceipt}
					clinicName={clinicName}
					clinicInn={clinicInn}
					doctorFullName={doctorFullName}
					patientName={patientName}
					patientId={patientId}
					planTitle={planTitle}
				/>
			</div>
		</div>
	);

	if (typeof document !== "undefined") {
		return createPortal(modalContent, document.body);
	}
	return modalContent;
};

export default StagePaymentPlanModal;
