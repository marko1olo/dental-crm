/**
 * apps/web/src/components/finance/CashRegisterView.tsx
 * DENTE Dental CRM — Canonical SSOT Cash Register & Cashbox Workspace.
 * Mandates: 8b (size <= 120 lines), 8e (doctor & cashier autonomy), 8c (Hot Path).
 */

import type React from "react";
import { createPortal } from "react-dom";
import { CashboxModalsContainer } from "./cashboxViewModules/CashboxModalsContainer.js";
import { CashboxOperationsTable } from "./cashboxViewModules/CashboxOperationsTable.js";
import { CashboxQuickActionsBar } from "./cashboxViewModules/CashboxQuickActionsBar.js";
import { CashboxShiftStatusCard } from "./cashboxViewModules/CashboxShiftStatusCard.js";
import type { CashboxViewProps } from "./cashboxViewModules/types.js";
import { UnpaidInvoicesQueue } from "./cashboxViewModules/UnpaidInvoicesQueue.js";
import { useCashboxViewController } from "./cashboxViewModules/useCashboxViewController.js";

export type { CashboxViewProps };
export type CashRegisterViewProps = CashboxViewProps;

export function CashRegisterView(props: CashboxViewProps): React.JSX.Element {
	const ctrl = useCashboxViewController(props);
	const canPortal = typeof document !== "undefined";
	const modals = <CashboxModalsContainer ctrl={ctrl} props={props} />;

	return (
		<div className="cashbox-view flex flex-col gap-4 p-4 max-w-6xl mx-auto">
			<CashboxShiftStatusCard
				isShiftOpen={ctrl.isShiftOpen}
				cashierName={props.cashierName} cashierInn={props.cashierInn}
				clinicName={props.clinicName} clinicInn={props.clinicInn}
				cashBoxes={ctrl.cashBoxes}
				onOpenShift={ctrl.handleOpenShift} onCloseShift={ctrl.handleCloseShift}
				onPrintXReport={ctrl.handlePrintXReport} onCashIn={ctrl.handleCashIn} onCashOut={ctrl.handleCashOut}
			/>
			<UnpaidInvoicesQueue
				onSelectInvoiceForPayment={ctrl.handlePayInvoice}
				selectedInvoiceId={ctrl.selectedInvoice?.id}
				currentPatientId={props.patientId} currentPatientName={props.patientName}
			/>
			<CashboxQuickActionsBar
				grossAmountRub={ctrl.grossAmountRub} setGrossAmountRub={ctrl.setGrossAmountRub}
				onAddAmountPreset={ctrl.handleAddAmountPreset}
				discountPercent={ctrl.discountPercent} setDiscountPercent={ctrl.setDiscountPercent}
				isWarranty={ctrl.isWarranty} setIsWarranty={ctrl.setIsWarranty}
				isStaffColleague={ctrl.isStaffColleague} setIsStaffColleague={ctrl.setIsStaffColleague}
				onResetDiscount={ctrl.resetDiscount} onOpenRetailModal={() => ctrl.setIsRetailModalOpen(true)}
				payerType={ctrl.payerType} setPayerType={ctrl.setPayerType}
				buyerInn={ctrl.buyerInn} setBuyerInn={ctrl.setBuyerInn}
				innValidation={ctrl.innValidation} checkoutResult={ctrl.checkoutResult}
				isSubmittingZeroReceipt={ctrl.isSubmittingZeroReceipt}
				onProcessZeroDiscountCheckout={ctrl.handleProcessZeroDiscountCheckout}
				onAllocateAll={ctrl.handleAllocateAll} onOpenPaymentWithMethod={ctrl.handleOpenPaymentWithMethod}
			/>
			<CashboxOperationsTable isShiftOpen={ctrl.isShiftOpen} />
			{canPortal ? createPortal(modals, document.body) : modals}
		</div>
	);
}

export { CashRegisterView as CashboxView };
export default CashRegisterView;