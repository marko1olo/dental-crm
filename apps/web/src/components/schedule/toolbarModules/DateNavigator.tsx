import React from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

export interface DateNavigatorProps {
	formattedCurrentDate: string;
	currentDateIso: string;
	todayIso: string;
	isToday: boolean;
	onStepDay: (delta: number) => void;
	onSetDate: (dateIso: string) => void;
}

export function DateNavigator({
	formattedCurrentDate,
	currentDateIso,
	todayIso,
	isToday,
	onStepDay,
	onSetDate,
}: DateNavigatorProps) {
	return (
		<div className="schedule-toolbar-island-nav flex items-center gap-1 shrink-0">
			<span
				className="font-bold text-[13px] sm:text-sm text-[var(--ink)] tracking-tight shrink-0 hidden sm:inline-flex items-center gap-1 mr-0.5"
				data-testid="schedule-toolbar-title"
			>
				Расписание
			</span>

			<div className="schedule-date-picker-group flex items-center gap-1 shrink-0">
				<button
					type="button"
					className="secondary-button schedule-day-step-prev h-8 min-h-[32px] sm:h-9 sm:min-h-[36px] w-8 min-w-[38px] sm:min-w-[36px] sm:w-9 inline-flex items-center justify-center cursor-pointer rounded-lg font-medium border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper)] transition-all p-0 shrink-0"
					onClick={() => onStepDay(-1)}
					aria-label="Показать предыдущий день"
					title="День назад"
				>
					<ChevronLeft size={16} aria-hidden="true" />
				</button>

				<div className="relative inline-flex items-center w-[86px] min-w-[86px] sm:w-[104px] sm:min-w-[104px]">
					<div
						className="schedule-date-display w-full h-8 min-h-[32px] sm:h-9 sm:min-h-[36px] px-2 text-[12.5px] font-medium rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper)] transition-all flex items-center justify-center gap-1 select-none pointer-events-none"
						aria-hidden="true"
					>
						<Calendar size={13} className="text-[var(--muted,#64748b)] shrink-0" />
						<span className="font-semibold tracking-tight">{formattedCurrentDate}</span>
					</div>
					<input
						type="date"
						aria-label="Фильтр расписания по дате"
						value={currentDateIso}
						onChange={(e) => onSetDate(e.target.value)}
						title={`Выбранная дата: ${formattedCurrentDate}`}
						className="schedule-date-input absolute inset-0 w-[86px] min-w-[86px] sm:w-[104px] sm:min-w-[104px] h-full opacity-0 cursor-pointer"
					/>
				</div>

				<button
					type="button"
					className="secondary-button schedule-day-step-next h-8 min-h-[32px] sm:h-9 sm:min-h-[36px] w-8 min-w-[38px] sm:min-w-[36px] sm:w-9 inline-flex items-center justify-center cursor-pointer rounded-lg font-medium border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper)] transition-all p-0 shrink-0"
					onClick={() => onStepDay(1)}
					aria-label="Показать следующий день"
					title="День вперёд"
				>
					<ChevronRight size={16} aria-hidden="true" />
				</button>

				<button
					type="button"
					onClick={() => onSetDate(todayIso)}
					className={`secondary-button h-8 min-h-[32px] sm:h-9 sm:min-h-[36px] px-2.5 rounded-lg text-xs font-semibold border border-[var(--line)] transition-all cursor-pointer whitespace-nowrap shrink-0 ${
						isToday
							? "bg-[var(--paper)] text-[var(--ink)] font-bold shadow-2xs"
							: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]"
					}`}
					title="Перейти на сегодняшнюю дату"
					data-testid="schedule-date-today-btn"
				>
					Сегодня
				</button>
			</div>
		</div>
	);
}
