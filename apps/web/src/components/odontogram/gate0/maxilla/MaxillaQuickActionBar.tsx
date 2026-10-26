/**
 * DENTE Dental CRM — Maxilla Tooth Quick Action Bar
 * Doctor autonomy: 1-click status assignment without modal obstruction (Mandate 8e, 8b <= 120 lines).
 */

import type React from "react";
import type { Tooth46LayerFlags } from "../tooth46Types";

export interface MaxillaQuickActionBarProps {
	readonly selectedTooth: number;
	readonly layers: Tooth46LayerFlags;
	readonly onToggleCaries: () => void;
	readonly onSetHealthy: () => void;
	readonly onToggleCrown: () => void;
	readonly onToggleImplant: () => void;
	readonly onToggleMissing: () => void;
}

export const MaxillaQuickActionBar: React.FC<MaxillaQuickActionBarProps> = ({
	selectedTooth,
	layers,
	onToggleCaries,
	onSetHealthy,
	onToggleCrown,
	onToggleImplant,
	onToggleMissing,
}) => {
	const isHealthy = !layers.caries && !layers.crown && !layers.implant && !layers.missing && !layers.composite;
	const statusLabel = isHealthy ? "Норма / Интактный" : layers.caries ? "Кариес" : layers.crown ? "Коронка" : layers.implant ? "Имплантат" : "Патология";

	return (
		<div className="w-full max-w-2xl flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-2xl border border-current/10 bg-slate-100/70 dark:bg-slate-800/60 text-xs">
			<div className="flex items-center gap-2">
				<span className="font-bold text-teal-600 dark:text-teal-400 font-mono text-sm">Верхний зуб {selectedTooth}</span>
				<span className="text-[11px] opacity-70">{statusLabel}</span>
			</div>

			<div className="flex items-center gap-1.5 flex-wrap">
				<button
					type="button"
					onClick={onSetHealthy}
					data-testid="maxilla-btn-healthy"
					className={`h-8 px-2.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 ${
						isHealthy ? "bg-emerald-600 text-white shadow-xs" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
					}`}
				>
					<span>✓</span><span>Норма</span>
				</button>

				<button
					type="button"
					onClick={onToggleCaries}
					data-testid="maxilla-btn-caries"
					className={`h-8 px-2.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 ${
						layers.caries ? "bg-amber-600 text-white shadow-xs dark:bg-amber-500" : "bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
					}`}
				>
					<span>⚡</span><span>Кариес</span>
				</button>

				<button
					type="button"
					onClick={onToggleCrown}
					data-testid="maxilla-btn-crown"
					className={`h-8 px-2.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 ${
						layers.crown ? "bg-sky-600 text-white shadow-xs" : "bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20"
					}`}
				>
					<span>👑</span><span>Коронка</span>
				</button>

				<button
					type="button"
					onClick={onToggleImplant}
					data-testid="maxilla-btn-implant"
					className={`h-8 px-2.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 ${
						layers.implant ? "bg-purple-600 text-white shadow-xs" : "bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20"
					}`}
				>
					<span>🔩</span><span>Имплант</span>
				</button>

				<button
					type="button"
					onClick={onToggleMissing}
					data-testid="maxilla-btn-missing"
					className={`h-8 px-2.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 ${
						layers.missing ? "bg-rose-600 text-white shadow-xs" : "bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20"
					}`}
				>
					<span>✕</span><span>Удален</span>
				</button>
			</div>
		</div>
	);
};
