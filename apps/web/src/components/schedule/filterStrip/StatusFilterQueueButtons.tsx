import { CalendarCheck, CheckCircle2, UserCheck } from "lucide-react";
import React from "react";
import type { ReactElement } from "react";
import type { ShiftQueueCounts } from "./types";

export interface StatusFilterQueueButtonsProps {
	scheduleStatusFilter?: string | null | undefined;
	setScheduleStatusFilter?: ((status: string | null) => void) | undefined;
	queueCounts?: ShiftQueueCounts | undefined;
}

const ITEM_BASE = "dente-segmented-item h-7 min-h-[26px] max-h-7 sm:h-8 sm:min-h-[32px] sm:max-h-8 shrink-0 px-2 text-[12px] font-medium cursor-pointer rounded-md inline-flex items-center gap-1.5 select-none whitespace-nowrap transition-all";
const ITEM_ACTIVE = "active font-semibold bg-[var(--paper)] text-[var(--ink)] shadow-2xs border border-[var(--line)]";
const ITEM_INACTIVE = "border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50";

export function StatusFilterQueueButtons({
	scheduleStatusFilter,
	setScheduleStatusFilter,
	queueCounts,
}: StatusFilterQueueButtonsProps): ReactElement {
	const isArrived = scheduleStatusFilter === "arrived";
	const isInTreatment = scheduleStatusFilter === "in_treatment" || scheduleStatusFilter === "in_chair" || scheduleStatusFilter === "in-treatment";
	const isCompleted = scheduleStatusFilter === "completed";
	const completedCount = queueCounts?.awaitingPayment ?? (queueCounts as { completed?: number })?.completed;

	return (
		<>
			{/* 2. Ожидает приёма */}
			<button
				type="button"
				data-testid="schedule-status-filter-arrived"
				className={`${ITEM_BASE} schedule-queue-tab-arrived ${isArrived ? ITEM_ACTIVE : ITEM_INACTIVE}`}
				onClick={() => setScheduleStatusFilter?.(isArrived ? "all" : "arrived")}
				title="Очередь смены: Ожидает приёма"
				aria-label="Фильтр: Ожидает приёма"
				aria-pressed={isArrived}
			>
				<UserCheck size={13} className="shrink-0 text-amber-500" />
				<span className="hidden 2xl:inline whitespace-nowrap shrink-0">Ожидает приёма</span>
				{queueCounts?.arrived !== undefined && (
					<span
						data-testid="schedule-queue-count-arrived"
						className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
							isArrived ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-[var(--line)]/60 text-[var(--muted)]"
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
				className={`${ITEM_BASE} schedule-queue-tab-in-chair ${isInTreatment ? ITEM_ACTIVE : ITEM_INACTIVE}`}
				onClick={() => setScheduleStatusFilter?.(isInTreatment ? "all" : "in_treatment")}
				title="Очередь смены: На приёме"
				aria-label="Фильтр: На приёме"
				aria-pressed={isInTreatment}
			>
				<CalendarCheck size={13} className="shrink-0 text-[var(--teal)]" />
				<span className="hidden 2xl:inline whitespace-nowrap shrink-0">На приёме</span>
				{queueCounts?.inTreatment !== undefined && (
					<span
						data-testid="schedule-queue-count-in-treatment"
						className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
							isInTreatment ? "bg-[var(--teal)]/20 text-[var(--teal-dark,var(--teal))] dark:text-teal-200" : "bg-[var(--line)]/60 text-[var(--muted)]"
						}`}
					>
						{queueCounts.inTreatment}
					</span>
				)}
			</button>

			{/* 4. Ожидает оплаты / Завершены */}
			<button
				type="button"
				data-testid="schedule-status-filter-completed"
				className={`${ITEM_BASE} schedule-queue-tab-completed ${isCompleted ? ITEM_ACTIVE : ITEM_INACTIVE}`}
				onClick={() => setScheduleStatusFilter?.(isCompleted ? "all" : "completed")}
				title="Очередь смены: Ожидает оплаты"
				aria-label="Фильтр: Ожидает оплаты"
				aria-pressed={isCompleted}
			>
				<CheckCircle2 size={13} className="shrink-0 text-[var(--muted)]" />
				<span className="hidden 2xl:inline whitespace-nowrap shrink-0">Ожидает оплаты</span>
				{completedCount !== undefined && (
					<span
						data-testid="schedule-queue-count-completed"
						className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
							isCompleted ? "bg-[var(--paper-soft)] text-[var(--ink)]" : "bg-[var(--line)]/60 text-[var(--muted)]"
						}`}
					>
						{completedCount}
					</span>
				)}
			</button>
		</>
	);
}
