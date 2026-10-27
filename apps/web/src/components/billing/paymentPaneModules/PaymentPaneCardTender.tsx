/**
 * apps/web/src/components/billing/paymentPaneModules/PaymentPaneCardTender.tsx
 *
 * POS Terminal Pane (Acquiring 54-FZ).
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { CreditCard, CheckCircle2 } from "lucide-react";

interface PaymentPaneCardTenderProps {
	readonly amountRub: number;
	readonly isSubmitting: boolean;
	readonly finalizeReceipt: (method: any, sum: number, options?: { readonly idempotencyKey?: string | undefined }) => Promise<unknown>;
}

export const PaymentPaneCardTender: React.FC<PaymentPaneCardTenderProps> = ({
	amountRub,
	isSubmitting,
	finalizeReceipt,
}) => {
	const handleConfirm = () => {
		void finalizeReceipt("card", amountRub);
	};

	return (
		<div
			className="p-4 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] space-y-3 shadow-xs"
			data-testid="pane-tender-card"
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<CreditCard size={16} className="text-[var(--teal,#0d9488)]" />
					<span className="text-xs font-bold text-[var(--ink,#0f172a)]">
						Банковский терминал (Эквайринг)
					</span>
				</div>
				<span className="text-xs font-mono font-semibold text-[var(--muted,#64748b)]">
					Безналичный расчет
				</span>
			</div>
			<p className="text-xs text-[var(--muted,#64748b)] m-0">
				Пациент прикладывает карту или телефон к POS-терминалу на стойке.
			</p>
			<button
				type="button"
				onClick={handleConfirm}
				className="w-full min-h-[44px] sm:min-h-[36px] sm:h-9 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-strong,#0f766e)] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
				data-testid="btn-confirm-card-pos"
			>
				<CheckCircle2 size={16} />
				<span>{isSubmitting ? "Проведение..." : `Принять оплату — ${amountRub.toLocaleString("ru-RU")} ₽`}</span>
			</button>
		</div>
	);
};
