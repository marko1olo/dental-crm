/**
 * PerioKeypadNumButtons.tsx — Цифровой блок 1–12 мм и переключатели маркеров воспаления (BOP, PLQ, PUS).
 * Архитектурный слой Layer 4: UI Subcomponent (Мандат 8b, <= 120 строк).
 */

import type { PerioSiteMeasurement } from "@dental/shared";
import { Droplets } from "lucide-react";
import React from "react";

export interface PerioKeypadNumButtonsProps {
	readonly readOnly?: boolean | undefined;
	readonly currentSite: PerioSiteMeasurement | null;
	readonly onKeypadDepth: (depth: number) => void;
	readonly onToggleBop: () => void;
	readonly onTogglePlaque: () => void;
	readonly onToggleSuppuration: () => void;
	readonly onPrevSite: () => void;
	readonly onNextSite: () => void;
}

const DEPTH_BUTTONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export const PerioKeypadNumButtons: React.FC<PerioKeypadNumButtonsProps> = React.memo(({
	readOnly = false,
	currentSite,
	onKeypadDepth,
	onToggleBop,
	onTogglePlaque,
	onToggleSuppuration,
	onPrevSite,
	onNextSite,
}) => {
	return (
		<div className="flex items-center gap-1 flex-wrap">
			<span className="text-[11px] font-bold text-[var(--muted)] mr-1 hidden sm:inline">NumPad (1–12 мм):</span>
			{DEPTH_BUTTONS.map((numVal) => {
				const isNorm = numVal <= 3;
				const isBorderline = numVal === 4;
				return (
					<button
						key={numVal}
						type="button"
						disabled={readOnly}
						onClick={() => onKeypadDepth(numVal)}
						className={`min-w-[44px] min-h-[44px] sm:min-w-[34px] sm:min-h-0 sm:h-9 rounded-lg font-black text-xs sm:text-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center border ${
							isNorm
								? "bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
								: isBorderline
									? "bg-amber-500/20 hover:bg-amber-500/35 text-amber-800 dark:text-amber-300 border-amber-500/40"
									: "bg-red-600/25 hover:bg-red-600/40 text-red-800 dark:text-red-200 border-red-500/50 shadow-xs ring-1 ring-red-500/30 font-black"
						}`}
						title={`Глубина ${numVal} мм (хоткей: ${numVal <= 9 ? numVal : numVal === 10 ? "0" : `Shift+${numVal - 10}`})`}
						data-testid={`perio-keypad-depth-${numVal}`}
					>
						{numVal}
					</button>
				);
			})}

			<div className="h-6 w-[1px] bg-[var(--line)] mx-1 hidden sm:block" />

			{/* BOP Toggle */}
			<button
				type="button" disabled={readOnly} onClick={onToggleBop}
				className={`min-h-[44px] min-w-[44px] sm:min-h-0 sm:h-9 px-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer border ${
					currentSite?.bleedingOnProbing ? "bg-rose-500 text-white border-rose-400 shadow-xs" : "bg-[var(--paper)] hover:bg-rose-500/20 text-rose-300 border-[var(--line)]"
				}`}
				title="Кровоточивость BOP (хоткей: B)"
			>
				<Droplets size={14} />
				<span>BOP</span>
			</button>

			{/* PLQ Toggle */}
			<button
				type="button" disabled={readOnly} onClick={onTogglePlaque}
				className={`min-h-[44px] min-w-[44px] sm:min-h-0 sm:h-9 px-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer border ${
					currentSite?.plaque ? "bg-amber-500 text-slate-950 font-black border-amber-400 shadow-xs" : "bg-[var(--paper)] hover:bg-amber-500/20 text-amber-300 border-[var(--line)]"
				}`}
				title="Зубной налет PLQ (хоткей: P)"
			>
				<span>PLQ</span>
			</button>

			{/* PUS Toggle */}
			<button
				type="button" disabled={readOnly} onClick={onToggleSuppuration}
				className={`min-h-[44px] min-w-[44px] sm:min-h-0 sm:h-9 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer border ${
					currentSite?.suppuration ? "bg-indigo-500 text-white border-indigo-400 shadow-xs" : "bg-[var(--paper)] hover:bg-indigo-500/20 text-indigo-300 border-[var(--line)]"
				}`}
				title="Нагноение PUS (хоткей: S)"
			>
				<span>PUS</span>
			</button>

			<div className="h-6 w-[1px] bg-[var(--line)] mx-1 hidden sm:block" />

			{/* Prev / Next */}
			<button
				type="button" onClick={onPrevSite}
				className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:w-8 sm:h-9 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] font-bold text-xs flex items-center justify-center cursor-pointer"
				title="Предыдущая точка (Стрелка влево)"
			>
				&larr;
			</button>
			<button
				type="button" onClick={onNextSite}
				className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:w-8 sm:h-9 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-teal-300 border border-[var(--line)] font-bold text-xs flex items-center justify-center cursor-pointer"
				title="Следующая точка (Стрелка вправо)"
			>
				&rarr;
			</button>
		</div>
	);
});

PerioKeypadNumButtons.displayName = "PerioKeypadNumButtons";
