import { Globe } from "lucide-react";
import React from "react";
import type { ReactElement } from "react";
import { CabinetFilterBar } from "./CabinetFilterBar";
import { StatusFilterToggleGroup } from "./StatusFilterToggleGroup";
import type { CabinetFilterBarProps } from "./CabinetFilterBar";
import type { ShiftQueueCounts } from "./types";

export interface ScheduleToolbarCenterIslandProps extends CabinetFilterBarProps {
	scheduleStatusFilter?: string | null | undefined;
	setScheduleStatusFilter?: ((status: string | null) => void) | undefined;
	queueCounts?: ShiftQueueCounts | undefined;
	activeScheduleFilterCount: number;
	resetScheduleFilters: () => void;
	pendingOnlineBookingsCount?: number | undefined;
	onOpenPendingOnlineBookings?: (() => void) | undefined;
}

export function ScheduleToolbarCenterIsland(props: ScheduleToolbarCenterIslandProps): ReactElement {
	const {
		scheduleStatusFilter,
		setScheduleStatusFilter,
		queueCounts,
		activeScheduleFilterCount,
		resetScheduleFilters,
		pendingOnlineBookingsCount = 0,
		onOpenPendingOnlineBookings,
	} = props;

	return (
		<div className="schedule-toolbar-island-center flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 overflow-hidden px-1">
			<StatusFilterToggleGroup
				scheduleStatusFilter={scheduleStatusFilter ?? null}
				setScheduleStatusFilter={setScheduleStatusFilter ?? (() => {})}
				queueCounts={queueCounts}
				activeScheduleFilterCount={activeScheduleFilterCount}
				resetScheduleFilters={resetScheduleFilters}
			/>

			{/* Online Bookings Badge (1-Click Pending Approvals) */}
			{onOpenPendingOnlineBookings && (
				<button
					type="button"
					onClick={onOpenPendingOnlineBookings}
					className={`secondary-button schedule-pending-online-badge h-7 min-h-[26px] max-h-7 sm:h-9 sm:min-h-[36px] sm:max-h-9 px-2 rounded-lg border border-[var(--line)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 shadow-2xs ${
						(pendingOnlineBookingsCount ?? 0) > 0
							? "bg-cyan-500/15 border-cyan-500/50 text-cyan-950 dark:text-cyan-100 hover:bg-cyan-500/25"
							: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)]"
					}`}
					data-testid="schedule-pending-online-bookings-badge"
					title={`Входящие онлайн-заявки: ${pendingOnlineBookingsCount ?? 0}. Нажмите для просмотра и подтверждения.`}
					aria-label={`Входящие онлайн-заявки: ${pendingOnlineBookingsCount ?? 0}`}
				>
					<Globe
						size={13}
						className={(pendingOnlineBookingsCount ?? 0) > 0 ? "text-cyan-600 dark:text-cyan-400 shrink-0" : "shrink-0 opacity-70"}
						aria-hidden="true"
					/>
					<span className="hidden xl:inline">Онлайн-заявки:</span>
					<span
						className={`px-1.5 py-0.2 rounded-full text-[11px] font-extrabold ${
							(pendingOnlineBookingsCount ?? 0) > 0
								? "bg-cyan-600 text-white"
								: "bg-[var(--line)] text-[var(--muted)]"
						}`}
					>
						{pendingOnlineBookingsCount ?? 0}
					</span>
				</button>
			)}

			<CabinetFilterBar {...props} />
		</div>
	);
}
