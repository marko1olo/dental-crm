import React from "react";
import type { QuickCanalState } from "./types";
import { QUICK_LENGTH_CHIPS, QUICK_MAF_OPTIONS } from "./types";

export interface QuickBarCanalChipsProps {
	readonly canal: QuickCanalState;
	readonly onUpdate: (id: string, updates: Partial<QuickCanalState>) => void;
	readonly onAdjustLength: (id: string, delta: number) => void;
}

export const QuickBarCanalChips: React.FC<QuickBarCanalChipsProps> = ({
	canal: c,
	onUpdate,
	onAdjustLength,
}) => {
	return (
		<div className="flex flex-wrap items-center gap-2">
			{/* Параметр 1: Длина (WL) */}
			{!c.isObliterated && (
				<div className="flex items-center gap-1">
					<div className="flex items-center gap-1 bg-[var(--surface,#f1f5f9)] dark:bg-slate-800/80 p-0.5 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-slate-700">
						<button
							type="button"
							onClick={() => onAdjustLength(c.id, -0.5)}
							className="secondary-button icon-button w-6 h-6 rounded text-xs font-bold bg-[var(--paper,#ffffff)] dark:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center cursor-pointer"
							title="-0.5 мм"
						>-</button>
						<span className="px-1.5 text-xs font-mono font-black text-rose-600 dark:text-rose-400 min-w-[38px] text-center">
							{c.workingLengthMm.toFixed(1)}
						</span>
						<button
							type="button"
							onClick={() => onAdjustLength(c.id, 0.5)}
							className="secondary-button icon-button w-6 h-6 rounded text-xs font-bold bg-[var(--paper,#ffffff)] dark:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center cursor-pointer"
							title="+0.5 мм"
						>+</button>
					</div>
					{QUICK_LENGTH_CHIPS.map((len) => (
						<button
							key={len}
							type="button"
							onClick={() => onUpdate(c.id, { workingLengthMm: len, isObliterated: false })}
							data-testid={`chip-length-${c.name}-${len}`}
							className={`secondary-button min-h-[28px] h-7 px-2 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer active:scale-95 ${
								c.workingLengthMm === len
									? "bg-rose-600 text-white border-rose-600 shadow-2xs"
									: "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-2xs"
							}`}
						>{len}</button>
					))}
				</div>
			)}

			{/* Параметр 2: Инструментация и MAF (без симуляции цвета пластиковых ручек) */}
			<div className="flex items-center gap-1">
				{QUICK_MAF_OPTIONS.map((opt) => (
					<button
						key={opt.label}
						type="button"
						onClick={() => onUpdate(c.id, { masterApicalFile: opt.maf, taper: opt.taper })}
						data-testid={`chip-maf-${c.name}-${opt.label.replace(/[^a-z0-9]/gi, "")}`}
						className={`secondary-button min-h-[28px] h-7 px-2 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
							c.masterApicalFile === opt.maf && c.taper === opt.taper
								? "bg-[var(--primary,#0d9488)] text-white border-[var(--primary,#0d9488)] shadow-2xs"
								: "bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 border-[var(--line,#cbd5e1)] dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-2xs"
						}`}
					>
						<span>{opt.label}</span>
					</button>
				))}
			</div>

			{/* Параметр 3: Обтурация */}
			<div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-300 dark:border-slate-700">
				<button
					type="button"
					onClick={() => onUpdate(c.id, { obturationType: "gutta_sealer", sealer: "AH Plus" })}
					data-testid={`chip-obturation-gutta-${c.name}`}
					className={`secondary-button min-h-[28px] h-7 px-2 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
						c.obturationType === "gutta_sealer"
							? "bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs border border-emerald-500/40"
							: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
					}`}
				>
					<span className="hidden sm:inline">Гуттаперча + AH Plus</span>
					<span className="sm:hidden">AH Plus</span>
				</button>
				<button
					type="button"
					onClick={() => onUpdate(c.id, { obturationType: "bioceramic", sealer: "Биокерамика (BioRoot)" })}
					data-testid={`chip-obturation-bio-${c.name}`}
					className={`secondary-button min-h-[28px] h-7 px-2 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
						c.obturationType === "bioceramic"
							? "bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs border border-teal-500/40"
							: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
					}`}
				>
					<span className="hidden sm:inline">Биокерамика</span>
					<span className="sm:hidden">Био</span>
				</button>
				<button
					type="button"
					onClick={() => onUpdate(c.id, { obturationType: "temp_caoh2", sealer: "Каласепт (Ca(OH)2)" })}
					data-testid={`chip-obturation-caoh2-${c.name}`}
					className={`secondary-button min-h-[28px] h-7 px-2 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
						c.obturationType === "temp_caoh2"
							? "bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-xs border border-amber-500/40"
							: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
					}`}
				>Ca(OH)2</button>
			</div>
		</div>
	);
};
