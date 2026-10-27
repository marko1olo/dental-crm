import type React from "react";

interface ScheduleOptionsQueueSectionProps {
	scheduleStatusFilter?: string | null | undefined;
	setScheduleStatusFilter?: ((status: string | null) => void) | undefined;
	setIsOptionsMenuOpen: (open: boolean) => void;
}

export const ScheduleOptionsQueueSection: React.FC<ScheduleOptionsQueueSectionProps> = ({
	scheduleStatusFilter,
	setScheduleStatusFilter,
	setIsOptionsMenuOpen,
}) => {
	if (!setScheduleStatusFilter) return null;

	const handleStatus = (status: string) => {
		setScheduleStatusFilter(status);
		setIsOptionsMenuOpen(false);
	};

	return (
		<div className="px-2 py-1.5 border-t border-[var(--line)] mt-1 pt-1.5">
			<div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1">
				Очередь смены
			</div>
			<div className="grid grid-cols-2 gap-1">
				<button
					type="button"
					onClick={() => handleStatus("all")}
					className={`px-2 py-1 rounded-md text-xs font-semibold text-left transition-colors ${
						!scheduleStatusFilter || scheduleStatusFilter === "all"
							? "bg-[var(--teal,var(--brand-primary))] text-white"
							: "bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--teal-soft)]"
					}`}
				>
					Все статусы
				</button>
				<button
					type="button"
					onClick={() => handleStatus("arrived")}
					className={`px-2 py-1 rounded-md text-xs font-semibold text-left transition-colors ${
						scheduleStatusFilter === "arrived"
							? "bg-amber-500 text-white"
							: "bg-amber-500/10 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20"
					}`}
				>
					Ожидает приёма
				</button>
				<button
					type="button"
					onClick={() => handleStatus("in_treatment")}
					className={`px-2 py-1 rounded-md text-xs font-semibold text-left transition-colors ${
						scheduleStatusFilter === "in_treatment"
							? "bg-[var(--teal,var(--brand-primary))] text-white"
							: "bg-[var(--teal-soft)] text-[var(--teal-dark)] hover:bg-[var(--teal-surface)]"
					}`}
				>
					На приёме
				</button>
				<button
					type="button"
					onClick={() => handleStatus("completed")}
					className={`px-2 py-1 rounded-md text-xs font-semibold text-left transition-colors ${
						scheduleStatusFilter === "completed"
							? "bg-slate-700 text-white"
							: "bg-slate-500/10 text-slate-700 dark:text-slate-300 hover:bg-slate-500/20"
					}`}
				>
					Ожидает оплаты
				</button>
			</div>
		</div>
	);
};
