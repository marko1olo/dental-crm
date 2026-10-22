import React from "react";
import { CheckCheck, Trash2 } from "lucide-react";
import type { QuickCanalState } from "./types";
import { QuickBarCanalChips } from "./QuickBarCanalChips";

export interface QuickBarCanalRowProps {
	readonly canal: QuickCanalState;
	readonly totalCanals: number;
	readonly onUpdateCanal: (id: string, updates: Partial<QuickCanalState>) => void;
	readonly onAdjustLength: (id: string, delta: number) => void;
	readonly onToggleObliterated: (id: string) => void;
	readonly onRemoveCanal: (id: string) => void;
}

export const QuickBarCanalRow: React.FC<QuickBarCanalRowProps> = ({
	canal: c,
	totalCanals,
	onUpdateCanal,
	onAdjustLength,
	onToggleObliterated,
	onRemoveCanal,
}) => {
	return (
		<div
			className="pt-2.5 first:pt-0 flex flex-col md:flex-row md:items-center justify-between gap-2.5"
			data-testid={`endo-canal-row-${c.name}`}
		>
			{/* Имя канала и апекс-статус */}
			<div className="flex items-center gap-2 shrink-0 min-w-[120px]">
				<span className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 font-black text-xs font-mono flex items-center justify-center shrink-0">
					{c.name}
				</span>
				<div className="flex flex-col">
					<div className="flex items-center gap-1.5">
						<span className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-white leading-tight">
							Канал {c.name}
						</span>
						<button
							type="button"
							onClick={() => onToggleObliterated(c.id)}
							data-testid={`chip-obliterated-${c.name}`}
							className={`secondary-button px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
								c.isObliterated
									? "bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/50"
									: "text-[var(--muted,#64748b)] hover:text-amber-700 dark:hover:text-amber-300 border border-transparent"
							}`}
							title="Отметить канал как облитерированный"
						>
							{c.isObliterated ? "Облитерирован" : "Облитерация?"}
						</button>
					</div>
					<span className={`text-[10px] font-mono font-bold flex items-center gap-0.5 ${c.isObliterated ? "text-amber-600 dark:text-amber-400" : "text-[var(--teal,#0d9488)]"}`}>
						<CheckCheck size={11} />
						{c.isObliterated ? "Облитерирован (0 мм)" : `Apex 0.0 (${c.workingLengthMm.toFixed(1)} мм)`}
					</span>
				</div>
			</div>

			{/* Параметры канала (длина, MAF, обтурация) */}
			<div className="flex items-center gap-2 flex-wrap">
				{c.isObliterated ? (
					<div className="flex items-center gap-1.5 py-0.5">
						<span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-500/40">
							0 мм (Склероз)
						</span>
						<button
							type="button"
							onClick={() => onToggleObliterated(c.id)}
							className="secondary-button text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
						>
							Снять
						</button>
					</div>
				) : (
					<QuickBarCanalChips
						canal={c}
						onUpdate={onUpdateCanal}
						onAdjustLength={onAdjustLength}
					/>
				)}

				{totalCanals > 1 && (
					<button
						type="button"
						onClick={() => onRemoveCanal(c.id)}
						className="icon-button secondary-button w-7 h-7 rounded-lg text-[var(--muted,#64748b)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-colors cursor-pointer shrink-0"
						title="Удалить канал"
					>
						<Trash2 size={13} />
					</button>
				)}
			</div>
		</div>
	);
};
