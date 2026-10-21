import { Plus } from "lucide-react";

interface TimelineEmptyStateProps {
	onNewAppointmentClick?: () => void;
	activeScheduleFilterCount?: number;
	resetScheduleFilters?: () => void;
	stepScheduleDay?: (delta: number) => void;
	setScheduleDateFilter?: (date: string) => void;
	todayScheduleDate?: () => string;
	clinicToday?: string;
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
						className="min-h-[40px] px-4 rounded-xl bg-[var(--teal,#0d9488)] text-white text-xs font-bold shadow-md hover:brightness-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
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
							className="min-h-[40px] px-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-all cursor-pointer"
						>
							Сбросить фильтры
						</button>
					)}
				{todayScheduleDate && setScheduleDateFilter && (
					<button
						type="button"
						onClick={() => setScheduleDateFilter(todayScheduleDate())}
						className="min-h-[40px] px-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-all cursor-pointer"
					>
						Сегодня ({clinicToday || "текущий день"})
					</button>
				)}
			</div>
		</div>
	);
}
