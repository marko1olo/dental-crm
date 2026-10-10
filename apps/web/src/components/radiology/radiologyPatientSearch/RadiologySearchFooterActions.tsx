/**
 * RadiologySearchFooterActions.tsx — Layer 4: Нижний подвал модального окна фильтра снимков
 * Индикатор применённого фильтра, счётчик найденных снимков, сброс и подтверждение.
 */

import React from "react";
import { Check, Filter, RotateCcw } from "lucide-react";
import {
	DATE_FILTER_TABS,
	TACTILE_DATES,
	type TactileDatePreset,
} from "./types";

export interface RadiologySearchFooterActionsProps {
	readonly datePreset: TactileDatePreset;
	readonly matchedCount?: number | undefined;
	readonly totalStudiesCount?: number | undefined;
	readonly onResetFilters: () => void;
	readonly onClose: () => void;
	readonly onApply: () => void;
}

export const RadiologySearchFooterActions: React.FC<RadiologySearchFooterActionsProps> = ({
	datePreset,
	matchedCount,
	totalStudiesCount,
	onResetFilters,
	onClose,
	onApply,
}) => {
	const activePresetLabel =
		DATE_FILTER_TABS.find((d) => d.id === datePreset)?.label ||
		TACTILE_DATES.find((d) => d.id === datePreset)?.label;

	return (
		<div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-50 dark:bg-[#080e1b] border-t border-slate-200 dark:border-slate-800 shrink-0 text-xs">
			<div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
				<Filter className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
				<span>
					Фильтр:{" "}
					<strong className="text-slate-900 dark:text-white">
						{activePresetLabel}
					</strong>
				</span>
				{typeof matchedCount === "number" && (
					<span className="ml-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-500/30">
						Найдено: {matchedCount}
						{typeof totalStudiesCount === "number" && ` из ${totalStudiesCount}`}
					</span>
				)}
			</div>

			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onResetFilters}
					className="h-8 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
					data-testid="btn-reset-tactile-filters"
				>
					<RotateCcw className="w-3 h-3" />
					<span>Сброс</span>
				</button>

				<button
					type="button"
					onClick={onClose}
					className="h-8 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 transition-colors cursor-pointer"
				>
					Отмена
				</button>

				<button
					type="button"
					onClick={onApply}
					className="h-8 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold inline-flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
					data-testid="btn-apply-tactile-search"
				>
					<Check className="w-3.5 h-3.5 stroke-[2.5]" />
					<span>Применить</span>
				</button>
			</div>
		</div>
	);
};
