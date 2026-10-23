import React from "react";
import { Zap, ShieldCheck } from "lucide-react";
import { type StandardZtlPreset, STANDARD_ZTL_ORDER_PRESETS } from "../orthopedicsPresets.js";

export interface ZtlPresetsGridProps {
	readonly activeZtlPresetId: string;
	readonly onSelectZtlPreset: (preset: StandardZtlPreset) => void;
}

export function ZtlPresetsGrid({ activeZtlPresetId, onSelectZtlPreset }: ZtlPresetsGridProps) {
	return (
		<div className="mb-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 min-w-0 overflow-hidden">
			<div className="flex flex-wrap items-center justify-between gap-1 mb-2">
				<div className="flex items-center gap-1.5 min-w-0">
					<Zap size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
						Стандарты ЗТЛ и гарантия (1 клик):
					</span>
				</div>
				<span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
					Авторасчет сроков и спецификации
				</span>
			</div>
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
				{STANDARD_ZTL_ORDER_PRESETS.map((preset) => {
					const isSelected = activeZtlPresetId === preset.id;
					return (
						<button
							key={preset.id}
							type="button"
							onClick={() => onSelectZtlPreset(preset)}
							className={`min-h-[54px] p-2 rounded-lg text-xs font-bold text-left transition-all cursor-pointer border flex flex-col justify-between min-w-0 ${
								isSelected
									? "bg-teal-50 dark:bg-teal-950/50 border-teal-500 text-teal-950 dark:text-teal-100 ring-1 ring-teal-500 shadow-xs"
									: "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
							}`}
							data-testid={`ztl-preset-${preset.id}`}
							title={`${preset.description} · Гарантия: ${preset.warrantyLabelRu}`}
						>
							<div className="flex flex-wrap sm:flex-nowrap items-start justify-between gap-1 min-w-0 w-full mb-0.5">
								<span className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug truncate">
									{preset.name}
								</span>
								<span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0 font-semibold">
									{preset.badge}
								</span>
							</div>
							<span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight min-w-0 w-full mb-1 truncate">
								{preset.material}
							</span>
							<div className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium min-w-0 w-full mt-auto">
								<ShieldCheck size={12} className="shrink-0" />
								<span className="truncate">{preset.warrantyLabelRu}</span>
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}
