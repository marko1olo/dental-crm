import React from "react";
import { Clock } from "lucide-react";
import type { WeekdayOption } from "./clinicChairsTypes";

interface ClinicChairDaysBarProps {
	chairId: string;
	chairName: string;
	workingDays: number[];
	typedWeekdayOptions: WeekdayOption[];
	setChairPresetDays: (chairId: string, days: number[]) => void;
	applyChairHoursToAll: (chairId: string) => void;
	toggleChairWorkingDay: (chairId: string, dayValue: number) => void;
}

export const ClinicChairDaysBar: React.FC<ClinicChairDaysBarProps> = ({
	chairId,
	chairName,
	workingDays,
	typedWeekdayOptions,
	setChairPresetDays,
	applyChairHoursToAll,
	toggleChairWorkingDay,
}) => {
	return (
		<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-[var(--line)]">
			<div className="flex items-center gap-1 flex-wrap">
				<span className="text-[11px] text-[var(--muted)] font-semibold">Дни:</span>
				<button
					type="button"
					className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-[var(--paper-soft)] border border-[var(--line)] hover:bg-[var(--line)] text-[var(--ink)] cursor-pointer inline-flex items-center"
					onClick={() => setChairPresetDays(chairId, [1, 2, 3, 4, 5])}
				>
					Пн–Пт
				</button>
				<button
					type="button"
					className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-[var(--paper-soft)] border border-[var(--line)] hover:bg-[var(--line)] text-[var(--ink)] cursor-pointer inline-flex items-center"
					onClick={() => setChairPresetDays(chairId, [1, 2, 3, 4, 5, 6])}
				>
					Пн–Сб
				</button>
				<button
					type="button"
					className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-[var(--paper-soft)] border border-[var(--line)] hover:bg-[var(--line)] text-[var(--ink)] cursor-pointer inline-flex items-center"
					onClick={() => setChairPresetDays(chairId, [1, 2, 3, 4, 5, 6, 7])}
				>
					Все дни
				</button>
				<button
					type="button"
					className="h-8 px-2.5 rounded-lg text-xs font-semibold text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/30 cursor-pointer inline-flex items-center gap-1"
					onClick={() => applyChairHoursToAll(chairId)}
					title="Скопировать часы кресла ко всем выбранным дням"
				>
					<Clock size={12} />
					Часы ко всем дням
				</button>
			</div>

			<fieldset
				className="flex items-center gap-1"
				style={{ border: "none", padding: 0, margin: 0 }}
				aria-label={`Рабочие дни кресла: ${chairName}`}
			>
				{typedWeekdayOptions.map((day) => {
					const isWorking = workingDays.includes(day.value);
					return (
						<button
							className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${isWorking ? "bg-teal-600 text-white border-teal-600" : "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:border-slate-400"}`}
							key={day.value}
							type="button"
							aria-pressed={isWorking}
							onClick={() => toggleChairWorkingDay(chairId, day.value)}
						>
							{day.label}
						</button>
					);
				})}
			</fieldset>
		</div>
	);
};
