import type React from "react";
import type { ReactElement } from "react";
import { Users, UserCheck, CalendarCheck, CheckCircle2 } from "lucide-react";
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
			className="schedule-day-queue-segmented-tabs dente-segmented-bar flex items-center p-0.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] shrink-0 gap-0.5 select-none h-8 min-h-[32px] max-h-8"
			data-testid="schedule-day-queue-tabs"
			data-queue-group="stomx-4-stage"
			role="group"
			aria-label="Оперативная очередь смены"
		>
			{/* 1. Все записи дня */}
			<button
				type="button"
				data-testid="schedule-status-filter-all"
				className={`dente-segmented-item schedule-queue-tab-all ${isAllActive ? "active font-semibold bg-[var(--paper)] text-[var(--ink)] shadow-2xs border border-[var(--line)]/60" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50"} h-7 min-h-[26px] max-h-7 shrink-0 px-2 text-[12px] font-medium cursor-pointer rounded-md inline-flex items-center gap-1.5 select-none whitespace-nowrap transition-all`}
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

			{/* 2. В холле клиники */}
			<button
				type="button"
				data-testid="schedule-status-filter-arrived"
				className={`dente-segmented-item schedule-queue-tab-arrived ${
					scheduleStatusFilter === "arrived"
						? "active font-semibold bg-[var(--paper)] text-[var(--ink)] shadow-2xs border border-[var(--line)]/60"
						: "border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50"
				} h-7 min-h-[26px] max-h-7 shrink-0 px-2 text-[12px] font-medium cursor-pointer rounded-md inline-flex items-center gap-1.5 select-none whitespace-nowrap transition-all`}
				onClick={() => {
					if (setScheduleStatusFilter) {
						setScheduleStatusFilter(
							scheduleStatusFilter === "arrived" ? "all" : "arrived",
						);
					}
				}}
				title="Очередь смены: В холле (пациент ожидает в холле клиники)"
				aria-label="Фильтр: В холле"
				aria-pressed={scheduleStatusFilter === "arrived"}
			>
				<UserCheck size={13} className="shrink-0 text-amber-500" />
				<span className="hidden 2xl:inline whitespace-nowrap shrink-0">В холле клиники</span>
				<span className="2xl:hidden whitespace-nowrap shrink-0">В холле</span>
				{queueCounts?.arrived !== undefined && (
					<span
						data-testid="schedule-queue-count-arrived"
						className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
							scheduleStatusFilter === "arrived"
								? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
								: "bg-[var(--line)]/60 text-[var(--muted)]"
						}`}
					>
						{queueCounts.arrived}
					</span>
				)}
			</button>

			{/* 3. На приёме */}
			<button
				type="button"
				data-testid="schedule-status-filter-in-treatment"
				className={`dente-segmented-item schedule-queue-tab-in-treatment ${
					scheduleStatusFilter === "in_treatment"
						? "active font-semibold bg-[var(--paper)] text-[var(--ink)] shadow-2xs border border-[var(--line)]/60"
						: "border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50"
				} h-7 min-h-[26px] max-h-7 shrink-0 px-2 text-[12px] font-medium cursor-pointer rounded-md inline-flex items-center gap-1.5 select-none whitespace-nowrap transition-all`}
				onClick={() => {
					if (setScheduleStatusFilter) {
						setScheduleStatusFilter(
							scheduleStatusFilter === "in_treatment" ? "all" : "in_treatment",
						);
					}
				}}
				title="Очередь смены: На приёме (в кресле прямо сейчас)"
				aria-label="Фильтр: На приёме"
				aria-pressed={scheduleStatusFilter === "in_treatment"}
			>
				<CalendarCheck size={13} className="shrink-0 text-[var(--teal)]" />
				<span className="hidden 2xl:inline whitespace-nowrap shrink-0">На приёме</span>
				<span className="2xl:hidden whitespace-nowrap shrink-0">Приём</span>
				{queueCounts?.inTreatment !== undefined && (
					<span
						data-testid="schedule-queue-count-in-treatment"
						className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
							scheduleStatusFilter === "in_treatment"
								? "bg-[var(--teal)]/20 text-[var(--teal-dark,var(--teal))] dark:text-teal-200"
								: "bg-[var(--line)]/60 text-[var(--muted)]"
						}`}
					>
						{queueCounts.inTreatment}
					</span>
				)}
			</button>

			{/* 4. Ожидает оплаты */}
			<button
				type="button"
				data-testid="schedule-status-filter-completed"
				className={`dente-segmented-item schedule-queue-tab-completed ${
					scheduleStatusFilter === "completed"
						? "active font-semibold bg-[var(--paper)] text-[var(--ink)] shadow-2xs border border-[var(--line)]/60"
						: "border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50"
				} h-7 min-h-[26px] max-h-7 shrink-0 px-2 text-[12px] font-medium cursor-pointer rounded-md inline-flex items-center gap-1.5 select-none whitespace-nowrap transition-all`}
				onClick={() => {
					if (setScheduleStatusFilter) {
						setScheduleStatusFilter(
							scheduleStatusFilter === "completed" ? "all" : "completed",
						);
					}
				}}
				title="Очередь смены: Ожидает оплаты (приём завершён, готов к оплате на кассе)"
				aria-label="Фильтр: Ожидает оплаты"
				aria-pressed={scheduleStatusFilter === "completed"}
			>
				<CheckCircle2 size={13} className="shrink-0 text-slate-500" />
				<span className="hidden 2xl:inline whitespace-nowrap shrink-0">Ожидает оплаты</span>
				<span className="2xl:hidden whitespace-nowrap shrink-0">Оплата</span>
				{queueCounts?.awaitingPayment !== undefined && (
					<span
						data-testid="schedule-queue-count-completed"
						className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
							scheduleStatusFilter === "completed"
								? "bg-slate-500/20 text-slate-800 dark:text-slate-200"
								: "bg-[var(--line)]/60 text-[var(--muted)]"
						}`}
					>
						{queueCounts.awaitingPayment}
					</span>
				)}
			</button>
		</div>
	);
}
