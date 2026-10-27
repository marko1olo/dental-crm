/**
 * apps/web/src/components/billing/paymentPaneModules/PaymentPaneMethodSwitcher.tsx
 *
 * Unified 36px Segmented Method Switcher conforming to UI_STANDARDS.md.
 * Radius 8px, zero accordion clutter.
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
	const methods: { id: CashierPaymentMethod; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; testId: string }[] = [
		{ id: "sbp", label: "СБП QR", icon: QrCode, testId: "btn-method-tab-sbp" },
		{ id: "card", label: "Карта", icon: CreditCard, testId: "btn-method-tab-card" },
		{ id: "cash", label: "Наличные", icon: Banknote, testId: "btn-method-tab-cash" },
		{ id: "deposit", label: "Депозит", icon: Wallet, testId: "btn-method-tab-deposit" },
		{ id: "split", label: "Сплит", icon: Layers, testId: "btn-method-tab-split" },
	];

	return (
		<div className="space-y-1.5">
			<label className="text-[11px] font-bold text-[var(--muted,#64748b)] block">
				Способ оплаты
			</label>
			<div
				className="flex items-center gap-1 p-1 rounded-xl bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#cbd5e1)] select-none overflow-x-auto scrollbar-none"
				role="tablist"
				data-testid="cashier-method-switcher"
			>
				{methods.map(({ id, label, icon: Icon, testId }) => {
					const isActive = activeMethod === id;
					return (
						<button
							key={id}
							type="button"
							role="tab"
							aria-selected={isActive}
							onClick={() => setActiveMethod(id)}
							className={`flex-1 min-w-[58px] sm:min-w-0 min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-1.5 sm:px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
								isActive
									? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] shadow-xs border border-[var(--teal,#0d9488)] font-bold"
									: "text-[var(--ink-secondary,var(--muted,#64748b))] hover:text-[var(--ink,#0f172a)] border border-transparent"
							}`}
							data-testid={testId}
						>
							<Icon size={14} className={isActive ? "text-[var(--teal,#0d9488)] shrink-0" : "text-[var(--muted,#64748b)] shrink-0"} />
							<span>{label}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
};
