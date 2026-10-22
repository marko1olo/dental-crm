import React from "react";
import { Layers } from "lucide-react";
import type { OfflineFiscalBatchResult } from "@dental/shared";

interface OfflineFiscalBatchShiftsTabProps {
	readonly batchResult: OfflineFiscalBatchResult | null;
}

export function OfflineFiscalBatchShiftsTab({ batchResult }: OfflineFiscalBatchShiftsTabProps) {
	if (!batchResult) {
		return (
			<div className="p-8 text-center border border-dashed border-[var(--glass-border)] rounded-lg text-[var(--muted)]">
				<Layers className="w-10 h-10 mx-auto mb-2 opacity-50" />
				<div>Пакетная фискализация еще не выполнена.</div>
				<div className="text-xs mt-1">Нажмите кнопку «Фискализировать все чеки» на вкладке очереди.</div>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
			{batchResult.shifts.map((s) => (
				<div key={s.shiftNumber} className="p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--paper-strong)] space-y-3">
					<div className="flex items-center justify-between border-b border-[var(--glass-border)] pb-2">
						<div className="flex items-center gap-2">
							<div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 font-bold text-xs">
								СМЕНА № {s.shiftNumber}
							</div>
							<span className="text-sm font-semibold">{s.openedAtIso.slice(0, 10)}</span>
						</div>
						<span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
							{s.zReport.netRevenueRub.toLocaleString("ru-RU")} ₽
						</span>
					</div>

					<div className="grid grid-cols-2 gap-2 text-xs">
						<div className="text-[var(--muted)]">Чеков за смену:</div>
						<div className="text-right font-semibold">{s.zReport.totalReceiptsCount} шт.</div>
						<div className="text-[var(--muted)]">Наличные:</div>
						<div className="text-right font-mono text-amber-600">{s.zReport.incomeCashRub.toLocaleString("ru-RU")} ₽</div>
						<div className="text-[var(--muted)]">Безналичные (Карты+СБП):</div>
						<div className="text-right font-mono text-indigo-600">
							{(s.zReport.incomeCardRub + s.zReport.incomeSbpRub).toLocaleString("ru-RU")} ₽
						</div>
						<div className="text-[var(--muted)]">Зачет аванса:</div>
						<div className="text-right font-mono text-purple-600">{s.zReport.incomeAdvanceOffsetRub.toLocaleString("ru-RU")} ₽</div>
					</div>

					{s.zReport && (
						<details className="mt-2 text-xs">
							<summary className="cursor-pointer text-[var(--muted)] hover:text-[var(--ink)] select-none">
								Показать чек Z-отчета
							</summary>
							<pre className="mt-2 p-2 rounded bg-black/80 text-emerald-400 font-mono text-[10px] overflow-x-auto">
								{s.zReport.zReportTapeText80mm || s.zReport.zReportTapeText58mm}
							</pre>
						</details>
					)}
				</div>
			))}
		</div>
	);
}
