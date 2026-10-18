/**
 * apps/web/src/components/billing/paymentPaneModules/PaymentPaneMethodSwitcher.tsx
 *
 * Unified 36px Segmented Method Switcher conforming to UI_STANDARDS.md.
 * Radius 12px, zero accordion clutter.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { QrCode, CreditCard, Banknote, Wallet, Layers } from "lucide-react";
import type { CashierPaymentMethod } from "./types.js";

interface PaymentPaneMethodSwitcherProps {
	readonly activeMethod: CashierPaymentMethod;
	readonly setActiveMethod: (method: CashierPaymentMethod) => void;
}

export const PaymentPaneMethodSwitcher: React.FC<PaymentPaneMethodSwitcherProps> = ({
	activeMethod,
	setActiveMethod,
}) => {
	const methods: { id: CashierPaymentMethod; label: string; icon: any; color: string; testId: string }[] = [
		{ id: "sbp", label: "СБП", icon: QrCode, color: "teal", testId: "btn-method-tab-sbp" },
		{ id: "card", label: "Карта", icon: CreditCard, color: "blue", testId: "btn-method-tab-card" },
		{ id: "cash", label: "Нал", icon: Banknote, color: "emerald", testId: "btn-method-tab-cash" },
		{ id: "deposit", label: "Депозит", icon: Wallet, color: "indigo", testId: "btn-method-tab-deposit" },
		{ id: "split", label: "Сплит", icon: Layers, color: "purple", testId: "btn-method-tab-split" },
	];

	return (
		<div className="space-y-1.5">
			<label className="text-[11px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider block">
				Способ оплаты
			</label>
			<div
				className="flex items-center gap-1 p-1 rounded-xl bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#cbd5e1)] select-none overflow-x-auto scrollbar-none"
				role="tablist"
				data-testid="cashier-method-switcher"
			>
				{methods.map(({ id, label, icon: Icon, color, testId }) => {
					const isActive = activeMethod === id;
					return (
						<button
							key={id}
							type="button"
							role="tab"
							aria-selected={isActive}
							onClick={() => setActiveMethod(id)}
							className={`flex-1 min-w-[58px] sm:min-w-0 h-9 px-1.5 sm:px-2 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
								isActive
									? "bg-[var(--paper,#ffffff)] text-teal-700 dark:text-teal-300 shadow-xs border border-teal-500/30 ring-1 ring-teal-500/20"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
							data-testid={testId}
						>
							<Icon size={14} className={`text-${color}-600 shrink-0`} />
							<span>{label}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
};
