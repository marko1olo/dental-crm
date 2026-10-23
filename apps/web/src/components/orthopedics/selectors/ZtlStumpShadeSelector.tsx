import React from "react";
import { Palette } from "lucide-react";
import { STUMP_SHADE_PRESETS } from "../orthopedicsPresets.js";

export interface ZtlStumpShadeSelectorProps {
	readonly stumpShade: string;
	readonly onSelectStumpShade?: ((shade: string) => void) | undefined;
}

export function ZtlStumpShadeSelector({
	stumpShade,
	onSelectStumpShade,
}: ZtlStumpShadeSelectorProps) {
	return (
		<div className="mb-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 min-w-0 overflow-hidden" data-testid="stump-shade-section">
			<div className="flex flex-wrap items-center justify-between gap-1 mb-2">
				<div className="flex items-center gap-1.5 min-w-0">
					<Palette size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
						Цвет культи зуба (Natural Die ND1–ND9, 1 клик):
					</span>
				</div>
				<span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
					Ориентир для ЗТЛ под E.max / ZrO2
				</span>
			</div>
			<div className="grid grid-cols-3 sm:grid-cols-9 gap-1.5">
				{STUMP_SHADE_PRESETS.map((stump) => {
					const isSelected = stumpShade === stump.code;
					return (
						<button
							key={stump.code}
							type="button"
							onClick={() => onSelectStumpShade?.(stump.code)}
							className={`min-h-[46px] px-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border flex flex-col justify-between items-center min-w-0 overflow-hidden ${
								isSelected
									? "bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-950 dark:text-teal-100 ring-2 ring-teal-500 shadow-xs"
									: "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
							}`}
							data-testid={`stump-shade-${stump.code}`}
							title={stump.labelRu}
						>
							<span
								className="w-3.5 h-3.5 rounded-full border border-slate-400 dark:border-slate-500 shadow-2xs shrink-0"
								style={{ backgroundColor: stump.colorHex }}
								aria-hidden="true"
							/>
							<span className="text-[10px] font-mono font-bold mt-1 truncate min-w-0">{stump.code}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
