import React from "react";
import { ChevronDown } from "lucide-react";
import type { InputChangeEvent, WeekdayOption } from "./clinicChairsTypes";

interface ClinicChairPerDayHoursProps {
	chairId: string;
	chairName: string;
	workingDays: number[];
	typedWeekdayOptions: WeekdayOption[];
	perDay?: Record<number, { start?: string; end?: string }>;
	defaultStart: string;
	defaultEnd: string;
	updateChairScheduleDay: (
		chairId: string,
		dayValue: number,
		patch: { start?: string; end?: string },
	) => void;
}

export const ClinicChairPerDayHours: React.FC<ClinicChairPerDayHoursProps> = ({
	chairId,
	chairName,
	workingDays,
	typedWeekdayOptions,
	perDay,
	defaultStart,
	defaultEnd,
	updateChairScheduleDay,
}) => {
	const activeDays = typedWeekdayOptions.filter((day) => workingDays.includes(day.value));

	return (
		<details className="settings-advanced-block pt-1">
			<summary className="settings-advanced-toggle cursor-pointer text-xs text-[var(--muted)] flex items-center gap-1 hover:text-[var(--ink)]">
				<ChevronDown size={13} className="shrink-0" />
				<span>Индивидуальные часы по отдельным дням недели</span>
			</summary>
			<section
				className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-2"
				aria-label={`Часы по дням кресла: ${chairName}`}
			>
				{activeDays.map((day) => {
					const dayHours = perDay?.[day.value];
					return (
						<div
							key={`chair-hours-${chairId}-${day.value}`}
							className="p-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between gap-1 text-xs"
						>
							<span className="font-bold text-[var(--ink)]">{day.label}</span>
							<div className="flex items-center gap-1">
								<input
									aria-label={`${day.label}, начало кресла`}
									type="time"
									value={dayHours?.start ?? defaultStart}
									onChange={(event: InputChangeEvent) =>
										updateChairScheduleDay(chairId, day.value, {
											start: event.target.value,
										})
									}
									className="px-1.5 py-0.5 rounded border border-[var(--line)] bg-[var(--paper)] text-xs"
								/>
								<span>–</span>
								<input
									aria-label={`${day.label}, конец кресла`}
									type="time"
									value={dayHours?.end ?? defaultEnd}
									onChange={(event: InputChangeEvent) =>
										updateChairScheduleDay(chairId, day.value, {
											end: event.target.value,
										})
									}
									className="px-1.5 py-0.5 rounded border border-[var(--line)] bg-[var(--paper)] text-xs"
								/>
							</div>
						</div>
					);
				})}
			</section>
		</details>
	);
};
