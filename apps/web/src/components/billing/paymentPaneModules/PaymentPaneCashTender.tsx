/**
 * apps/web/src/components/billing/paymentPaneModules/PaymentPaneCashTender.tsx
 *
 * Cash tender with quick bill addition chips (2-cols on mobile, 5-cols on desktop),
 * automatic change calculation, and zero disabled submit button.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { Banknote, CheckCircle2 } from "lucide-react";
import { showToast } from "../../GlobalToast.js";

interface PaymentPaneCashTenderProps {
	readonly amountRub: number;
	readonly cashTenderedRub: number;
	readonly setCashTenderedRub: (val: number | ((prev: number) => number)) => void;
	readonly cashChangeRub: number;
	readonly isCashShortage: boolean;
	readonly isSubmitting: boolean;
	readonly finalizeReceipt: (method: any, sum: number, options?: { readonly idempotencyKey?: string | undefined }) => Promise<unknown>;
}

export const PaymentPaneCashTender: React.FC<PaymentPaneCashTenderProps> = ({
	amountRub,
	cashTenderedRub,
	setCashTenderedRub,
	cashChangeRub,
	isCashShortage,
	isSubmitting,
	finalizeReceipt,
}) => {
	const handleCashSubmit = () => {
		if (isCashShortage) {
			setCashTenderedRub(amountRub);
			showToast(`Внесено ровно ${amountRub.toLocaleString("ru-RU")} ₽ без сдачи`, "info");
		}
		// Честный контур: тост успеха приходит только после подтверждения сервера внутри finalizeReceipt.
		void finalizeReceipt("cash", amountRub);
	};

	return (
		<div
			className="p-4 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] space-y-3 shadow-xs"
			data-testid="pane-tender-cash"
		>
			<div className="flex items-center justify-between">
				<span className="text-xs font-bold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
					<Banknote size={16} className="text-emerald-600" />
					<span>Внесено наличными:</span>
				</span>
				<button
					type="button"
					onClick={() => setCashTenderedRub(amountRub)}
					className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
					data-testid="btn-cash-exact-match"
				>
					Без сдачи ({amountRub.toLocaleString("ru-RU")} ₽)
				</button>
			</div>

			<div className="flex items-center gap-2">
				<input
					type="number"
					value={cashTenderedRub || ""}
					onChange={(e) => setCashTenderedRub(Math.max(0, parseFloat(e.target.value) || 0))}
					className="flex-1 h-10 px-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] font-mono font-bold text-base text-[var(--ink,#0f172a)] focus:outline-none focus:border-teal-500"
					placeholder="Сумма купюр"
					data-testid="input-cash-tendered-amount"
				/>
				<span className="font-bold text-sm text-[var(--ink,#0f172a)]">₽</span>
			</div>

			{/* Fast Bill Addition Chips: 2 cols on mobile, 5 cols on desktop */}
			<div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
				{[500, 1000, 2000, 5000, 10000].map((bill) => (
					<button
						key={bill}
						type="button"
						onClick={() => setCashTenderedRub((prev: number) => (Number.isFinite(prev) ? prev : 0) + bill)}
						className="h-8 px-2 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-xs font-mono font-bold text-[var(--ink,#0f172a)] hover:border-emerald-500 cursor-pointer shadow-2xs active:scale-95 transition-all text-center"
						data-testid={`btn-bill-${bill}`}
					>
						+{bill.toLocaleString("ru-RU")} ₽
					</button>
				))}
			</div>

			<div className="pt-2 border-t border-[var(--line,#cbd5e1)] flex items-center justify-between text-xs">
				<span className="text-[var(--muted,#64748b)]">Сдача пациенту:</span>
				<span
					className={`font-mono font-extrabold text-sm ${
						isCashShortage ? "text-amber-600 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-300"
					}`}
					data-testid="display-cashier-change"
				>
					{isCashShortage
						? `Не хватает ${(amountRub - cashTenderedRub).toLocaleString("ru-RU")} ₽`
						: `${cashChangeRub.toLocaleString("ru-RU")} ₽`}
				</span>
			</div>

			<button
				type="button"
				onClick={handleCashSubmit}
				className="w-full min-h-[44px] sm:min-h-[36px] sm:h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
				data-testid="btn-confirm-cash-tender"
			>
				<CheckCircle2 size={16} />
				<span>{isSubmitting ? "Проведение..." : `Принять наличные (${amountRub.toLocaleString("ru-RU")} ₽)`}</span>
			</button>
		</div>
	);
};
