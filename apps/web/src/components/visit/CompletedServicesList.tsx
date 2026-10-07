import React from "react";
import { Check, Trash2 } from "lucide-react";
import { money } from "../../AppHelpers";
import {
	PRICE_UNKNOWN_TEXT,
	type ParsedCompletedServiceLine,
} from "./completedServicesPlan";

export interface CompletedServicesListProps {
	completedLinesList: readonly (ParsedCompletedServiceLine | null)[];
	totalRub: number;
	onRemoveCompletedLine: (rawLine: string) => void;
}

export const CompletedServicesList: React.FC<CompletedServicesListProps> = ({
	completedLinesList,
	totalRub,
	onRemoveCompletedLine,
}) => {
	if (completedLinesList.length === 0) return null;

	return (
		<div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800">
			<div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
				<span>
					Выполнено в этом приёме ({completedLinesList.length}):
				</span>
				<span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
					Итого: {money(totalRub)}
				</span>
			</div>
			<div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
				{completedLinesList.map((entry, idx) => {
					if (!entry) return null;
					return (
						<div
							key={`${entry.rawLine}-${idx}`}
							className="flex items-center justify-between gap-2 p-1.5 sm:p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-xs border border-slate-100 dark:border-slate-800"
						>
							<div className="flex items-center gap-2 flex-1 min-w-0">
								<Check className="w-4 h-4 text-emerald-500 shrink-0" />
								{entry.toothCode ? (
									<span className="shrink-0 px-1.5 py-0.5 rounded text-[11px] font-bold font-mono bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
										{entry.toothCode.includes(",") ? `Зубы ${entry.toothCode}:` : `Зуб ${entry.toothCode}:`}
									</span>
								) : (
									<span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-800">
										Общая
									</span>
								)}
								<span className="truncate flex-1">
									<span className="font-medium text-slate-900 dark:text-slate-100 mr-1.5">{entry.title}</span>
									{entry.code804n && (
										<span className="font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400">
											[{entry.code804n}]
										</span>
									)}
									{entry.quantity > 1 && (
										<span className="text-slate-500 ml-1 text-[11px]">
											× {entry.quantity} шт.
										</span>
									)}
								</span>
							</div>
							<div className="flex items-center gap-2 shrink-0">
								<span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
									{entry.priceRub === null
										? PRICE_UNKNOWN_TEXT
										: money(entry.priceRub)}
								</span>
								<button
									type="button"
									onClick={() => onRemoveCompletedLine(entry.rawLine)}
									className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
									title="Удалить из выполненного"
									aria-label={`Удалить выполненную услугу ${entry.title}`}
								>
									<Trash2 className="w-4 h-4" />
								</button>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};
