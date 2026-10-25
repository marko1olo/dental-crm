import { useState } from "react";
import { FinanceOperationsToolbar } from "./FinanceOperationsToolbar";
import { FinanceSummaryCards } from "./FinanceSummaryCards";
import { FinanceCashboxSection } from "./FinanceCashboxSection";
import { FinanceTransactionsSection } from "./FinanceTransactionsSection";
import { FinanceModalsHost } from "./modalModules/FinanceModalsHost";
import { DoctorPayrollTab } from "./DoctorPayrollTab";
import { FinanceTabsNavBar } from "./FinanceTabsNavBar";
import type { FinanceViewComponentProps } from "./types";
import { useFinanceView } from "./useFinanceView";

export function FinanceView(rawProps?: FinanceViewComponentProps) {
	const s = useFinanceView(rawProps);
	const [activeTab, setActiveTab] = useState<"cashbox" | "doctor_payroll">("cashbox");
	const [isDoctorPayrollOpen, setIsDoctorPayrollOpen] = useState(false);

	return (
		<div className="finance-panel border-0 bg-transparent p-0 shadow-none pb-32 max-sm:pb-48 max-w-full min-w-0 overflow-x-hidden" id="finance">
			<FinanceOperationsToolbar
				pendingCheckout={s.pendingCheckout}
				onResetPendingCheckout={() => {
					sessionStorage.removeItem("dente_pending_checkout");
					localStorage.removeItem("dente_pending_checkout");
					s.setPendingCheckout(null);
				}}
				effectivePatient={s.effectivePatient}
				effectiveBillingSummary={s.effectiveBillingSummary}
				isCashShiftOpen={s.isCashShiftOpen}
				onToggleCashShift={() => s.setIsCashShiftOpen((prev) => !prev)}
				isShiftOpen={s.isShiftOpen}
				onPayDebtQuick={() => {
					if (s.effectiveBillingSummary?.totalDueRub) {
						s.setPaymentAmount(String(s.effectiveBillingSummary.totalDueRub));
						s.focusPaymentCapture();
					}
				}}
				money={s.money}
				onOpenInvoices={() => s.setIsInvoicesOpen(true)}
				isFinanceOptionsOpen={s.isFinanceOptionsOpen}
				onToggleFinanceOptions={() => s.setIsFinanceOptionsOpen((prev) => !prev)}
				onCloseFinanceOptions={() => s.setIsFinanceOptionsOpen(false)}
				onOpenPnl={() => s.setIsPnlOpen(true)}
				onGoToDocuments={s.onGoToDocuments}
				onOpenCashbox={() => s.setIsCashboxOpen(true)}
				onOpenBillingAct={() => s.setIsBillingActOpen(true)}
				onOpenQuickExpense={() => s.setIsQuickExpenseOpen(true)}
				onOpenTaxCertificate={() => s.setIsTaxModalOpen(true)}
				onOpenT13Timesheet={() => setIsDoctorPayrollOpen(true)}
				onOpenFamilyBilling={() => s.setIsFamilyBillingOpen(true)}
				onOpenSplitPayment={() => s.setIsSplitPaymentOpen(true)}
				onOpenDoctorPayroll={() => setIsDoctorPayrollOpen(true)}
				shiftNumber={s.shiftNumber}
				paymentFiscalCashierName={s.paymentFiscalCashierName}
				cashInDrawerRub={s.cashInDrawerRub}
				cardSumRub={s.cardSumRub}
				sbpSumRub={s.sbpSumRub}
				advanceOffsetRub={s.advanceOffsetRub}
				onOpenShift={s.handleOpenShift}
				onCloseShift={s.handleCloseShift}
				onCashIn={s.handleCashIn}
				onCashOut={s.handleCashOut}
				onPrintXReport={s.handlePrintXReport}
			/>

			<FinanceTabsNavBar activeTab={activeTab} onSelectTab={setActiveTab} />

			{activeTab === "doctor_payroll" ? (
				<DoctorPayrollTab clinicName={s.dashboard?.clinicSettings?.name} />
			) : (
				<>
					<FinanceSummaryCards
						activePaymentsCount={(s.activePayments ?? []).length}
						billingSummary={s.effectiveBillingSummary}
						money={s.money}
						onGoToVisit={s.onGoToVisit}
						priorityLabels={s.scenarioPriorityLabels}
						scenarios={s.activeTreatmentPlanScenarios ?? []}
						strategyLabels={s.scenarioStrategyLabels}
						onOpenTaxCertificateModal={() => s.setIsTaxModalOpen(true)}
						dayPayments={s.dashboard?.payments ?? s.activePayments ?? []}
						methodLabels={s.paymentMethodLabels}
					/>
					<FinanceCashboxSection s={s} />
					<FinanceTransactionsSection s={s} />
				</>
			)}

			<FinanceModalsHost s={s} isDoctorPayrollOpen={isDoctorPayrollOpen} onCloseDoctorPayroll={() => setIsDoctorPayrollOpen(false)} />
		</div>
	);
}

export * from "./types";
export { useFinanceView } from "./useFinanceView";
export { FinanceOperationsToolbar } from "./FinanceOperationsToolbar";
export { FinanceSummaryCards } from "./FinanceSummaryCards";
export { FinanceTransactionsTable } from "./FinanceTransactionsTable";
export { DoctorPayrollTab } from "./DoctorPayrollTab";
export default FinanceView;
