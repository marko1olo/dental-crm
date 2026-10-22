import React from "react";
import type { EndoCanalData } from "@dental/shared";
import { QUICK_LENGTH_PRESETS } from "../endoCanalConstants";

interface MobileLengthSectionProps {
	readonly canal: EndoCanalData;
	readonly onAdjustLength: (id: string, delta: number) => void;
	readonly onInputChange: (id: string, val: string) => void;
	readonly onSetLength: (id: string, val: number) => void;
	readonly onToggleObliteration?: ((id: string) => void) | undefined;
}

export const MobileLengthSection: React.FC<MobileLengthSectionProps> = ({
	canal,
	onAdjustLength,
	onInputChange,
	onSetLength,
	onToggleObliteration,
}) => {
	if (canal.isObliterated) {
		return (
			<div className="pt-2 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800">
				<div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-center justify-between gap-2">
					<div className="text-xs font-bold text-amber-900 dark:text-amber-200">
						⚠️ Канал облитерирован (0 мм). Сохранение разрешено в 1 клик.
					</div>
					<button
						type="button"
						onClick={() => onToggleObliteration?.(canal.id)}
						className="secondary-button text-xs font-bold text-amber-800 dark:text-amber-300 underline cursor-pointer shrink-0"
					>
						Снять
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-1.5 pt-1 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800">
			<label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
				Рабочая длина (WL, мм):
			</label>
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={() => onAdjustLength(canal.id, -0.5)}
					className="secondary-button icon-button min-h-[44px] min-w-[44px] px-3 rounded-xl bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-white font-black text-sm flex items-center justify-center border border-[var(--line,#cbd5e1)] dark:border-slate-700 transition-colors cursor-pointer shrink-0"
					title="-0.5 мм"
				>
					-0.5
				</button>
				<div className="relative flex-1 flex items-center">
					<input
						type="number"
						step="0.5"
						min="0"
						max="40"
						aria-label={`Рабочая длина в мм моб для ${canal.canalName}`}
						value={canal.workingLengthMm === 0 ? "" : canal.workingLengthMm}
						placeholder="—"
						onChange={(e) => onInputChange(canal.id, e.target.value)}
						className="w-full h-11 pl-2 pr-8 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white font-mono font-black text-base focus:ring-2 focus:ring-rose-500 outline-none text-center"
					/>
					<span className="absolute right-3 text-xs text-rose-700 dark:text-rose-300 font-bold pointer-events-none">
						мм
					</span>
				</div>
				<button
					type="button"
					onClick={() => onAdjustLength(canal.id, 0.5)}
					className="secondary-button icon-button min-h-[44px] min-w-[44px] px-3 rounded-xl bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-white font-black text-sm flex items-center justify-center border border-[var(--line,#cbd5e1)] dark:border-slate-700 transition-colors cursor-pointer shrink-0"
					title="+0.5 мм"
				>
					+0.5
				</button>
			</div>
			<div className="flex items-center gap-1.5 flex-wrap pt-0.5">
				{QUICK_LENGTH_PRESETS.map((presetLen) => (
					<button
						key={presetLen}
						type="button"
						onClick={() => onSetLength(canal.id, presetLen)}
						className={`secondary-button min-h-[32px] px-2.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer inline-flex items-center justify-center ${
							Number(canal.workingLengthMm) === presetLen
								? "bg-rose-600 text-white shadow-xs"
								: "bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-300 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 border border-[var(--line,#e2e8f0)] dark:border-slate-700"
						}`}
					>
						{presetLen}
					</button>
				))}
			</div>
		</div>
	);
};
