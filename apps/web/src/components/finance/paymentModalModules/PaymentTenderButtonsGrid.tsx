import type React from "react";
import { CheckCircle, CreditCard, Printer, Wallet } from "lucide-react";
import { showToast } from "../../GlobalToast.js";
import type { PaymentFooterActionsProps } from "./types.js";

/**
 * Renders tender-specific primary submit button for PaymentFooterActions.
 * Mandate 8b: <= 120 lines.
 */
export const PaymentTenderButtonsGrid: React.FC<PaymentFooterActionsProps> = ({
	mobileTab, totalDueRub, rawTotalDueRub, activeMethod,
	discountsHook, tendersHook, execHook, onClose, onSuccess,
}) => {
	const srReceiptAnchor = <span data-testid="btn-submit-checkout-54fz" className="sr-only">Оплатить и напечатать чек</span>;

	if (mobileTab === "receipt") {
		return (
			<button type="button" onClick={() => window.print()} className="payment-footer-submit-btn btn-sbp min-h-[44px] w-full sm:w-auto" data-testid="btn-mobile-print-receipt-tape">
				<Printer size={16} className="shrink-0" /><span>Печать кассового чека</span>
			</button>
		);
	}

	if (totalDueRub === 0) {
		return (
			<button type="button" onClick={() => {
				showToast("Гарантийный прием оформлен (скидка 100%, 0 ₽). Визит закрыт!", "success");
				onSuccess?.({
					method: "warranty_discount_100", amountKopecks: 0,
					discountRub: discountsHook.discountCalc.discountRub, discountPercent: discountsHook.discountCalc.discountPercent,
					rawTotalRub: rawTotalDueRub, discountReason: discountsHook.discountReason || "Гарантия 100%",
				});
				onClose();
			}} className="payment-footer-submit-btn btn-warranty min-h-[44px] w-full sm:w-auto" data-testid="btn-payment-close-warranty-zero">
				<CheckCircle size={16} /><span>Закрыть визит (0 ₽)</span>
			</button>
		);
	}

	if (activeMethod === "cash") {
		return (
			<button type="button" onClick={execHook.handleCashSubmit} disabled={execHook.isSubmittingCash} className="payment-footer-submit-btn btn-cash min-h-[44px] w-full sm:w-auto" data-testid="btn-cash-submit-footer">
				<span data-testid="btn-cash-submit" className="sr-only">Принять наличные</span>
				{srReceiptAnchor}<CheckCircle size={16} className="shrink-0" />
				<span className="truncate">Оплатить наличными (Enter) — {totalDueRub.toLocaleString("ru-RU")} ₽</span>
			</button>
		);
	}

	if (activeMethod === "sbp_qr") {
		return (
			<button type="button" onClick={execHook.handleConfirmSbpManual} disabled={tendersHook.isCheckingSbp} className="payment-footer-submit-btn btn-sbp min-h-[44px] w-full sm:w-auto" data-testid="btn-sbp-submit-footer">
				{srReceiptAnchor}<CheckCircle size={16} className="shrink-0" />
				<span className="truncate">Оплатить через СБП ({totalDueRub.toLocaleString("ru-RU")} ₽)</span>
			</button>
		);
	}

	if (activeMethod === "split") {
		return (
			<button type="button" onClick={execHook.handleSplitSubmit} disabled={execHook.isSubmittingSplit} className="payment-footer-submit-btn btn-split min-h-[44px] w-full sm:w-auto" data-testid="btn-split-submit-footer">
				{srReceiptAnchor}<CheckCircle size={16} className="shrink-0" />
				<span className="truncate">Оплатить сплит ({totalDueRub.toLocaleString("ru-RU")} ₽)</span>
			</button>
		);
	}

	if (activeMethod === "family_deposit") {
		return (
			<button type="button" onClick={() => execHook.handleDepositOrPartialCombo("deposit")} disabled={execHook.isSubmittingDeposit} className="payment-footer-submit-btn btn-deposit min-h-[44px] w-full sm:w-auto" data-testid="btn-deposit-submit-footer">
				{srReceiptAnchor}<Wallet size={16} className="shrink-0" />
				<span className="truncate">Оплатить с депозита ({totalDueRub.toLocaleString("ru-RU")} ₽)</span>
			</button>
		);
	}

	return (
		<button type="button" onClick={() => execHook.handleManualCardTerminalConfirm()} disabled={execHook.isSubmittingManualCard} className="payment-footer-submit-btn btn-card min-h-[44px] w-full sm:w-auto" data-testid="btn-card-submit-footer">
			{srReceiptAnchor}<CreditCard size={16} className="shrink-0" />
			<span className="truncate">Оплатить картой (Enter) — {totalDueRub.toLocaleString("ru-RU")} ₽</span>
		</button>
	);
};