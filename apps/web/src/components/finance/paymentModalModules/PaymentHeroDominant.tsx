import React from "react";
import type { PaymentLogicResult } from "./types.js";

export interface PaymentHeroDominantProps {
	readonly discountsHook: PaymentLogicResult["discountsHook"];
	readonly rawTotalDueRub: number;
	readonly patientName: string;
	readonly patientPhone?: string | undefined;
}

export const PaymentHeroDominant: React.FC<PaymentHeroDominantProps> = ({
	discountsHook,
	rawTotalDueRub,
	patientName,
	patientPhone,
}) => {
	return (
		<div className="payment-hero-dominant px-4 py-3 sm:py-3.5 text-center border-b border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] select-none shrink-0" data-testid="payment-hero-dominant">
			<div className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
				Сумма к оплате
			</div>
			<div className="payment-hero-amount text-3xl sm:text-4xl font-black font-mono tracking-tight text-[var(--ink,#0f172a)] my-0.5" data-testid="mobile-hero-amount">
				{discountsHook.totalDueRub.toLocaleString("ru-RU")} ₽
			</div>
			{discountsHook.discountRub > 0 && (
				<div className="flex items-center justify-center gap-1.5 text-xs">
					<span className="line-through text-[var(--muted,#64748b)] font-mono">
						{rawTotalDueRub.toLocaleString("ru-RU")} ₽
					</span>
					<span className="px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/30 text-[11px]">
						-{discountsHook.effectiveDiscountPercent}% ({discountsHook.discountRub.toLocaleString("ru-RU")} ₽)
					</span>
				</div>
			)}
			<div className="text-[11px] sm:text-xs text-[var(--muted,#64748b)] truncate">
				Пациент: <strong className="text-[var(--ink,#0f172a)]">{patientName}</strong>
				{patientPhone && <span> · {patientPhone}</span>}
			</div>
		</div>
	);
};
