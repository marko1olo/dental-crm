/**
 * MobilePerioKeypadButtons.tsx — Мобильные сенсорные кнопки ввода глубины (1–10+ мм) и маркеров.
 * Архитектурный слой Layer 4: UI Subcomponent (Мандат 8b, <= 120 строк).
 */

import { AlertCircle, Droplets } from "lucide-react";
import React from "react";
import { triggerHaptic } from "../../../native/mobileBridge";

export interface MobilePerioKeypadButtonsProps {
	readonly readOnly?: boolean | undefined;
	readonly currentBop: boolean;
	readonly currentPlq: boolean;
	readonly currentPus: boolean;
	readonly onDepthTap: (depth: number) => void;
	readonly onToggleBop: () => void;
	readonly onTogglePlaque: () => void;
	readonly onToggleSuppuration: () => void;
}

const DEPTH_TILES = [
	{ val: 1, label: "1 мм", sub: "Норма", cls: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30" },
	{ val: 2, label: "2 мм", sub: "Норма", cls: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30" },
	{ val: 3, label: "3 мм", sub: "Норма", cls: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30" },
	{ val: 4, label: "4 мм", sub: "Карман", cls: "bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40" },
	{ val: 5, label: "5 мм", sub: "Карман", cls: "bg-orange-500/20 text-orange-800 dark:text-orange-300 border-orange-500/40 font-bold" },
	{ val: 6, label: "6 мм", sub: "Глубокий", cls: "bg-rose-500/20 text-rose-800 dark:text-rose-200 border-rose-500/40 font-bold" },
	{ val: 7, label: "7 мм", sub: "Глубокий", cls: "bg-rose-600/25 text-rose-900 dark:text-rose-200 border-rose-500/50 font-bold" },
	{ val: 8, label: "8 мм", sub: "Тяжелый", cls: "bg-red-600/25 text-red-900 dark:text-red-200 border-red-500/50 font-black" },
	{ val: 9, label: "9 мм", sub: "Тяжелый", cls: "bg-red-700/30 text-red-900 dark:text-red-200 border-red-600/50 font-black" },
	{ val: 10, label: "10+ мм", sub: "Крит.", cls: "bg-red-800/35 text-red-950 dark:text-red-100 border-red-700/60 font-black ring-1 ring-red-500/40" },
] as const;

export const MobilePerioKeypadButtons: React.FC<MobilePerioKeypadButtonsProps> = React.memo(({
	readOnly = false, currentBop, currentPlq, currentPus,
	onDepthTap, onToggleBop, onTogglePlaque, onToggleSuppuration,
}) => {
	return (
		<>
			{/* Быстрый ввод глубины кармана: 1–10+ мм (Apple HIG >= 44x44px) */}
			<div className="grid grid-cols-5 gap-1.5 w-full">
				{DEPTH_TILES.map((item) => (
					<button
						key={item.val} type="button" aria-disabled={readOnly} onClick={() => !readOnly && onDepthTap(item.val)}
						className={`min-h-[48px] h-12 rounded-xl flex flex-col items-center justify-center border transition-all active:scale-95 cursor-pointer touch-manipulation shadow-xs ${item.cls}`}
						data-testid={`perio-keypad-depth-${item.val}`}
						title={`Глубина ${item.label} (${item.sub})`}
					>
						<span className="text-sm font-black leading-none">{item.label}</span>
						<span className="text-[10px] opacity-75">{item.sub}</span>
					</button>
				))}
			</div>

			{/* Маркеры: Кровоточивость (BOP), Нагноение (PUS), Налёт (PLQ) */}
			<div className="grid grid-cols-3 gap-1.5 w-full">
				<button
					type="button" aria-disabled={readOnly}
					onClick={() => { if (readOnly) return; triggerHaptic("impact"); onToggleBop(); }}
					className={`min-h-[44px] h-11 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer border shadow-xs whitespace-nowrap ${
						currentBop
							? "bg-rose-600 text-white border-rose-400 font-black shadow-sm"
							: "bg-[var(--paper-soft)] text-rose-600 dark:text-rose-300 border-rose-500/40 hover:bg-rose-500/15"
					}`}
					data-testid="perio-mobile-bop-btn"
				>
					<Droplets size={16} className={`shrink-0 ${currentBop ? "text-white" : "text-rose-500"}`} />
					<span className="truncate">{currentBop ? "BOP: Да" : "Кровь (BOP)"}</span>
				</button>

				<button
					type="button" aria-disabled={readOnly}
					onClick={() => { if (readOnly) return; triggerHaptic("impact"); onToggleSuppuration(); }}
					className={`min-h-[44px] h-11 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer border shadow-xs whitespace-nowrap ${
						currentPus
							? "bg-indigo-600 text-white border-indigo-400 font-black shadow-sm"
							: "bg-[var(--paper-soft)] text-indigo-600 dark:text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/15"
					}`}
					data-testid="perio-mobile-pus-btn"
				>
					<AlertCircle size={16} className={`shrink-0 ${currentPus ? "text-white" : "text-indigo-500"}`} />
					<span className="truncate">{currentPus ? "Гной: Есть" : "Гной"}</span>
				</button>

				<button
					type="button" aria-disabled={readOnly}
					onClick={() => { if (readOnly) return; triggerHaptic("selection"); onTogglePlaque(); }}
					className={`min-h-[44px] h-11 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer border shadow-xs whitespace-nowrap ${
						currentPlq
							? "bg-amber-500 text-slate-950 font-black border-amber-500 shadow-sm"
							: "bg-[var(--paper-soft)] text-amber-700 dark:text-amber-300 border-amber-500/40 hover:bg-amber-500/15"
					}`}
					data-testid="perio-mobile-plaque-btn"
				>
					<span className="truncate">{currentPlq ? "Налёт: Есть" : "Зубной налёт"}</span>
				</button>
			</div>
		</>
	);
});
MobilePerioKeypadButtons.displayName = "MobilePerioKeypadButtons";
