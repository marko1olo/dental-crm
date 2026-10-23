import React from "react";
import { DollarSign, Calendar } from "lucide-react";

export interface ZtlSoloEconomicsCardProps {
	readonly grossPriceRub: number;
	readonly ztlCostRub: number;
	readonly materialsCostRub: number;
	readonly netMarginRub: number;
	readonly marginPercent: number;
	readonly dueDate?: string | undefined;
}

export function ZtlSoloEconomicsCard({
	grossPriceRub,
	ztlCostRub,
	materialsCostRub,
	netMarginRub,
	marginPercent,
	dueDate,
}: ZtlSoloEconomicsCardProps) {
	return (
		<div className="mb-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 min-w-0 overflow-hidden" data-testid="solo-economics-section">
			<div className="flex flex-wrap items-center justify-between gap-2 mb-2">
				<div className="flex items-center gap-1.5 min-w-0">
					<DollarSign size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
					<span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
						Экономика наряда и маржинальность:
					</span>
				</div>
				{dueDate && (
					<div className="flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 shrink-0">
						<Calendar size={13} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Готовность ЗТЛ: <strong className="font-mono text-slate-900 dark:text-slate-100">{dueDate}</strong></span>
					</div>
				)}
			</div>
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
				<div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col justify-between min-h-[46px] min-w-0 overflow-hidden">
					<span className="text-[10px] text-slate-500 dark:text-slate-400 truncate min-w-0">Пациент (выручка)</span>
					<span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono truncate min-w-0">
						{grossPriceRub.toLocaleString("ru-RU")} ₽
					</span>
				</div>
				<div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col justify-between min-h-[46px] min-w-0 overflow-hidden">
					<span className="text-[10px] text-slate-500 dark:text-slate-400 truncate min-w-0">Лаборатория (ЗТЛ)</span>
					<span className="text-xs font-bold text-amber-700 dark:text-amber-400 font-mono truncate min-w-0">
						- {ztlCostRub.toLocaleString("ru-RU")} ₽
					</span>
				</div>
				<div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col justify-between min-h-[46px] min-w-0 overflow-hidden">
					<span className="text-[10px] text-slate-500 dark:text-slate-400 truncate min-w-0">Расходные материалы</span>
					<span className="text-xs font-bold text-rose-700 dark:text-rose-400 font-mono truncate min-w-0">
						- {materialsCostRub.toLocaleString("ru-RU")} ₽
					</span>
				</div>
				<div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex flex-col justify-between min-h-[46px] min-w-0 overflow-hidden">
					<div className="flex items-center justify-between min-w-0">
						<span className="text-[10px] font-bold text-emerald-900 dark:text-emerald-300 truncate min-w-0">Чистая маржа</span>
						<span className="text-[10px] font-bold font-mono px-1 py-0.2 rounded bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 shrink-0">
							{marginPercent}%
						</span>
					</div>
					<span className="text-xs font-bold text-emerald-800 dark:text-emerald-200 font-mono truncate min-w-0">
						+{netMarginRub.toLocaleString("ru-RU")} ₽
					</span>
				</div>
			</div>
		</div>
	);
}
