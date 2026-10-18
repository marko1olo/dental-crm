import React from "react";
import { Banknote, Clock, CreditCard, QrCode } from "lucide-react";
import { money } from "../../../AppHelpers";

export interface DoctorShiftCloseBreakdownCardProps {
	readonly cashRub: number;
	readonly cardRub: number;
	readonly sbpRub: number;
	readonly depositRub: number;
	readonly effectiveTotalCashRub: number;
}

export const DoctorShiftCloseBreakdownCard: React.FC<DoctorShiftCloseBreakdownCardProps> = ({
	cashRub,
	cardRub,
	sbpRub,
	depositRub,
	effectiveTotalCashRub,
}) => (
	<div className="border border-[var(--line,#e2e8f0)] rounded-xl p-3 sm:p-3.5 bg-[var(--paper-soft,#f8fafc)]">
		<div className="flex items-center justify-between mb-2.5">
			<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1.5">
				<Banknote className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" /> Сданная касса и выручка
			</span>
			<span className="text-xs font-bold text-[var(--ink,#0f172a)]">
				{money(effectiveTotalCashRub)}
			</span>
		</div>
		<div className="space-y-1.5 text-xs">
			<div className="flex items-center justify-between py-1 border-b border-[var(--line,#e2e8f0)]/50">
				<span className="flex items-center gap-1.5 text-[var(--muted,#64748b)]">
					<Banknote className="w-3.5 h-3.5 text-slate-500" /> Наличные
				</span>
				<span className="font-semibold text-[var(--ink,#0f172a)]">{money(cashRub)}</span>
			</div>
			<div className="flex items-center justify-between py-1 border-b border-[var(--line,#e2e8f0)]/50">
				<span className="flex items-center gap-1.5 text-[var(--muted,#64748b)]">
					<CreditCard className="w-3.5 h-3.5 text-slate-500" /> Карты / POS-терминал
				</span>
				<span className="font-semibold text-[var(--ink,#0f172a)]">{money(cardRub)}</span>
			</div>
			<div className="flex items-center justify-between py-1 border-b border-[var(--line,#e2e8f0)]/50">
				<span className="flex items-center gap-1.5 text-[var(--muted,#64748b)]">
					<QrCode className="w-3.5 h-3.5 text-slate-500" /> СБП QR-код
				</span>
				<span className="font-semibold text-[var(--ink,#0f172a)]">{money(sbpRub)}</span>
			</div>
			<div className="flex items-center justify-between py-1">
				<span className="flex items-center gap-1.5 text-[var(--muted,#64748b)]">
					<Clock className="w-3.5 h-3.5 text-slate-500" /> Зачет депозитов
				</span>
				<span className="font-semibold text-[var(--ink,#0f172a)]">{money(depositRub)}</span>
			</div>
		</div>
	</div>
);
