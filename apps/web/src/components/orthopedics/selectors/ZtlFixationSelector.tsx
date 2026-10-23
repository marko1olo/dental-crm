import React from "react";
import { Sliders } from "lucide-react";
import { FIXATION_TYPE_PRESETS } from "../orthopedicsPresets.js";

export interface ZtlFixationSelectorProps {
	readonly fixationType: "cement" | "screw" | "clasp";
	readonly onSelectFixationType: (type: "cement" | "screw" | "clasp") => void;
	readonly hasAntagonists: boolean;
	readonly onToggleAntagonists: (checked: boolean) => void;
}

export function ZtlFixationSelector({
	fixationType,
	onSelectFixationType,
	hasAntagonists,
	onToggleAntagonists,
}: ZtlFixationSelectorProps) {
	return (
		<div className="mb-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 min-w-0 overflow-hidden" data-testid="fixation-type-section">
			<div className="flex flex-wrap items-center justify-between gap-1 mb-2">
				<div className="flex items-center gap-1.5 min-w-0">
					<Sliders size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
						Вид фиксации и окклюзионные антагонисты (1 клик):
					</span>
				</div>
				<span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
					Протокол посадки и соотношение зубных рядов
				</span>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
				{FIXATION_TYPE_PRESETS.map((fix) => {
					const isSelected = fixationType === fix.id;
					return (
						<button
							key={fix.id}
							type="button"
							onClick={() => onSelectFixationType(fix.id)}
							className={`min-h-[48px] p-2 rounded-lg text-left transition-all cursor-pointer border flex flex-col justify-between min-w-0 ${
								isSelected
									? "bg-teal-50 dark:bg-teal-950/50 border-teal-500 text-teal-950 dark:text-teal-100 ring-1 ring-teal-500 shadow-xs"
									: "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
							}`}
							data-testid={`fixation-type-${fix.id}`}
							title={fix.description}
						>
							<div className="flex items-center justify-between gap-1 min-w-0 w-full mb-0.5">
								<span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{fix.titleRu}</span>
								<span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0 font-semibold">
									{fix.shortBadge}
								</span>
							</div>
							<span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">{fix.sublabelRu}</span>
						</button>
					);
				})}
			</div>

			<div className="pt-1.5 border-t border-slate-200/70 dark:border-slate-700/70 flex flex-wrap items-center justify-between gap-2">
				<label className="flex items-center gap-2 px-2.5 py-1 min-h-[34px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer select-none" data-testid="antagonists-checkbox-label">
					<input
						type="checkbox"
						checked={hasAntagonists}
						onChange={(e) => onToggleAntagonists(e.target.checked)}
						className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
						data-testid="antagonists-checkbox"
					/>
					<span>Слепок/скан антагонистов (окклюзионный регистрат в прикусе)</span>
				</label>
				<span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
					{hasAntagonists ? "Антагонисты переданы в ЗТЛ" : "Без антагонистов (одиночная вкладка)"}
				</span>
			</div>
		</div>
	);
}
