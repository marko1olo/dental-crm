import React from "react";
import { Coins, CreditCard, Wallet } from "lucide-react";
import { REFUND_REASON_LABELS, type RefundReasonCategory } from "@dental/shared";
import type { RefundPaymentMethod } from "./types";

export interface RefundPaymentMethodSelectorProps {
	readonly reasonCategory: RefundReasonCategory;
	readonly setReasonCategory: (category: RefundReasonCategory) => void;
	readonly paymentMethod: RefundPaymentMethod;
	readonly setPaymentMethod: (method: RefundPaymentMethod) => void;
}

export const RefundPaymentMethodSelector: React.FC<RefundPaymentMethodSelectorProps> = ({
	reasonCategory,
	setReasonCategory,
	paymentMethod,
	setPaymentMethod,
}) => {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
			<div>
				<label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] mb-1.5">
					2. Причина возврата:
				</label>
				<select
					value={reasonCategory}
					onChange={(e) => setReasonCategory(e.target.value as RefundReasonCategory)}
					className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--border,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-medium text-[var(--ink,#0f172a)] focus:ring-2 focus:ring-amber-500 outline-none"
				>
					{Object.entries(REFUND_REASON_LABELS).map(([cat, label]) => (
						<option key={cat} value={cat}>
							{label}
						</option>
					))}
				</select>
			</div>

			<div>
				<label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] mb-1.5">
					3. Способ возврата средств:
				</label>
				<div className="grid grid-cols-3 gap-1.5">
					<button
						type="button"
						onClick={() => setPaymentMethod("card")}
						className={`min-h-[44px] px-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
							paymentMethod === "card"
								? "bg-teal-500/15 border-teal-500 text-teal-700 dark:text-teal-300"
								: "border-[var(--border,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)]"
						}`}
					>
						<CreditCard className="w-3.5 h-3.5" />
						<span>Карта</span>
					</button>
					<button
						type="button"
						onClick={() => setPaymentMethod("cash")}
						className={`min-h-[44px] px-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
							paymentMethod === "cash"
								? "bg-teal-500/15 border-teal-500 text-teal-700 dark:text-teal-300"
								: "border-[var(--border,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)]"
						}`}
					>
						<Coins className="w-3.5 h-3.5" />
						<span>Нал</span>
					</button>
					<button
						type="button"
						onClick={() => setPaymentMethod("advance_deposit")}
						className={`min-h-[44px] px-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
							paymentMethod === "advance_deposit"
								? "bg-teal-500/15 border-teal-500 text-teal-700 dark:text-teal-300"
								: "border-[var(--border,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)]"
						}`}
					>
						<Wallet className="w-3.5 h-3.5" />
						<span>Аванс</span>
					</button>
				</div>
			</div>
		</div>
	);
};
