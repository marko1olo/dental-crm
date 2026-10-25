/**
 * CashShiftKpiCards.tsx — 4-State Metric Cards for Shift Reconciliation.
 * Mandate 8e, Mandate 8d pt 7 (Zero cartoon emojis, Lucide vector icons).
 * Anti-All-Caps: Clean sentence case headers.
 */

import React from "react";
import { Banknote, CreditCard, ShieldCheck, Wallet } from "lucide-react";
import type { CashShiftKpiCardsProps } from "./types";

export const CashShiftKpiCards: React.FC<CashShiftKpiCardsProps> = ({
	netRevenueRub,
	cashInDrawerRub,
	cardSumRub,
	sbpSumRub,
	advanceOffsetRub,
	incomeTotalRub,
	incomeReturnTotalRub,
}) => {
	const electronicSumRub = cardSumRub + sbpSumRub;

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
			{/* Card 1: Net Revenue */}
			<div className="p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col justify-between space-y-1.5">
				<div className="flex items-center gap-2 text-xs text-[var(--muted)] font-semibold">
					<ShieldCheck className="w-4 h-4 text-[var(--teal)] shrink-0" />
					<span className="font-semibold text-[var(--ink)]">Чистая выручка</span>
				</div>
				<div className="text-2xl font-black font-mono text-[var(--teal)]" data-testid="kpi-net-revenue">
					{netRevenueRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
				</div>
				<div className="text-[11px] text-[var(--muted)] truncate">
					{incomeTotalRub !== undefined && incomeReturnTotalRub !== undefined
						? `Приход (${incomeTotalRub.toLocaleString("ru-RU")} ₽) − Возврат (${incomeReturnTotalRub.toLocaleString("ru-RU")} ₽)`
						: "Все типы оплат за смену"}
				</div>
			</div>

			{/* Card 2: Cash in Drawer */}
			<div className="p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col justify-between space-y-1.5">
				<div className="flex items-center gap-2 text-xs text-[var(--muted)] font-semibold">
					<Banknote className="w-4 h-4 text-[var(--muted)] shrink-0" />
					<span className="font-semibold text-[var(--ink)]">Наличные в ящике</span>
				</div>
				<div className="text-2xl font-black font-mono text-[var(--ink)]" data-testid="kpi-cash-in-drawer">
					{cashInDrawerRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
				</div>
				<div className="text-[11px] text-[var(--muted)]">В кассовом ящике</div>
			</div>

			{/* Card 3: POS & SBP */}
			<div className="p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col justify-between space-y-1.5">
				<div className="flex items-center gap-2 text-xs text-[var(--muted)] font-semibold">
					<CreditCard className="w-4 h-4 text-[var(--muted)] shrink-0" />
					<span className="font-semibold text-[var(--ink)]">Безналичные и СБП</span>
				</div>
				<div className="text-2xl font-black font-mono text-[var(--ink)]" data-testid="kpi-electronic">
					{electronicSumRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
				</div>
				<div className="text-[11px] text-[var(--muted)] truncate">
					Терминал: {cardSumRub.toLocaleString("ru-RU")} ₽ · СБП: {sbpSumRub.toLocaleString("ru-RU")} ₽
				</div>
			</div>

			{/* Card 4: Advance Offset */}
			<div className="p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col justify-between space-y-1.5">
				<div className="flex items-center gap-2 text-xs text-[var(--muted)] font-semibold">
					<Wallet className="w-4 h-4 text-[var(--muted)] shrink-0" />
					<span className="font-semibold text-[var(--ink)]">Зачет авансов</span>
				</div>
				<div className="text-2xl font-black font-mono text-[var(--ink)]" data-testid="kpi-advance-offset">
					{advanceOffsetRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
				</div>
				<div className="text-[11px] text-[var(--muted)]">Депозиты пациентов</div>
			</div>
		</div>
	);
};
