import { Users } from "lucide-react";
import React from "react";
import type { ReactElement } from "react";
import { StatusFilterQueueButtons } from "./StatusFilterQueueButtons";
import type { ShiftQueueCounts } from "./types";

export interface StatusFilterToggleGroupProps {
	scheduleStatusFilter?: string | null | undefined;
	setScheduleStatusFilter?: ((status: string | null) => void) | undefined;
	queueCounts?: ShiftQueueCounts | undefined;
	activeScheduleFilterCount?: number | undefined;
	resetScheduleFilters?: (() => void) | undefined;
}

export function StatusFilterToggleGroup({
	scheduleStatusFilter,
	setScheduleStatusFilter,
	queueCounts,
	activeScheduleFilterCount = 0,
	resetScheduleFilters,
}: StatusFilterToggleGroupProps): ReactElement {
	const isAllActive =
		(!scheduleStatusFilter || scheduleStatusFilter === "all") &&
		activeScheduleFilterCount === 0;

	return (
		<div
			className="schedule-day-queue-segmented-tabs dente-segmented-bar flex items-center p-0.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] shrink-0 gap-0.5 select-none h-8 min-h-[32px] max-h-8 sm:h-9 sm:min-h-[36px] sm:max-h-9"
			data-testid="schedule-day-queue-tabs"
			role="group"
			aria-label="Оперативная очередь смены"
		>
			{/* 1. Все записи дня */}
			<button
				type="button"
				data-testid="schedule-status-filter-all"
				className={`dente-segmented-item schedule-queue-tab-all ${
					isAllActive
						? "active font-semibold bg-[var(--paper)] text-[var(--ink)] shadow-2xs border border-[var(--line)]"
						: "border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50"
				} h-7 min-h-[26px] max-h-7 sm:h-8 sm:min-h-[32px] sm:max-h-8 shrink-0 px-2 text-[12px] font-medium cursor-pointer rounded-md inline-flex items-center gap-1.5 select-none whitespace-nowrap transition-all`}
				onClick={() => {
					resetScheduleFilters?.();
					if (setScheduleStatusFilter) {
						setScheduleStatusFilter("all");
					}
				}}
				title="Все записи смены"
				aria-label="Фильтр: Все записи"
				aria-pressed={isAllActive}
			>
				<Users size={13} className="shrink-0 text-teal-600 dark:text-teal-400" />
				<span className="hidden 2xl:inline whitespace-nowrap shrink-0">Все записи</span>
				<span className="2xl:hidden whitespace-nowrap shrink-0">Все</span>
				{queueCounts?.all !== undefined && (
					<span
						data-testid="schedule-queue-count-all"
						className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
							isAllActive
								? "bg-[var(--teal)]/20 text-[var(--teal-dark,var(--teal))] dark:text-teal-200"
								: "bg-[var(--line)]/60 text-[var(--muted)]"
						}`}
					>
						{queueCounts.all}
					</span>
				)}
			</button>

			<StatusFilterQueueButtons
				scheduleStatusFilter={scheduleStatusFilter}
				setScheduleStatusFilter={setScheduleStatusFilter}
				queueCounts={queueCounts}
			/>
		</div>
	);
}
