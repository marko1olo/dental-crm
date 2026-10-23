import React from "react";
import { DentalCrown } from "../../icons/DentalIcons.js";
import { PREPARATION_MARGIN_PRESETS } from "../orthopedicsPresets.js";

export interface ZtlPrepMarginSelectorProps {
	readonly preparationMargin: string;
	readonly onSelectPreparationMargin: (marginId: string, marginLabel: string) => void;
}

export function ZtlPrepMarginSelector({
	preparationMargin,
	onSelectPreparationMargin,
}: ZtlPrepMarginSelectorProps) {
	return (
		<div className="mb-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 min-w-0 overflow-hidden" data-testid="prep-margin-section">
			<div className="flex flex-wrap items-center justify-between gap-1 mb-2">
				<div className="flex items-center gap-1.5 min-w-0">
					<DentalCrown size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
						Граница препарирования (1 клик):
					</span>
				</div>
				<span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
					Тип уступа для прецизионного прилегания
				</span>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
				{PREPARATION_MARGIN_PRESETS.map((margin) => {
					const isSelected = preparationMargin === margin.id;
					return (
						<button
							key={margin.id}
							type="button"
							onClick={() => onSelectPreparationMargin(margin.id, margin.labelRu)}
							className={`min-h-[48px] p-2 rounded-lg text-xs font-bold text-left transition-all cursor-pointer border flex flex-col justify-between min-w-0 ${
								isSelected
									? "bg-teal-50 dark:bg-teal-950/50 border-teal-500 text-teal-950 dark:text-teal-100 ring-1 ring-teal-500 shadow-xs"
									: "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
							}`}
							data-testid={`prep-margin-${margin.id}`}
							title={margin.description}
						>
							<span className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug truncate">
								{margin.labelRu}
							</span>
							<span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono leading-tight mt-1">
								{margin.shortBadge}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
