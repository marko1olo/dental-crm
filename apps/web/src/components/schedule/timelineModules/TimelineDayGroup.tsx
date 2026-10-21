import type { Appointment } from "@dental/shared";
import { AlertTriangle } from "lucide-react";
import React, { Fragment } from "react";
import { formatMinutesForHumans } from "../scheduleDayGrouping";
import { TimelineAppointmentRow } from "./TimelineAppointmentRow";
import { TimelineGapRow } from "./TimelineGapRow";
import type { TimelineDayGroupProps } from "./TimelineTypes";

export const TimelineDayGroup = React.memo(function TimelineDayGroup(props: TimelineDayGroupProps) {
	const { group, rowLimit, onRowLimitIncrease, onRowLimitShowAll, onEmptySlotClick, dashboard, toDateTimeLocalValue } = props;
	const allRows = group?.rows ?? [];
	const visibleRows = allRows.slice(0, rowLimit);
	const hasMoreRows = allRows.length > rowLimit;

	return (
		<Fragment key={group.dateKey}>
			<div className="schedule-day-heading flex flex-wrap items-baseline gap-2 my-4 pt-1 pb-1.5 border-b border-[var(--line)]" data-testid="schedule-day-heading">
				<strong className="text-sm font-bold text-[var(--ink)] capitalize">{group.title}</strong>
				{group.relativeLabel && (
					<span className={`status-pill ${group.relation === "today" ? "status-confirmed" : "status-planned"}`}>
						{group.relativeLabel}
					</span>
				)}
				<span className="text-xs text-[var(--muted)]">
					записей: {group.appointmentCount} · занято {formatMinutesForHumans(group.bookedMinutes)}
					{group.freeGapMinutes > 0 ? ` · свободно ${formatMinutesForHumans(group.freeGapMinutes)}` : ""}
				</span>
			</div>

			{visibleRows.map((row) => {
				if (row.kind === "gap") {
					const tz = dashboard?.clinicSettings?.profile?.timezone;
					const gapStart = row.startsAt ? toDateTimeLocalValue(row.startsAt, tz).slice(11, 16) : null;
					const gapEnd = row.endsAt ? toDateTimeLocalValue(row.endsAt, tz).slice(11, 16) : null;
					return (
						<TimelineGapRow
							key={`gap-${group.dateKey}-${row.afterAppointmentId ?? "start"}-${row.minutes}`}
							dateKey={group.dateKey}
							row={row}
							gapStartLabel={gapStart}
							gapEndLabel={gapEnd}
							onEmptySlotClick={onEmptySlotClick}
						/>
					);
				}

				if (row.kind === "overlap") {
					const overlapReason = row.sameDoctor && row.sameChair ? "один врач и одно кресло" : row.sameDoctor ? "один и тот же врач" : row.sameChair ? "одно и то же кресло" : row.sameAssistant ? "один и тот же ассистент" : "один и тот же пациент";
					return (
						<div
							key={`overlap-${group.dateKey}-${row.withAppointmentId}`}
							className="schedule-day-overlap my-2 ml-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-2"
							data-testid="schedule-day-overlap"
							role="alert"
						>
							<AlertTriangle size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
							<span>Две записи на одно время ({overlapReason}), пересечение {formatMinutesForHumans(row.minutes)}. Кого-то придётся перенести.</span>
						</div>
					);
				}

				return (
					<TimelineAppointmentRow
						key={(row.appointment as Appointment).id}
						appointment={row.appointment as Appointment}
						{...props}
					/>
				);
			})}

			{hasMoreRows && (
				<div className="schedule-day-more my-2 ml-3 p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-between text-xs text-[var(--muted)]">
					<span>Показано {visibleRows.length} из {allRows.length} записей и окон</span>
					<div className="flex items-center gap-2">
						<button type="button" className="secondary-button min-h-[32px] px-2.5 text-xs font-semibold rounded-lg cursor-pointer" onClick={onRowLimitIncrease}>
							Загрузить ещё 30
						</button>
						<button type="button" className="secondary-button min-h-[32px] px-2.5 text-xs font-semibold rounded-lg cursor-pointer" onClick={onRowLimitShowAll}>
							Все ({allRows.length})
						</button>
					</div>
				</div>
			)}
		</Fragment>
	);
});
