import React from "react";
import { Coins, CreditCard, QrCode, Wallet } from "lucide-react";
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
		<div className="space-y-3">
			<div>
				<label className="block text-xs font-bold text-[var(--muted,#64748b)] mb-1.5">
					2. Причина возврата:
				</label>
				<select
					value={reasonCategory}
					onChange={(e) => setReasonCategory(e.target.value as RefundReasonCategory)}
					className="w-full h-9 max-md:h-11 max-md:min-h-[44px] px-3 rounded-xl border border-[var(--border,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-medium text-[var(--ink,#0f172a)] focus:ring-2 focus:ring-amber-500 outline-none"
				>
					{Object.entries(REFUND_REASON_LABELS).map(([cat, label]) => (
						<option key={cat} value={cat}>
							{label}
						</option>
					))}
				</select>
			</div>

			<div>
				<label className="block text-xs font-bold text-[var(--muted,#64748b)] mb-1.5">
					3. Способ возврата средств:
				</label>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
					<button
						type="button"
						onClick={() => setPaymentMethod("card")}
						className={`h-9 max-md:h-11 max-md:min-h-[44px] px-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
							paymentMethod === "card"
								? "bg-[var(--primary)]/15 border-[var(--primary)] text-[var(--primary)]"
								: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink-muted)]"
						}`}
					>
						<CreditCard className="w-3.5 h-3.5 shrink-0" />
						<span>Карта</span>
					</button>
					<button
						type="button"
						onClick={() => setPaymentMethod("sbp")}
						className={`h-9 max-md:h-11 max-md:min-h-[44px] px-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
							paymentMethod === "sbp"
								? "bg-[var(--primary)]/15 border-[var(--primary)] text-[var(--primary)]"
								: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink-muted)]"
						}`}
					>
						<QrCode className="w-3.5 h-3.5 shrink-0" />
						<span>СБП</span>
					</button>
					<button
						type="button"
						onClick={() => setPaymentMethod("cash")}
						className={`h-9 max-md:h-11 max-md:min-h-[44px] px-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
							paymentMethod === "cash"
								? "bg-[var(--primary)]/15 border-[var(--primary)] text-[var(--primary)]"
								: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink-muted)]"
						}`}
					>
						<Coins className="w-3.5 h-3.5 shrink-0" />
						<span>Нал</span>
					</button>
					<button
						type="button"
						onClick={() => setPaymentMethod("advance_deposit")}
						className={`h-9 max-md:h-11 max-md:min-h-[44px] px-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
							paymentMethod === "advance_deposit"
								? "bg-[var(--primary)]/15 border-[var(--primary)] text-[var(--primary)]"
								: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink-muted)]"
						}`}
					>
						<Wallet className="w-3.5 h-3.5 shrink-0" />
						<span>Аванс</span>
					</button>
				</div>
			</div>
		</div>
	);
};
