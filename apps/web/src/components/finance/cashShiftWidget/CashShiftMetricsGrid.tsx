import React from "react";
import { Banknote, CreditCard, QrCode, ShieldCheck } from "lucide-react";

interface CashShiftMetricsGridProps {
	readonly cashInDrawerRub: number;
	readonly cardSumRub: number;
	readonly sbpSumRub: number;
	readonly totalTurnoverRub: number;
	readonly netBankDepositRub: number;
	readonly formatMoneyRu: (v: number) => string;
}

export function CashShiftMetricsGrid({
	cashInDrawerRub,
	cardSumRub,
	sbpSumRub,
	totalTurnoverRub,
	netBankDepositRub,
	formatMoneyRu,
}: CashShiftMetricsGridProps) {
	return (
		<div className="cash-shift-grid">
			<div className="cash-shift-card">
				<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] mb-1 font-semibold uppercase tracking-wider">
					<span className="flex items-center gap-1.5">
						<Banknote size={16} className="text-emerald-500" />
						Наличные в ящике
					</span>
					<span className="text-[10px] font-bold">Касса</span>
				</div>
				<div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
					{formatMoneyRu(cashInDrawerRub)}
				</div>
			</div>

			<div className="cash-shift-card">
				<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] mb-1 font-semibold uppercase tracking-wider">
					<span className="flex items-center gap-1.5">
						<CreditCard size={16} className="text-blue-500" />
						Эквайринг и Терминал
					</span>
					<span className="text-[10px] font-bold">Терминал</span>
				</div>
				<div className="text-xl sm:text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
					{formatMoneyRu(cardSumRub)}
				</div>
				<div className="text-[11px] text-[var(--muted,#64748b)] mt-0.5">
					Комиссия эквайринга: ~{formatMoneyRu(Math.round(cardSumRub * 0.015 * 100) / 100)}
				</div>
			</div>

			<div className="cash-shift-card">
				<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] mb-1 font-semibold uppercase tracking-wider">
					<span className="flex items-center gap-1.5">
						<QrCode size={16} className="text-teal-500" />
						СБП / Плати QR
					</span>
					<span className="text-[10px] font-bold">СБП</span>
				</div>
				<div className="text-xl sm:text-2xl font-black font-mono text-teal-600 dark:text-teal-400">
					{formatMoneyRu(sbpSumRub)}
				</div>
				<div className="text-[11px] text-[var(--muted,#64748b)] mt-0.5">
					Низкая комиссия: ~{formatMoneyRu(Math.round(sbpSumRub * 0.007 * 100) / 100)}
				</div>
			</div>

			<div className="cash-shift-card">
				<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] mb-1 font-semibold uppercase tracking-wider">
					<span className="flex items-center gap-1.5">
						<ShieldCheck size={16} className="text-purple-500" />
						Общий оборот смены
					</span>
					<span className="text-[10px] font-bold">Итого</span>
				</div>
				<div className="text-xl sm:text-2xl font-black font-mono text-[var(--ink,#0f172a)]">
					{formatMoneyRu(totalTurnoverRub)}
				</div>
				<div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
					Чистое зачисление на р/с: {formatMoneyRu(netBankDepositRub)}
				</div>
			</div>
		</div>
	);
}
