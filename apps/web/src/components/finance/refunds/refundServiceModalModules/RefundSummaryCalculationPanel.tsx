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
		<div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold text-xs uppercase tracking-wider">
					<ShieldAlert className="w-4 h-4" />
					<span>Итоговый пересчет операции (ACID):</span>
				</div>
				<span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200 font-bold">
					Фискальный чек возврата
				</span>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
				<div className="bg-[var(--paper,#ffffff)] p-3 rounded-xl border border-[var(--border,#e2e8f0)] shadow-sm">
					<div className="text-[11px] text-[var(--muted,#64748b)]">Возврат пациенту:</div>
					<div className="text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5">
						{calculation.totalRefundRub.toLocaleString("ru-RU")} ₽
					</div>
					<div className="text-[10px] text-[var(--muted,#64748b)] mt-0.5">Чек «Возврат прихода»</div>
				</div>

				<div className="bg-[var(--paper,#ffffff)] p-3 rounded-xl border border-[var(--border,#e2e8f0)] shadow-sm">
					<div className="text-[11px] text-[var(--muted,#64748b)]">Вычет из з/п врача:</div>
					<div className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">
						-{calculation.totalDoctorClawbackRub.toLocaleString("ru-RU")} ₽
					</div>
					<div className="text-[10px] text-[var(--muted,#64748b)] mt-0.5">
						Ставка: {doctorCommissionPct}%
					</div>
				</div>

				<div className="bg-[var(--paper,#ffffff)] p-3 rounded-xl border border-[var(--border,#e2e8f0)] shadow-sm">
					<div className="text-[11px] text-[var(--muted,#64748b)]">Остаток по счету:</div>
					<div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
						{calculation.totalRemainingInvoiceRub.toLocaleString("ru-RU")} ₽
					</div>
					<div className="text-[10px] text-[var(--muted,#64748b)] mt-0.5">
						{calculation.remainingActiveItemsCount} активных услуг
					</div>
				</div>
			</div>

			<p className="text-xs text-amber-800 dark:text-amber-200/90 leading-relaxed m-0 flex items-start gap-2">
				<Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
				<span>
					Сумма возврата будет автоматически вычтена из сдельной ведомости врача{" "}
					<strong>{doctorName}</strong>. Клиника не выплатит зарплату за возвращенную работу.
				</span>
			</p>
		</div>
	);
};
