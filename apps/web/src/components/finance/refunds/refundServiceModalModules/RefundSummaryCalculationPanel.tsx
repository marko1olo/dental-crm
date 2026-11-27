import React from "react";
import { Info, ShieldAlert } from "lucide-react";
import type { PartialRefundCalculationResult } from "@dental/shared";

export interface RefundSummaryCalculationPanelProps {
	readonly calculation: PartialRefundCalculationResult;
	readonly doctorCommissionPct: number;
	readonly doctorName: string;
}

export const RefundSummaryCalculationPanel: React.FC<RefundSummaryCalculationPanelProps> = ({
	calculation,
	doctorCommissionPct,
	doctorName,
}) => {
	return (
		<div className="rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] p-4 space-y-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2 text-[var(--ink,#0f172a)] font-semibold text-xs sm:text-sm">
					<ShieldAlert className="w-4 h-4 text-[var(--primary)] shrink-0" />
					<span>Итоговый пересчёт возврата</span>
				</div>
				<span className="h-6 px-2.5 inline-flex items-center rounded-full bg-[var(--primary-soft,rgba(13,148,136,0.12))] text-[var(--primary)] text-xs font-medium whitespace-nowrap shrink-0">
					Фискальный чек возврата
				</span>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
				<div className="bg-[var(--paper,#ffffff)] p-3 rounded-xl border border-[var(--line,#e2e8f0)] shadow-xs">
					<div className="text-xs text-[var(--ink-muted,#64748b)]">Возврат пациенту</div>
					<div className="dente-money text-lg font-bold font-mono tracking-tight tabular-nums text-[var(--danger,#dc2626)] mt-0.5 text-left">
						{calculation.totalRefundRub.toLocaleString("ru-RU")} ₽
					</div>
					<div className="text-[11px] text-[var(--ink-muted,#64748b)] mt-0.5">Чек «Возврат прихода»</div>
				</div>

				<div className="bg-[var(--paper,#ffffff)] p-3 rounded-xl border border-[var(--line,#e2e8f0)] shadow-xs">
					<div className="text-xs text-[var(--ink-muted,#64748b)]">Вычет из з/п врача</div>
					<div className="dente-money text-lg font-bold font-mono tracking-tight tabular-nums text-[var(--warning,#d97706)] mt-0.5 text-left">
						-{calculation.totalDoctorClawbackRub.toLocaleString("ru-RU")} ₽
					</div>
					<div className="text-[11px] text-[var(--ink-muted,#64748b)] mt-0.5">
						Ставка: {doctorCommissionPct}%
					</div>
				</div>

				<div className="bg-[var(--paper,#ffffff)] p-3 rounded-xl border border-[var(--line,#e2e8f0)] shadow-xs">
					<div className="text-xs text-[var(--ink-muted,#64748b)]">Остаток по счёту</div>
					<div className="dente-money text-lg font-bold font-mono tracking-tight tabular-nums text-[var(--success,#16a34a)] mt-0.5 text-left">
						{calculation.totalRemainingInvoiceRub.toLocaleString("ru-RU")} ₽
					</div>
					<div className="text-[11px] text-[var(--ink-muted,#64748b)] mt-0.5">
						{calculation.remainingActiveItemsCount} активных услуг
					</div>
				</div>
			</div>

			<p className="text-xs text-[var(--ink-muted,#64748b)] leading-relaxed m-0 flex items-start gap-2">
				<Info className="w-4 h-4 shrink-0 mt-0.5 text-[var(--primary)]" />
				<span>
					Сумма возврата будет автоматически вычтена из сдельной ведомости врача{" "}
					<strong className="text-[var(--ink,#0f172a)]">{doctorName}</strong>. Клиника не выплатит зарплату за возвращённую работу.
				</span>
			</p>
		</div>
	);
};
