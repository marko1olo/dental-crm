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
	const formattedDue = totalDueRub.toLocaleString("ru-RU");

	if (mobileTab === "receipt") {
		return (
			<button type="button" onClick={() => window.print()} className="payment-footer-submit-btn btn-sbp min-h-[44px] md:min-h-[36px] md:h-9 px-4 rounded-xl w-full sm:w-auto" data-testid="btn-mobile-print-receipt-tape">
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
			}} className="payment-footer-submit-btn btn-warranty min-h-[44px] md:min-h-[36px] md:h-9 px-4 rounded-xl w-full sm:w-auto" data-testid="btn-payment-close-warranty-zero">
				<CheckCircle size={16} /><span>Закрыть визит: Гарантия 100% (0 ₽)</span>
			</button>
		);
	}

	if (activeMethod === "cash") {
		return (
			<button type="button" onClick={execHook.handleCashSubmit} disabled={execHook.isSubmittingCash} title="Принять оплату и выбить чек (Enter)" className="payment-footer-submit-btn btn-cash min-h-[44px] md:min-h-[36px] md:h-9 px-5 rounded-xl w-full sm:w-auto" data-testid="btn-cash-submit-footer">
				<span data-testid="btn-cash-submit" className="sr-only">Принять наличные</span>
				{srReceiptAnchor}<CheckCircle size={16} className="shrink-0" />
				<span className="sr-only">Оплатить наличными — {formattedDue} ₽</span>
				<span className="hidden sm:inline">Принять оплату и выбить чек — {formattedDue} ₽</span>
				<span className="sm:hidden">Выбить чек — {formattedDue} ₽</span>
			</button>
		);
	}

	if (activeMethod === "sbp_qr") {
		return (
			<button type="button" onClick={execHook.handleConfirmSbpManual} disabled={tendersHook.isCheckingSbp} title="Принять оплату и выбить чек через СБП" className="payment-footer-submit-btn btn-sbp min-h-[44px] md:min-h-[36px] md:h-9 px-5 rounded-xl w-full sm:w-auto" data-testid="btn-sbp-submit-footer">
				{srReceiptAnchor}<CheckCircle size={16} className="shrink-0" />
				<span className="sr-only">Оплатить через СБП ({formattedDue} ₽)</span>
				<span className="hidden sm:inline">Принять оплату и выбить чек — {formattedDue} ₽ (СБП)</span>
				<span className="sm:hidden">Выбить чек — {formattedDue} ₽ (СБП)</span>
			</button>
		);
	}

	if (activeMethod === "split") {
		return (
			<button type="button" onClick={execHook.handleSplitSubmit} disabled={execHook.isSubmittingSplit} title="Принять оплату и выбить чек (сплит)" className="payment-footer-submit-btn btn-split min-h-[44px] md:min-h-[36px] md:h-9 px-5 rounded-xl w-full sm:w-auto" data-testid="btn-split-submit-footer">
				{srReceiptAnchor}<CheckCircle size={16} className="shrink-0" />
				<span className="sr-only">Оплатить сплит ({formattedDue} ₽)</span>
				<span className="hidden sm:inline">Принять оплату и выбить чек — {formattedDue} ₽ (сплит)</span>
				<span className="sm:hidden">Выбить чек — {formattedDue} ₽ (сплит)</span>
			</button>
		);
	}

	if (activeMethod === "family_deposit") {
		return (
			<button type="button" onClick={() => execHook.handleDepositOrPartialCombo("deposit")} disabled={execHook.isSubmittingDeposit} title="Принять оплату и выбить чек (аванс)" className="payment-footer-submit-btn btn-deposit min-h-[44px] md:min-h-[36px] md:h-9 px-5 rounded-xl w-full sm:w-auto" data-testid="btn-deposit-submit-footer">
				{srReceiptAnchor}<Wallet size={16} className="shrink-0" />
				<span className="sr-only">Оплатить с депозита ({formattedDue} ₽)</span>
				<span className="hidden sm:inline">Принять оплату и выбить чек — {formattedDue} ₽ (аванс)</span>
				<span className="sm:hidden">Выбить чек — {formattedDue} ₽ (аванс)</span>
			</button>
		);
	}

	return (
		<button type="button" onClick={() => execHook.handleManualCardTerminalConfirm()} disabled={execHook.isSubmittingManualCard} title="Принять оплату и выбить чек (Enter)" className="payment-footer-submit-btn btn-card min-h-[44px] md:min-h-[36px] md:h-9 px-5 rounded-xl w-full sm:w-auto" data-testid="btn-card-submit-footer">
			{srReceiptAnchor}<CreditCard size={16} className="shrink-0" />
			<span className="sr-only">Оплатить картой — {formattedDue} ₽</span>
			<span className="hidden sm:inline">Принять оплату и выбить чек — {formattedDue} ₽</span>
			<span className="sm:hidden">Выбить чек — {formattedDue} ₽</span>
		</button>
	);
};