import React from "react";
import type { EndoCanalData } from "@dental/shared";
import { QUICK_LENGTH_PRESETS } from "../endoCanalConstants";

interface DesktopLengthCellProps {
	readonly canal: EndoCanalData;
	readonly onAdjustLength: (id: string, delta: number) => void;
	readonly onInputChange: (id: string, val: string) => void;
	readonly onSetLength: (id: string, val: number) => void;
	readonly onToggleObliteration?: ((id: string) => void) | undefined;
}

export const DesktopLengthCell: React.FC<DesktopLengthCellProps> = ({
	canal,
	onAdjustLength,
	onInputChange,
	onSetLength,
	onToggleObliteration,
}) => (
	<td className="py-1.5 px-3 min-w-[200px]">
		{canal.isObliterated ? (
			<div className="flex items-center gap-1.5 py-1">
				<span className="px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-500/40">
					⚠️ Облитерирован (0 мм)
				</span>
				<button
					type="button"
					onClick={() => onToggleObliteration?.(canal.id)}
					className="secondary-button text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
					title="Снять отметку облитерации"
				>
					Снять
				</button>
			</div>
		) : (
			<div className="space-y-1">
				<div className="relative flex items-center gap-1">
					<button
						type="button"
						onClick={() => onAdjustLength(canal.id, -0.5)}
						className="secondary-button icon-button h-7 w-7 rounded-lg bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-white font-bold text-xs flex items-center justify-center transition-colors cursor-pointer shrink-0"
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
							aria-label={`Рабочая длина в мм для канала ${canal.canalName}`}
							value={canal.workingLengthMm === 0 ? "" : canal.workingLengthMm}
							placeholder="—"
							onChange={(e) => onInputChange(canal.id, e.target.value)}
							className="w-full h-7 pl-1.5 pr-6 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white font-mono font-bold text-xs focus:ring-2 focus:ring-rose-500 outline-none text-center"
						/>
						<span className="absolute right-1.5 text-[10px] text-rose-700 dark:text-rose-300 font-bold pointer-events-none">
							мм
						</span>
					</div>
					<button
						type="button"
						onClick={() => onAdjustLength(canal.id, 0.5)}
						className="secondary-button icon-button h-7 w-7 rounded-lg bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-white font-bold text-xs flex items-center justify-center transition-colors cursor-pointer shrink-0"
						title="+0.5 мм"
					>
						+0.5
					</button>
				</div>
				<div className="flex items-center gap-1 flex-wrap">
					{QUICK_LENGTH_PRESETS.map((presetLen) => (
						<button
							key={presetLen}
							type="button"
							onClick={() => onSetLength(canal.id, presetLen)}
							className={`secondary-button h-5 px-1.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer inline-flex items-center justify-center ${
								Number(canal.workingLengthMm) === presetLen
									? "bg-rose-600 text-white shadow-xs"
									: "bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-300 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 border border-[var(--line,#e2e8f0)] dark:border-slate-700"
							}`}
							title={`Установить длину ${presetLen} мм`}
						>
							{presetLen}
						</button>
					))}
				</div>
			</div>
		)}
	</td>
);
