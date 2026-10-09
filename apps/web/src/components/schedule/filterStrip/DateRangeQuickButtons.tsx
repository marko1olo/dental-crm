import { ChevronLeft, ChevronRight } from "lucide-react";
import type React from "react";
import type { ReactElement } from "react";

export interface DateRangeQuickButtonsProps {
	currentDateIso: string;
	formattedCurrentDate: string;
	todayIso: string;
	stepScheduleDay: (delta: number) => void;
	setScheduleDateFilter: (date: string) => void;
}

export function DateRangeQuickButtons({
	currentDateIso,
	formattedCurrentDate,
	todayIso,
	stepScheduleDay,
	setScheduleDateFilter,
}: DateRangeQuickButtonsProps): ReactElement {
	return (
		<div className="schedule-date-picker-group flex items-center gap-1 shrink-0 !border-r-0 !border-none !pr-0 !mr-0">
			<button
				type="button"
				className="secondary-button schedule-day-step-prev h-8 min-h-[32px] w-8 min-w-[38px] sm:min-w-[32px] inline-flex items-center justify-center cursor-pointer rounded-lg font-medium border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] hover:text-[var(--teal,var(--brand-primary))] transition-all p-0 shrink-0"
				onClick={() => stepScheduleDay(-1)}
				aria-label="Показать предыдущий день"
				title="День назад"
			>
				<ChevronLeft size={16} aria-hidden="true" />
			</button>
			<input
				type="date"
				aria-label="Фильтр расписания по дате"
				value={currentDateIso}
				onChange={(event) => setScheduleDateFilter(event.target.value)}
				placeholder={formattedCurrentDate}
				title={`Выбранная дата: ${formattedCurrentDate}`}
				className="schedule-date-input h-8 min-h-[32px] px-2 text-[13px] font-medium rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] outline-none cursor-pointer hover:border-[var(--teal,var(--brand-primary))] transition-all w-[86px] min-w-[86px] sm:w-[104px] sm:min-w-[104px] text-center tracking-tight"
			/>
			<button
				type="button"
				className="secondary-button schedule-day-step-next h-8 min-h-[32px] w-8 min-w-[38px] sm:min-w-[32px] inline-flex items-center justify-center cursor-pointer rounded-lg font-medium border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] hover:text-[var(--teal,var(--brand-primary))] transition-all p-0 shrink-0"
				onClick={() => stepScheduleDay(1)}
				aria-label="Показать следующий день"
				title="День вперёд"
			>
				<ChevronRight size={16} aria-hidden="true" />
			</button>
			<button
				type="button"
				onClick={() => setScheduleDateFilter(todayIso)}
				className={`h-8 min-h-[32px] px-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
					currentDateIso === todayIso
						? "bg-[var(--teal)]/15 text-[var(--teal)] border-[var(--teal)]/40 font-bold"
						: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal)] hover:text-[var(--teal)]"
				}`}
				title="Перейти на сегодняшнюю дату"
				data-testid="schedule-date-today-btn"
			>
				Сегодня
			</button>
		</div>
	);
}
