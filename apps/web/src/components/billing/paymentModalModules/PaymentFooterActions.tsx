/**
 * apps/web/src/components/billing/paymentModalModules/PaymentFooterActions.tsx
 *
 * Layer 4: Sticky Bottom Actions Bar & 54-FZ Primary Tender Submit Triggers.
 * Natural Thumb Zone ergonomics on Mobile, dense cockpit on Desktop.
 * Governed by Mandates 8d, 8e, 8n.
 */

import React from "react";
import {
	CheckCircle,
	CreditCard,
	Printer,
	Wallet,
} from "lucide-react";
import { showToast } from "../../GlobalToast.js";
import type { PaymentFooterActionsProps } from "./types.js";

export const PaymentFooterActions: React.FC<PaymentFooterActionsProps> = ({
	mobileTab,
	totalDueRub,
	discountRub,
	rawTotalDueRub,
	activeMethod,
	discountsHook,
	tendersHook,
	execHook,
	onClose,
	onSuccess,
}) => {
	const formatMoney = (rub: number) =>
		(Number.isFinite(rub) ? (Object.is(rub, -0) ? 0 : rub) : 0).toLocaleString("ru-RU", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});

	return (
		<div
			className="mobile-sticky-checkout-bar p-3 sm:px-4 border-t border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0 select-none shadow-md"
			data-testid="payment-modal-fixed-footer"
		>
			{/* Total due display on desktop */}
			<div className="hidden sm:flex items-center gap-2 min-w-0">
				<span className="text-xs text-[var(--muted,#64748b)]">К оплате:</span>
				<span className="font-mono text-base sm:text-lg font-black text-[var(--ink,#0f172a)] truncate" data-testid="payment-modal-footer-total">
					{formatMoney(totalDueRub)} ₽
				</span>
				{discountRub > 0 && (
					<span className="text-xs text-amber-600 dark:text-amber-400 font-bold truncate">
						(-{formatMoney(discountRub)} ₽)
					</span>
				)}
			</div>

			<div className="flex items-center gap-2 w-full sm:w-auto">
				{/* Secondary Action: Cancel */}
				<button
					type="button"
					onClick={onClose}
					className="payment-footer-cancel-btn min-h-[44px] hidden sm:inline-flex items-center justify-center"
				>
					Отмена
				</button>

				{/* Primary Action Button Based on Active Method or Mobile Tab */}
				{mobileTab === "receipt" ? (
					<button
						type="button"
						onClick={() => window.print()}
						className="payment-footer-submit-btn btn-sbp min-h-[44px] w-full sm:w-auto"
						data-testid="btn-mobile-print-receipt-tape"
					>
						<Printer size={16} className="shrink-0" />
						<span>Печать кассового чека</span>
					</button>
				) : totalDueRub === 0 ? (
					<button
						type="button"
						onClick={() => {
							showToast("Гарантийный прием оформлен (скидка 100%, 0 ₽). Визит закрыт!", "success");
							if (onSuccess) {
								onSuccess({
									method: "warranty_discount_100",
									amountKopecks: 0,
									discountRub: discountsHook.discountCalc.discountRub,
									discountPercent: discountsHook.discountCalc.discountPercent,
									rawTotalRub: rawTotalDueRub,
									discountReason: discountsHook.discountReason || "Гарантия 100%",
								});
							}
							onClose();
						}}
						className="payment-footer-submit-btn btn-warranty min-h-[44px] w-full sm:w-auto"
						data-testid="btn-payment-close-warranty-zero"
					>
						<CheckCircle size={16} />
						<span>Закрыть визит (0 ₽)</span>
					</button>
				) : activeMethod === "cash" ? (
					<button
						type="button"
						onClick={execHook.handleCashSubmit}
						disabled={execHook.isSubmittingCash}
						className="payment-footer-submit-btn btn-cash min-h-[44px] w-full sm:w-auto"
						data-testid="btn-cash-submit-footer"
					>
						<span data-testid="btn-cash-submit" className="sr-only">Принять наличные</span>
						<span data-testid="btn-submit-checkout-54fz" className="sr-only">Оплатить 54-ФЗ</span>
						<CheckCircle size={16} className="shrink-0" />
						<span className="truncate">Принять наличные ({totalDueRub.toLocaleString("ru-RU")} ₽)</span>
					</button>
				) : activeMethod === "sbp_qr" ? (
					<button
						type="button"
						onClick={execHook.handleConfirmSbpManual}
						disabled={tendersHook.isCheckingSbp}
						className="payment-footer-submit-btn btn-sbp min-h-[44px] w-full sm:w-auto"
						data-testid="btn-sbp-submit-footer"
					>
						<span data-testid="btn-submit-checkout-54fz" className="sr-only">Оплатить 54-ФЗ</span>
						<CheckCircle size={16} className="shrink-0" />
						<span className="truncate">Оплатить через СБП ({totalDueRub.toLocaleString("ru-RU")} ₽)</span>
					</button>
				) : activeMethod === "split" ? (
					<button
						type="button"
						onClick={execHook.handleSplitSubmit}
						disabled={execHook.isSubmittingSplit}
						className="payment-footer-submit-btn btn-split min-h-[44px] w-full sm:w-auto"
						data-testid="btn-split-submit-footer"
					>
						<span data-testid="btn-submit-checkout-54fz" className="sr-only">Оплатить 54-ФЗ</span>
						<CheckCircle size={16} className="shrink-0" />
						<span className="truncate">Оплатить сплит ({totalDueRub.toLocaleString("ru-RU")} ₽)</span>
					</button>
				) : activeMethod === "family_deposit" ? (
					<button
						type="button"
						onClick={() => execHook.handleDepositOrPartialCombo("deposit")}
						disabled={execHook.isSubmittingDeposit}
						className="payment-footer-submit-btn btn-deposit min-h-[44px] w-full sm:w-auto"
						data-testid="btn-deposit-submit-footer"
					>
						<span data-testid="btn-submit-checkout-54fz" className="sr-only">Оплатить 54-ФЗ</span>
						<Wallet size={16} className="shrink-0" />
						<span className="truncate">Оплатить с депозита ({totalDueRub.toLocaleString("ru-RU")} ₽)</span>
					</button>
				) : (
					<button
						type="button"
						onClick={() => execHook.handleManualCardTerminalConfirm()}
						disabled={execHook.isSubmittingManualCard}
						className="payment-footer-submit-btn btn-card min-h-[44px] w-full sm:w-auto"
						data-testid="btn-card-submit-footer"
					>
						<span data-testid="btn-submit-checkout-54fz" className="sr-only">Оплатить 54-ФЗ</span>
						<CreditCard size={16} className="shrink-0" />
						<span className="truncate">Оплатить картой ({totalDueRub.toLocaleString("ru-RU")} ₽)</span>
					</button>
				)}
			</div>
		</div>
	);
};
