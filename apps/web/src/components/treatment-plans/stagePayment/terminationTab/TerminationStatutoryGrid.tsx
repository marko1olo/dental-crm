import React from "react";
import { AlertTriangle } from "lucide-react";
import { formatKopecksRu } from "@dental/shared";
import type { TerminationRefundCalculation } from "../stagePaymentEngine.js";

export interface TerminationStatutoryGridProps {
	readonly terminationCalc: TerminationRefundCalculation;
}

export const TerminationStatutoryGrid: React.FC<TerminationStatutoryGridProps> = ({
	terminationCalc,
}) => {
	return (
		<>
			{/* Statutory Rule Banner */}
			<div className="rounded-2xl border border-rose-500/20 bg-rose-50/40 dark:bg-rose-950/20 p-4 text-xs text-[var(--ink,#0f172a)] flex items-start gap-3">
				<AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
				<div>
					<h4 className="font-bold text-rose-900 dark:text-rose-200">
						Расчет возврата при досрочном расторжении
					</h4>
					<p className="text-[var(--muted,#64748b)] mt-1">
						Потребитель вправе отказаться от договора в любое время при условии оплаты фактически понесенных расходов клиники (ст. 709 ГК РФ). Работы по подписанным Актам признаны и возврату не подлежат.
					</p>
				</div>
			</div>

			{/* Calculation Breakdown Grid */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div className="rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,#ffffff)] p-4 text-xs">
					<span className="text-[var(--muted,#64748b)] block">Всего оплачено пациентом:</span>
					<span className="text-xl font-bold text-[var(--ink,#0f172a)] mt-1 block">
						{formatKopecksRu(terminationCalc.totalPaidByPatientKopecks)}
					</span>
				</div>

				<div className="rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,#ffffff)] p-4 text-xs">
					<span className="text-[var(--muted,#64748b)] block">Принято по Актам (не возвращается):</span>
					<span className="text-xl font-bold text-[var(--teal-dark,var(--teal))] mt-1 block">
						{formatKopecksRu(terminationCalc.completedActsTotalKopecks)}
					</span>
				</div>

				<div className="rounded-xl border border-rose-300 dark:border-rose-800 bg-[var(--paper-strong,#ffffff)] p-4 text-xs">
					<span className="text-[var(--muted,#64748b)] block">Фактические расходы клиники:</span>
					<span className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1 block">
						{formatKopecksRu(terminationCalc.actualClinicExpensesKopecks)}
					</span>
				</div>

				<div className="rounded-xl border border-emerald-400 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 text-xs">
					<span className="text-emerald-800 dark:text-emerald-300 font-bold block">Сумма к возврату пациенту:</span>
					<span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
						{formatKopecksRu(terminationCalc.refundableToPatientKopecks)}
					</span>
				</div>
			</div>
		</>
	);
};
