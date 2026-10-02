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
							className="flex items-center justify-between gap-2 p-1.5 rounded-md bg-slate-50 dark:bg-slate-800/40 text-xs border border-slate-100 dark:border-slate-800"
						>
							<div className="flex items-center gap-1.5 flex-1 min-w-0">
								<Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
								<span className="truncate">
									<span className="font-medium text-slate-900 dark:text-slate-100">{entry.title}</span>
									{entry.code804n && (
										<span className="font-mono text-[10px] text-slate-400 ml-1.5">
											[{entry.code804n}]
										</span>
									)}
									{entry.toothCode && (
										<span className="text-indigo-600 dark:text-indigo-400 font-medium ml-1">
											(зуб {entry.toothCode})
										</span>
									)}
									{entry.quantity > 1 && (
										<span className="text-slate-500 ml-1">
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
									className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-md transition-colors"
									title="Удалить из выполненного"
									aria-label="Удалить выполненную услугу"
								>
									<Trash2 className="w-3.5 h-3.5" />
								</button>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};
