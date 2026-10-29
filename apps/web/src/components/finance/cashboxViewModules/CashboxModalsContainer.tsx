import type React from "react";
import { RetailProductsModal } from "../../billing/RetailProductsModal.js";
import { showToast } from "../../GlobalToast.js";
import { CashRegisterCheckoutModal } from "../../billing/CashRegisterCheckoutModal.js";
import { rubToKopecks } from "@dental/shared";
import type { CashboxControllerReturn, CashboxViewProps } from "./types.js";

export interface CashboxModalsContainerProps {
	readonly ctrl: CashboxControllerReturn;
	readonly props: CashboxViewProps;
}

/**
 * Modals container for CashRegisterView (CashRegisterCheckoutModal + RetailProductsModal).
 * Mandate 8b: <= 120 lines. Mandate 8e, 8n, 8am, 8wy SSOT.
 */
export const CashboxModalsContainer: React.FC<CashboxModalsContainerProps> = ({ ctrl, props }) => {
	const totalNetRub = ctrl.checkoutResult?.totalNetRub ?? ctrl.grossAmountRub ?? 0;
	return (
		<>
			{ctrl.isPaymentModalOpen && (
				<CashRegisterCheckoutModal
					isOpen={ctrl.isPaymentModalOpen}
					totalDueRub={totalNetRub}
					amountRub={totalNetRub}
					amountKopecks={rubToKopecks(totalNetRub)}
					patientId={ctrl.selectedInvoice?.patientId || props.patientId}
					patientName={ctrl.selectedInvoice?.patientName || props.patientName || "Пациент"}
					patientPhone={ctrl.selectedInvoice?.patientPhone || props.patientPhone}
					patientDepositRub={ctrl.effectiveDepositRub}
					patientFamilyBalanceRub={ctrl.effectiveFamilyBalanceRub}
					visitId={ctrl.selectedInvoice?.visitId || props.visitId}
					invoiceId={ctrl.selectedInvoice?.id || props.invoiceId}
					orderId={ctrl.selectedInvoice?.id || props.invoiceId}
					cashierFullName={props.cashierName || "Администратор / Кассир"}
					clinicLegalName={props.clinicName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"}
					defaultMethod={
						ctrl.activePaymentMethod === "cash"
							? "cash"
							: ctrl.activePaymentMethod === "sbp_qr"
								? "sbp"
								: ctrl.activePaymentMethod === "deposit"
									? "deposit"
									: ctrl.activePaymentMethod === "split"
										? "split"
										: "card"
					}
					onClose={() => { ctrl.setIsPaymentModalOpen(false); ctrl.setSelectedInvoice(null); }}
					onSuccess={(receipt) => {
						ctrl.setIsPaymentModalOpen(false);
						ctrl.handleInvoicePaymentSuccess(receipt);
						props.onPaymentComplete?.(receipt as any);
					}}
					onPaymentComplete={(receipt) => {
						ctrl.setIsPaymentModalOpen(false);
						ctrl.handleInvoicePaymentSuccess(receipt);
						props.onPaymentComplete?.(receipt as any);
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