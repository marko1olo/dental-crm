/**
 * apps/web/src/components/cashbox/CashboxView.tsx
 * DENTE Dental CRM — 54-FZ Cashbox Workspace (Canonical Facade strictly <= 120 lines).
 * Mandates: 8b (size <= 120 lines), 8e (doctor & cashier autonomy), 8c (Hot Path).
 */

import React from "react";
import { createPortal } from "react-dom";
import { PaymentModal } from "../finance/PaymentModal.js";
import { RetailProductsModal } from "../billing/RetailProductsModal.js";
import { showToast } from "../GlobalToast.js";
import type { CashboxViewProps } from "./cashboxViewModules/types.js";
import { useCashboxViewController } from "./cashboxViewModules/useCashboxViewController.js";
import { CashboxShiftStatusCard } from "./cashboxViewModules/CashboxShiftStatusCard.js";
import { CashboxQuickActionsBar } from "./cashboxViewModules/CashboxQuickActionsBar.js";
import { UnpaidInvoicesQueue } from "./cashboxViewModules/UnpaidInvoicesQueue.js";
import { CashboxOperationsTable } from "./cashboxViewModules/CashboxOperationsTable.js";

export type { CashboxViewProps };

export function CashboxView(props: CashboxViewProps): React.JSX.Element {
	const ctrl = useCashboxViewController(props);
	const canPortal = typeof document !== "undefined";

	const modals = (
		<>
			{ctrl.isPaymentModalOpen && (
				<PaymentModal
					isOpen={ctrl.isPaymentModalOpen}
					amountRub={ctrl.checkoutResult.totalNetRub}
					patientId={ctrl.selectedInvoice?.patientId || props.patientId}
					patientName={ctrl.selectedInvoice?.patientName || props.patientName}
					patientPhone={ctrl.selectedInvoice?.patientPhone || props.patientPhone}
					patientDepositRub={ctrl.effectiveDepositRub}
					patientFamilyBalanceRub={ctrl.effectiveFamilyBalanceRub}
					visitId={ctrl.selectedInvoice?.visitId || props.visitId}
					invoiceId={ctrl.selectedInvoice?.id || props.invoiceId}
					documentId={ctrl.selectedInvoice?.id || props.documentId}
					cashierName={props.cashierName || "Администратор / Врач"}
					clinicLegalName={props.clinicName || "Стоматологическая клиника"}
					defaultMethod={ctrl.activePaymentMethod}
					onClose={() => { ctrl.setIsPaymentModalOpen(false); ctrl.setSelectedInvoice(null); }}
					onSuccess={(receipt) => {
						ctrl.setIsPaymentModalOpen(false);
						ctrl.handleInvoicePaymentSuccess(receipt);
						props.onPaymentComplete?.(receipt);
					}}
				/>
			)}

			{ctrl.isRetailModalOpen && (
				<RetailProductsModal
					isOpen={ctrl.isRetailModalOpen}
					onClose={() => ctrl.setIsRetailModalOpen(false)}
					onAddProduct={(p, q) => {
						ctrl.handleAddAmountPreset(p.priceRub * q);
						showToast(`Добавлено: ${p.name} (${q} шт.)`, "success");
					}}
					patientName={props.patientName}
				/>
			)}
		</>
	);

	return (
		<div className="cashbox-view flex flex-col gap-4 p-4 max-w-6xl mx-auto">
			<CashboxShiftStatusCard
				isShiftOpen={ctrl.isShiftOpen}
				cashierName={props.cashierName}
				cashierInn={props.cashierInn}
				clinicName={props.clinicName}
				clinicInn={props.clinicInn}
				cashBoxes={ctrl.cashBoxes}
				onOpenShift={ctrl.handleOpenShift}
				onCloseShift={ctrl.handleCloseShift}
				onPrintXReport={ctrl.handlePrintXReport}
				onCashIn={ctrl.handleCashIn}
				onCashOut={ctrl.handleCashOut}
			/>

			<UnpaidInvoicesQueue
				onSelectInvoiceForPayment={ctrl.handlePayInvoice}
				selectedInvoiceId={ctrl.selectedInvoice?.id}
				currentPatientId={props.patientId}
				currentPatientName={props.patientName}
			/>

			<CashboxQuickActionsBar
				grossAmountRub={ctrl.grossAmountRub}
				setGrossAmountRub={ctrl.setGrossAmountRub}
				onAddAmountPreset={ctrl.handleAddAmountPreset}
				discountPercent={ctrl.discountPercent}
				setDiscountPercent={ctrl.setDiscountPercent}
				isWarranty={ctrl.isWarranty}
				setIsWarranty={ctrl.setIsWarranty}
				isStaffColleague={ctrl.isStaffColleague}
				setIsStaffColleague={ctrl.setIsStaffColleague}
				onResetDiscount={ctrl.resetDiscount}
				onOpenRetailModal={() => ctrl.setIsRetailModalOpen(true)}
				payerType={ctrl.payerType}
				setPayerType={ctrl.setPayerType}
				buyerInn={ctrl.buyerInn}
				setBuyerInn={ctrl.setBuyerInn}
				innValidation={ctrl.innValidation}
				checkoutResult={ctrl.checkoutResult}
				isSubmittingZeroReceipt={ctrl.isSubmittingZeroReceipt}
				onProcessZeroDiscountCheckout={ctrl.handleProcessZeroDiscountCheckout}
				onAllocateAll={ctrl.handleAllocateAll}
				onOpenPaymentWithMethod={ctrl.handleOpenPaymentWithMethod}
			/>

			<CashboxOperationsTable isShiftOpen={ctrl.isShiftOpen} />

			{canPortal ? createPortal(modals, document.body) : modals}
		</div>
	);
}

export default CashboxView;
