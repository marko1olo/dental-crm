import { Plus } from "lucide-react";

interface TimelineEmptyStateProps {
	onNewAppointmentClick?: (() => void) | undefined;
	activeScheduleFilterCount?: number | undefined;
	resetScheduleFilters?: (() => void) | undefined;
	stepScheduleDay?: ((delta: number) => void) | undefined;
	setScheduleDateFilter?: ((date: string) => void) | undefined;
	todayScheduleDate?: (() => string) | undefined;
	clinicToday?: string | undefined;
}

export function TimelineEmptyState({
	onNewAppointmentClick,
	activeScheduleFilterCount,
	resetScheduleFilters,
	setScheduleDateFilter,
	todayScheduleDate,
	clinicToday,
}: TimelineEmptyStateProps) {
	return (
		<div className="rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-8 text-center text-sm shadow-sm space-y-4 max-w-lg mx-auto my-8">
			<div className="space-y-1">
				<h3 className="font-bold text-base text-[var(--ink)]">
					Записей пока нет ни одной
				</h3>
				<p className="text-xs text-[var(--muted)]">
					{activeScheduleFilterCount && activeScheduleFilterCount > 0
						? "Попробуйте сбросить фильтры или переключить дату"
						: "Создайте новую запись или перейдите на другой день"}
				</p>
			</div>

			<div className="flex flex-wrap items-center justify-center gap-2 pt-2">
				{onNewAppointmentClick && (
					<button
						type="button"
						onClick={onNewAppointmentClick}
						className="h-9 px-3.5 rounded-lg text-sm font-medium gap-2 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-sm inline-flex items-center justify-center cursor-pointer"
					>
						<Plus className="w-4 h-4" />
						<span>Новая запись</span>
					</button>
				)}
				{activeScheduleFilterCount &&
					activeScheduleFilterCount > 0 &&
					resetScheduleFilters && (
						<button
							type="button"
							onClick={resetScheduleFilters}
							className="h-9 px-3.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-sm font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-all cursor-pointer inline-flex items-center justify-center"
						>
							Сбросить фильтры
						</button>
					)}
				{todayScheduleDate && setScheduleDateFilter && (
					<button
						type="button"
						onClick={() => setScheduleDateFilter(todayScheduleDate())}
						className="h-9 px-3.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-sm font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-all cursor-pointer inline-flex items-center justify-center"
					>
						Сегодня ({clinicToday || "текущий день"})
					</button>
				)}
			</div>
		</div>
	);
}
