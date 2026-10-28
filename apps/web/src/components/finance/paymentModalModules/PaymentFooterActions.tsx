/**
 * apps/web/src/components/finance/paymentModalModules/PaymentFooterActions.tsx
 *
 * Layer 4: Sticky Bottom Actions Bar & Primary Tender Submit Triggers Facade.
 * Natural Thumb Zone ergonomics on Mobile, dense cockpit on Desktop.
 * Governed by Mandates 8b (<=120 lines), 8d, 8e, 8n.
 */

import React from "react";
import type { PaymentFooterActionsProps } from "./types.js";
import { PaymentFooterSubmitButtons } from "./PaymentFooterSubmitButtons.js";

export const PaymentFooterActions: React.FC<PaymentFooterActionsProps> = (props) => {
	const { totalDueRub, discountRub, onClose } = props;

	const formatMoney = (rub: number) =>
		(Number.isFinite(rub) ? (Object.is(rub, -0) ? 0 : rub) : 0).toLocaleString("ru-RU", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});

	return (
		<div
			className="mobile-sticky-checkout-bar p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:px-4 sm:pb-3 border-t border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0 select-none shadow-md"
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
				{/* Secondary Action: Defer / Cancel */}
				<button
					type="button"
					onClick={onClose}
					className="payment-footer-cancel-btn min-h-[44px] md:min-h-[36px] md:h-9 px-3.5 rounded-xl hidden sm:inline-flex items-center justify-center cursor-pointer border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:bg-[var(--line,#cbd5e1)] transition-colors"
					data-testid="btn-payment-defer"
					title="Отложить оформление чека без отмены визита"
				>
					Отложить
				</button>
				<button
					type="button"
					onClick={onClose}
					className="payment-footer-cancel-btn min-h-[44px] md:min-h-[36px] md:h-9 px-4 rounded-xl hidden sm:inline-flex items-center justify-center cursor-pointer border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:bg-[var(--line,#cbd5e1)] transition-colors"
				>
					Отмена
				</button>

				{/* Primary Submit Triggers */}
				<PaymentFooterSubmitButtons {...props} />
			</div>
		</div>
	);
};
