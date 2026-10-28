import React from "react";
import { formatDisplayCurrency } from "@dental/shared";

export interface CashRegisterTotalDisplayProps {
	readonly totalDue: number;
	readonly rawAmount: number;
	readonly isWarranty: boolean;
	readonly discountPercent: number;
	readonly effectiveDepositLimit: number;
}

export const CashRegisterTotalDisplay: React.FC<CashRegisterTotalDisplayProps> = ({
	totalDue,
	rawAmount,
	isWarranty,
	discountPercent,
	effectiveDepositLimit,
}) => {
	return (
		<div className="p-4 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] flex flex-col items-center justify-center gap-1 text-center">
			<span className="text-xs font-medium text-[var(--muted,#64748b)] uppercase tracking-wider">
				Сумма к оплате
			</span>
			<span data-testid="display-total-amount-due" className="inline-block">
				<span
					className="text-[32px] md:text-[36px] font-bold text-[var(--ink,#0f172a)] tracking-tight leading-none"
					data-testid="checkout-total-amount"
				>
					{formatDisplayCurrency(totalDue)}
				</span>
			</span>
			{rawAmount > 0 && (isWarranty || discountPercent > 0) && (
				<span className="text-xs text-[var(--muted)] line-through">
					Исходная стоимость: {formatDisplayCurrency(rawAmount)}
				</span>
			)}
			{effectiveDepositLimit > 0 && (
				<span className="text-xs text-[var(--teal,#0d9488)] font-medium mt-1">
					Доступен аванс / депозит: {effectiveDepositLimit.toLocaleString("ru-RU")} ₽
				</span>
			)}
		</div>
	);
};
