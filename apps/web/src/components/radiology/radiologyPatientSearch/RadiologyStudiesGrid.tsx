/**
 * RadiologyStudiesGrid.tsx — Layer 4: Сетка временных фильтров, табов и исследований
 * Обеспечивает сегментированный выбор периода и кастомный интервал дат по стандарту DENTE.
 */

import React from "react";
import { Calendar, Clock } from "lucide-react";
import {
	DATE_FILTER_TABS,
	type TactileDatePreset,
} from "./types";

export interface RadiologyStudiesGridProps {
	readonly datePreset: TactileDatePreset;
	readonly onSelectDatePreset: (preset: TactileDatePreset) => void;
	readonly customDateFrom: string;
	readonly customDateTo: string;
	readonly onCustomDateFromChange: (val: string) => void;
	readonly onCustomDateToChange: (val: string) => void;
}

export const RadiologyStudiesGrid: React.FC<RadiologyStudiesGridProps> = ({
	datePreset,
	onSelectDatePreset,
	customDateFrom,
	customDateTo,
	onCustomDateFromChange,
	onCustomDateToChange,
}) => {
	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
					<Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
					Период снимков визиографа
				</span>
				<span className="text-[11px] text-slate-500 dark:text-slate-400">
					Быстрый выбор временного диапазона архива
				</span>
			</div>

			{/* Сегментированный переключатель 4 быстрых табов */}
			<div
				className="w-full grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80"
				role="radiogroup"
				aria-label="Быстрый фильтр по времени"
			>
				{DATE_FILTER_TABS.map((tab) => {
					const isSelected = datePreset === tab.id;
					return (
						<button
							key={tab.id}
							type="button"
							role="radio"
							aria-checked={isSelected}
							onClick={() => onSelectDatePreset(tab.id)}
							className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-lg transition-all cursor-pointer select-none border text-center ${
								isSelected
									? "bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 shadow-xs font-bold"
									: "bg-transparent text-slate-700 dark:text-slate-200 border-transparent hover:bg-white/60 dark:hover:bg-slate-700/50 font-semibold"
							}`}
							style={{ minHeight: "54px" }}
							data-testid={`tactile-date-${tab.id}`}
						>
							<span className="text-xs font-bold leading-normal">{tab.label}</span>
							<span
								className={`text-[10px] leading-normal mt-0.5 ${
									isSelected
										? "text-emerald-700 dark:text-emerald-300 font-semibold"
										: "text-slate-500 dark:text-slate-400 font-normal"
								}`}
							>
								{tab.subtitle}
							</span>
						</button>
					);
				})}
			</div>

			{/* Дополнительные быстрые чипы для совместимости */}
			<div className="dente-filter-chips pt-1">
				<span className="text-[11px] text-slate-500 dark:text-slate-400 mr-1">Быстро:</span>
				<button
					type="button"
					onClick={() => onSelectDatePreset("yesterday")}
					className={`dente-filter-chip ${datePreset === "yesterday" ? "active" : ""}`}
					data-testid="tactile-date-yesterday"
				>
					Вчера
				</button>
				<button
					type="button"
					onClick={() => onSelectDatePreset("3days")}
					className={`dente-filter-chip ${datePreset === "3days" ? "active" : ""}`}
					data-testid="tactile-date-3days"
				>
					3 дня
				</button>
				<button
					type="button"
					onClick={() => onSelectDatePreset("last_week")}
					className={`dente-filter-chip ${datePreset === "last_week" ? "active" : ""}`}
					data-testid="tactile-date-last_week"
				>
					7 дней
				</button>
			</div>

			{/* Календарный диапазон «С ... По ...» без перегруза */}
			{datePreset === "custom" && (
				<div
					className="mt-1 p-3 rounded-xl bg-slate-50 dark:bg-[#101b2f] border border-emerald-400/40 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-150"
					data-testid="tactile-custom-date-container"
				>
					<div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
						<Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
						<span>Произвольный диапазон дат архива:</span>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
								С даты (начало):
							</label>
							<input
								type="date"
								value={customDateFrom}
								onChange={(e) => onCustomDateFromChange(e.target.value)}
								className="w-full h-8 px-2.5 rounded-lg bg-white dark:bg-[#162238] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
								data-testid="input-custom-date-from"
							/>
						</div>
						<div>
							<label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
								По дату (конец):
							</label>
							<input
								type="date"
								value={customDateTo}
								onChange={(e) => onCustomDateToChange(e.target.value)}
								className="w-full h-8 px-2.5 rounded-lg bg-white dark:bg-[#162238] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
								data-testid="input-custom-date-to"
							/>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
