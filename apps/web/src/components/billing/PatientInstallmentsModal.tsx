/**
 * apps/web/src/components/billing/PatientInstallmentsModal.tsx
 *
 * Clinic Internal 0% Installment Management Modal.
 * Decomposed facade delegating to ./installments/ in strict compliance with Mandate 8b.
 * Strictly <= 120 lines.
 */

import React from "react";
import { createPortal } from "react-dom";
import { Wallet, X, PlusCircle, Landmark } from "lucide-react";
import type { PatientInstallmentsModalProps } from "./installments/installmentsTypes.js";
import { usePatientInstallmentsState } from "./installments/usePatientInstallmentsState.js";
import { InstallmentsHeader } from "./installments/InstallmentsHeader.js";
import { InstallmentsKpiCards } from "./installments/InstallmentsKpiCards.js";
import { InstallmentsQuickPaySubView } from "./installments/InstallmentsQuickPaySubView.js";
import { InstallmentsReminderSubView } from "./installments/InstallmentsReminderSubView.js";
import { InstallmentsPresetCreatorSubView } from "./installments/InstallmentsPresetCreatorSubView.js";
import { InstallmentsScheduleTable } from "./installments/InstallmentsScheduleTable.js";
import { InstallmentsActionBar } from "./installments/InstallmentsActionBar.js";
if (typeof window !== "undefined") {
	void import("./patientInstallments.css");
}

export type { PatientInstallmentsModalProps };

export const PatientInstallmentsModal: React.FC<PatientInstallmentsModalProps> = (props) => {
	const { isOpen, onClose, patientName = "", onOpenBankInstallment } = props;
	const {
		plan, isContractLoading, activeSubView, setActiveSubView, selectedPaymentItemId, setSelectedPaymentItemId,
		selectedPaymentMethod, setSelectedPaymentMethod, customPayAmountRub, setCustomPayAmountRub,
		lastReceipt, setLastReceipt, selectedPreset, setSelectedPreset, newTotalRubles, setNewTotalRubles,
		newDownPaymentPercent, setNewDownPaymentPercent, newMonthsCount, setNewMonthsCount,
		reminderData, handleInitiateQuickPay, handleExecutePayment, handleCreateNewPlan,
	} = usePatientInstallmentsState(props);

	if (!isOpen) return null;

	const modalMarkup = (
		<div className="patient-installments-overlay" data-testid="patient-installments-overlay">
			<div className="patient-installments-modal" data-testid="patient-installments-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
				{plan ? (
					<InstallmentsHeader
						plan={plan} patientName={patientName} lastReceipt={lastReceipt}
						onClose={onClose} onDismissReceipt={() => setLastReceipt(null)}
					/>
				) : (
					<div className="patient-installments-header">
						<div className="flex flex-col gap-0.5 min-w-0">
							<div className="flex items-center gap-2">
								<Wallet className="w-4 h-4 text-[var(--primary)] shrink-0" />
								<span className="font-semibold text-sm text-[var(--ink)]" id="modal-title">
									Внутренняя рассрочка клиники (0%)
								</span>
							</div>
							<div className="text-xs text-[var(--ink-muted)] truncate">
								Пациент: <strong className="text-[var(--ink)]">{patientName || "Не выбран"}</strong>
							</div>
						</div>
						<button
							type="button"
							onClick={onClose}
							data-testid="btn-close-installments"
							className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
							title="Закрыть"
						>
							<X className="w-4 h-4" />
						</button>
					</div>
				)}

				{plan && <InstallmentsKpiCards plan={plan} />}

				{plan && activeSubView === "quick_pay" && (
					<InstallmentsQuickPaySubView
						plan={plan} selectedPaymentItemId={selectedPaymentItemId}
						setSelectedPaymentItemId={setSelectedPaymentItemId}
						customPayAmountRub={customPayAmountRub} setCustomPayAmountRub={setCustomPayAmountRub}
						selectedPaymentMethod={selectedPaymentMethod} setSelectedPaymentMethod={setSelectedPaymentMethod}
						onCancel={() => setActiveSubView("schedule")} onExecutePayment={handleExecutePayment}
					/>
				)}

				{plan && reminderData && activeSubView === "reminder" && (
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

				{plan ? (
					<>
						<InstallmentsScheduleTable plan={plan} onInitiateQuickPay={handleInitiateQuickPay} />
						<InstallmentsActionBar
							activeSubView={activeSubView} setActiveSubView={setActiveSubView}
							isPlanCompleted={plan.status === "completed"}
							onInitiateQuickPay={() => handleInitiateQuickPay()}
							onOpenBankInstallment={onOpenBankInstallment}
						/>
					</>
				) : (
					activeSubView !== "create_preset" && (
						<div className="py-12 px-6 flex flex-col items-center text-center gap-2.5" data-testid="installments-empty-state">
							<Wallet className="w-10 h-10 text-[var(--ink-muted)]" />
							<div className="text-sm font-semibold text-[var(--ink)]">
								{isContractLoading
									? "Загрузка договора рассрочки…"
									: "Активный договор рассрочки не найден"}
							</div>
							<p className="text-xs text-[var(--ink-muted)] max-w-md">
								Оформите внутренний график рассрочки без переплаты или отправьте заявку на банковскую рассрочку.
							</p>
							{!isContractLoading && (
								<div className="flex flex-wrap items-center justify-center gap-2 mt-2">
									<button
										type="button"
										onClick={() => setActiveSubView("create_preset")}
										data-testid="btn-empty-create-installment"
										className="h-11 sm:h-9 px-4 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-sm font-medium inline-flex items-center gap-2 cursor-pointer shadow-sm"
									>
										<PlusCircle className="w-4 h-4 shrink-0" />
										<span>Оформить рассрочку</span>
									</button>
									{onOpenBankInstallment && (
										<button
											type="button"
											onClick={onOpenBankInstallment}
											className="h-11 sm:h-9 px-3.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-sm font-medium text-[var(--ink)] inline-flex items-center gap-2 cursor-pointer"
										>
											<Landmark className="w-4 h-4 shrink-0" />
											<span>Банковская рассрочка (QR)</span>
										</button>
									)}
								</div>
							)}
						</div>
					)
				)}
			</div>
		</div>
	);

	if (typeof document !== "undefined") {
		return createPortal(modalMarkup, document.body);
	}
	return modalMarkup;
};

export default PatientInstallmentsModal;
