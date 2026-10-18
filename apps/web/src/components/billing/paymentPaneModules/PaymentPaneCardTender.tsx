/**
 * apps/web/src/components/billing/paymentPaneModules/PaymentPaneCardTender.tsx
 *
 * POS Terminal Pane (Acquiring 54-FZ).
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { CreditCard, CheckCircle2 } from "lucide-react";
import { showToast } from "../../GlobalToast.js";

interface PaymentPaneCardTenderProps {
	readonly amountRub: number;
	readonly isSubmitting: boolean;
	readonly finalizeReceipt: (method: any, sum: number) => Promise<void>;
}

export const PaymentPaneCardTender: React.FC<PaymentPaneCardTenderProps> = ({
	amountRub,
	isSubmitting,
	finalizeReceipt,
}) => {
	const handleConfirm = () => {
		showToast(`Оплата картой на ${amountRub.toLocaleString("ru-RU")} ₽ зафиксирована`, "success");
		finalizeReceipt("card", amountRub);
	};

	return (
		<div
			className="p-4 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] space-y-3 shadow-xs"
			data-testid="pane-tender-card"
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<CreditCard size={18} className="text-blue-600" />
					<span className="text-xs font-bold text-[var(--ink,#0f172a)]">
						Банковский терминал (Эквайринг 54-ФЗ)
					</span>
				</div>
				<span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
					Безналичный расчет
				</span>
			</div>
			<p className="text-xs text-[var(--muted,#64748b)] m-0">
				Пациент прикладывает карту или телефон к POS-терминалу на стойке.
			</p>
			<button
				type="button"
				onClick={handleConfirm}
				className="w-full min-h-[44px] sm:min-h-[36px] sm:h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
				data-testid="btn-confirm-card-pos"
			>
				<CheckCircle2 size={16} />
				<span>{isSubmitting ? "Проведение..." : `Карта одобрена банком (${amountRub.toLocaleString("ru-RU")} ₽)`}</span>
			</button>
		</div>
	);
};
