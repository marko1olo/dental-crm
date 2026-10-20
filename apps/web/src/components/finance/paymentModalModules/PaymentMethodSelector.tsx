/**
 * apps/web/src/components/finance/paymentModalModules/PaymentMethodSelector.tsx
 *
 * Layer 4: Payment Tender Selector Grid Facade.
 * Governed by Mandates 8b (<=120 lines) & 8d (Studio HIG).
 */

import React from "react";
import { Coins } from "lucide-react";
import type { PaymentMethodSelectorProps } from "./types.js";
import { PaymentPosTiles } from "./PaymentPosTiles.js";

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
	activeMethod,
	setActiveMethod,
	patientDepositRub = 0,
	patientFamilyBalanceRub = 0,
	onOpenSplitPayment,
}) => {
	return (
		<div className="space-y-1.5">
			<div className="flex items-center justify-between">
				<span className="text-[11px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider block">
					Способ оплаты:
				</span>
				<button
					type="button"
					onClick={() => {
						if (onOpenSplitPayment) onOpenSplitPayment();
						setActiveMethod("split");
					}}
					className="sr-only"
					data-testid="link-open-split-payment"
				>
					<span>Сплит-оплата (несколько способов)</span>
				</button>
			</div>

			<PaymentPosTiles
				activeMethod={activeMethod}
				setActiveMethod={setActiveMethod}
				patientDepositRub={patientDepositRub}
				patientFamilyBalanceRub={patientFamilyBalanceRub}
			/>

			{/* Сплит-оплата: аккуратный переключатель разделения чека */}
			<div className="pt-0.5">
				<button
					type="button"
					onClick={() => {
						if (onOpenSplitPayment) onOpenSplitPayment();
						setActiveMethod("split");
					}}
					className={`payment-pos-split-bar w-full ${activeMethod === "split" ? "is-active" : ""}`}
					data-testid="tab-method-split"
					data-tour="split-payment"
					title="Разделение чека: карта, наличные, СБП, ДМС, сертификат, семейный баланс"
				>
					<span data-testid="btn-tender-split" className="flex items-center justify-center gap-2">
						<Coins size={16} className="text-purple-600 dark:text-purple-400" />
						<span className="font-bold text-xs">
							Разделить чек (Сплит: Карта + Наличные + СБП + ДМС)
						</span>
					</span>
				</button>
			</div>
		</div>
	);
};
