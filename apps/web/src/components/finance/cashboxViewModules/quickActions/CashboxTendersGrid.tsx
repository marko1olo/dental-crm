import React from "react";
import { Banknote, CreditCard, QrCode, CheckCircle2, Layers, Receipt } from "lucide-react";
import type { PaymentMethodTab } from "../../PaymentModal.js";
import type { TenderAllocationTarget, CheckoutResult } from "../types.js";

export interface CashboxTendersGridProps {
	readonly checkoutResult: CheckoutResult;
	readonly isSubmittingZeroReceipt: boolean;
	readonly onProcessZeroDiscountCheckout: () => Promise<void>;
	readonly onAllocateAll: (target: TenderAllocationTarget) => void;
	readonly onOpenPaymentWithMethod: (method: PaymentMethodTab) => void;
}

export function CashboxTendersGrid({
	checkoutResult, isSubmittingZeroReceipt, onProcessZeroDiscountCheckout, onAllocateAll, onOpenPaymentWithMethod,
}: CashboxTendersGridProps): React.JSX.Element {
	return (
		<div className="bg-[var(--paper-soft,#f8fafc)] border border-[var(--line)] rounded-xl p-3 sm:p-4">
			<div className="flex flex-col sm:flex-row items-center justify-between gap-1 mb-3 text-center sm:text-left select-none">
				<span className="text-xs text-[var(--muted)] font-semibold uppercase tracking-wider">Итого к оплате:</span>
				<span className="text-[32px] sm:text-2xl font-black font-mono text-[var(--ink)] tracking-tight leading-none">
					{checkoutResult.totalNetRub.toLocaleString("ru-RU")} ₽
				</span>
			</div>

			{checkoutResult.isZeroDue && (
				<div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-[var(--ok-bg,rgba(16,185,129,0.1))] border border-[var(--ok-fg,rgba(16,185,129,0.2))] mb-3">
					<div className="text-xs text-[var(--ok-fg,#10b981)] font-medium text-center sm:text-left">{checkoutResult.statusBannerText}</div>
					<button type="button" onClick={onProcessZeroDiscountCheckout} disabled={isSubmittingZeroReceipt} className="primary-button min-h-[44px] h-10 px-4 rounded-xl border border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)] text-white inline-flex items-center justify-center gap-1.5 font-bold text-xs cursor-pointer w-full sm:w-auto">
						<CheckCircle2 className="w-4 h-4 shrink-0" />
						<span>{isSubmittingZeroReceipt ? "Оформление..." : "Оформить чек 0 ₽"}</span>
					</button>
				</div>
			)}

			<div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
				{!checkoutResult.isZeroDue ? (
					<>
						<button type="button" className="primary-button col-span-2 sm:col-span-1 min-h-[44px] sm:min-h-[36px] sm:h-10 px-4 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-hover,#0f766e)] text-white inline-flex items-center justify-center gap-2 font-bold text-xs cursor-pointer shadow-xs transition-colors active:scale-[0.98] dente-btn-primary" onClick={() => onOpenPaymentWithMethod("card_terminal")} data-testid="btn-open-fast-checkout-modal" title="Оплатить и выбить кассовый чек">
							<Receipt className="w-4 h-4 shrink-0" /><span>Оплатить и пробить чек</span>
						</button>
						<button type="button" className="secondary-button min-h-[44px] sm:min-h-[36px] sm:h-10 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] inline-flex items-center justify-center gap-2 font-semibold text-xs cursor-pointer transition-colors active:scale-[0.98]" onClick={() => { onAllocateAll("card"); onOpenPaymentWithMethod("card_terminal"); }}>
							<CreditCard className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0" /><span>Всё картой</span>
						</button>
						<button type="button" className="secondary-button min-h-[44px] sm:min-h-[36px] sm:h-10 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] inline-flex items-center justify-center gap-2 font-semibold text-xs cursor-pointer transition-colors active:scale-[0.98]" onClick={() => { onAllocateAll("cash"); onOpenPaymentWithMethod("cash"); }}>
							<Banknote className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0" /><span>Всё наличными</span>
						</button>
						<button type="button" className="secondary-button min-h-[44px] sm:min-h-[36px] sm:h-10 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] inline-flex items-center justify-center gap-2 font-semibold text-xs cursor-pointer transition-colors active:scale-[0.98]" onClick={() => { onAllocateAll("sbp"); onOpenPaymentWithMethod("sbp_qr"); }}>
							<QrCode className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0" /><span>Всё по СБП</span>
						</button>
					</>
				) : (
					<button type="button" className="secondary-button col-span-2 sm:col-span-4 min-h-[44px] sm:min-h-[36px] sm:h-10 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] inline-flex items-center justify-center gap-2 font-semibold text-xs cursor-pointer transition-colors active:scale-[0.98]" onClick={() => onOpenPaymentWithMethod("card_terminal")} data-testid="btn-open-fast-checkout-modal">
						<Receipt className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0" /><span>Оплатить и пробить чек 0 ₽</span>
					</button>
				)}

				<button type="button" className="secondary-button col-span-2 sm:col-span-4 min-h-[44px] sm:min-h-[36px] sm:h-10 px-3 rounded-xl border border-dashed border-[var(--line)] hover:border-[var(--teal,#0d9488)] bg-[var(--paper)] text-[var(--ink)] inline-flex items-center justify-center gap-2 font-semibold text-xs cursor-pointer transition-colors active:scale-[0.98]" onClick={() => onOpenPaymentWithMethod("split")} data-testid="btn-open-split-modal" title="Комбинированная смешанная оплата (несколько способов: нал + карта + СБП + депозит)">
					<Layers className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0" /><span>Смешанная оплата (сплит)</span>
					<span data-testid="btn-open-payment-modal" className="sr-only" aria-hidden="true" />
				</button>
			</div>

			<div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 bg-[var(--paper)]/95 backdrop-blur-md border-t border-[var(--line)] z-40 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-lg">
				<button type="button" className="w-full min-h-[52px] h-[52px] rounded-xl bg-[var(--teal,#0d9488)] text-white font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-[0.99] transition-all dente-btn-primary" onClick={() => { if (checkoutResult.isZeroDue) { onProcessZeroDiscountCheckout(); } else { onOpenPaymentWithMethod("card_terminal"); } }} data-testid="mobile-primary-checkout-cta">
					<Receipt className="w-5 h-5 shrink-0" />
					<span>{checkoutResult.isZeroDue ? "Оформить чек 0 ₽" : "Оплатить и пробить чек"}</span>
				</button>
			</div>
		</div>
	);
}
