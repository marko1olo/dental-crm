import type { PaymentMethod } from "@dental/shared";
import React from "react";
import { visiblePaymentMethods } from "./types";

export type PaymentCaptureMethodTabsProps = {
	method: PaymentMethod;
	methodLabels: Record<PaymentMethod, string>;
	onMethodChange: (method: PaymentMethod) => void;
};

export function PaymentCaptureMethodTabs({
	method,
	methodLabels,
	onMethodChange,
}: PaymentCaptureMethodTabsProps) {
	return (
		<div
			role="tablist"
			className="dente-segmented-bar w-full flex col-span-full gap-1 p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]"
			style={{ gridColumn: "1 / -1", marginBottom: method === "cash" ? "4px" : "6px" }}
			aria-label="Способ оплаты"
		>
			{visiblePaymentMethods.map((paymentMethod) => {
				const isActive = method === paymentMethod;
				return (
					<button
						style={{
							minHeight: "44px",
							padding: "0 12px",
							borderRadius: "8px",
							background: isActive ? "#0d9488" : "transparent",
							color: isActive ? "#ffffff" : "var(--ink)",
							border: isActive ? "1px solid #0d9488" : "1px solid transparent",
						}}
						className={`dente-segmented-item min-h-[44px] flex-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
							isActive
								? "active bg-teal-600 text-white shadow-xs"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						key={paymentMethod}
						type="button"
						role="tab"
						aria-selected={isActive}
						onClick={() => onMethodChange(paymentMethod)}
						data-testid={`payment-method-${paymentMethod}`}
					>
						<span className="sm:hidden">
							{paymentMethod === "bank_transfer"
								? "Перевод"
								: paymentMethod === "family_wallet"
									? "Баланс"
									: paymentMethod === "card"
										? "Карта"
										: paymentMethod === "cash"
											? "Нал"
											: paymentMethod === "online"
												? "Онлайн"
												: methodLabels[paymentMethod] || paymentMethod}
						</span>
						<span className="hidden sm:inline">
							{methodLabels[paymentMethod] || (paymentMethod === "family_wallet" ? "Баланс / Аванс" : paymentMethod)}
						</span>
					</button>
				);
			})}
		</div>
	);
}
