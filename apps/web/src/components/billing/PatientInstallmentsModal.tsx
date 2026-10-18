/**
 * apps/web/src/components/billing/PatientInstallmentsModal.tsx
 *
 * Clinic Internal 0% Installment Management Modal.
 * Decomposed facade delegating to ./installments/ in strict compliance with Mandate 8b.
 * Strictly <= 120 lines.
 */

import React from "react";
import type { PatientInstallmentsModalProps } from "./installments/installmentsTypes.js";
import { usePatientInstallmentsState } from "./installments/usePatientInstallmentsState.js";
import { InstallmentsHeader } from "./installments/InstallmentsHeader.js";
import { InstallmentsKpiCards } from "./installments/InstallmentsKpiCards.js";
import { InstallmentsQuickPaySubView } from "./installments/InstallmentsQuickPaySubView.js";
import { InstallmentsReminderSubView } from "./installments/InstallmentsReminderSubView.js";
import { InstallmentsPresetCreatorSubView } from "./installments/InstallmentsPresetCreatorSubView.js";
import { InstallmentsScheduleTable } from "./installments/InstallmentsScheduleTable.js";
import { InstallmentsActionBar } from "./installments/InstallmentsActionBar.js";
import "./patientInstallments.css";

export type { PatientInstallmentsModalProps };

export const PatientInstallmentsModal: React.FC<PatientInstallmentsModalProps> = (props) => {
	const { isOpen, onClose, patientName = "Смирнова Елена Васильевна", onOpenBankInstallment } = props;
	const {
		plan, activeSubView, setActiveSubView, selectedPaymentItemId, setSelectedPaymentItemId,
		selectedPaymentMethod, setSelectedPaymentMethod, customPayAmountRub, setCustomPayAmountRub,
		lastReceipt, selectedPreset, setSelectedPreset, newTotalRubles, setNewTotalRubles,
		newDownPaymentPercent, setNewDownPaymentPercent, newMonthsCount, setNewMonthsCount,
		reminderData, handleInitiateQuickPay, handleExecutePayment, handleCreateNewPlan,
	} = usePatientInstallmentsState(props);

	if (!isOpen) return null;

	return (
		<div className="patient-installments-overlay" data-testid="patient-installments-overlay">
			<div className="patient-installments-modal" data-testid="patient-installments-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
				<InstallmentsHeader
					plan={plan} patientName={patientName} lastReceipt={lastReceipt}
					onClose={onClose} onDismissReceipt={() => {}}
				/>

				<InstallmentsKpiCards plan={plan} />

				{activeSubView === "quick_pay" && (
					<InstallmentsQuickPaySubView
						plan={plan} selectedPaymentItemId={selectedPaymentItemId}
						setSelectedPaymentItemId={setSelectedPaymentItemId}
						customPayAmountRub={customPayAmountRub} setCustomPayAmountRub={setCustomPayAmountRub}
						selectedPaymentMethod={selectedPaymentMethod} setSelectedPaymentMethod={setSelectedPaymentMethod}
						onCancel={() => setActiveSubView("schedule")} onExecutePayment={handleExecutePayment}
					/>
				)}

				{activeSubView === "reminder" && (
					<InstallmentsReminderSubView
						reminderData={reminderData} onCancel={() => setActiveSubView("schedule")}
					/>
				)}

				{activeSubView === "create_preset" && (
					<InstallmentsPresetCreatorSubView
						selectedPreset={selectedPreset} setSelectedPreset={setSelectedPreset}
						newTotalRubles={newTotalRubles} setNewTotalRubles={setNewTotalRubles}
						newDownPaymentPercent={newDownPaymentPercent} setNewDownPaymentPercent={setNewDownPaymentPercent}
						newMonthsCount={newMonthsCount} setNewMonthsCount={setNewMonthsCount}
						onCancel={() => setActiveSubView("schedule")} onCreatePlan={handleCreateNewPlan}
					/>
				)}

				<InstallmentsScheduleTable plan={plan} onInitiateQuickPay={handleInitiateQuickPay} />

				<InstallmentsActionBar
					activeSubView={activeSubView} setActiveSubView={setActiveSubView}
					isPlanCompleted={plan.status === "completed"}
					onInitiateQuickPay={() => handleInitiateQuickPay()}
					onOpenBankInstallment={onOpenBankInstallment}
				/>
			</div>
		</div>
	);
};

export default PatientInstallmentsModal;
