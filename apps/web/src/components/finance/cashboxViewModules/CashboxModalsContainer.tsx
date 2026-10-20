import type React from "react";
import { RetailProductsModal } from "../../billing/RetailProductsModal.js";
import { showToast } from "../../GlobalToast.js";
import { PaymentModal } from "../PaymentModal.js";
import type { CashboxControllerReturn, CashboxViewProps } from "./types.js";

export interface CashboxModalsContainerProps {
	readonly ctrl: CashboxControllerReturn;
	readonly props: CashboxViewProps;
}

/**
 * Modals container for CashRegisterView (PaymentModal + RetailProductsModal).
 * Mandate 8b: <= 120 lines.
 */
export const CashboxModalsContainer: React.FC<CashboxModalsContainerProps> = ({ ctrl, props }) => {
	return (
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
};