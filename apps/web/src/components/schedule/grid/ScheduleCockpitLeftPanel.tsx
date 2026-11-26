import React from "react";
import type { Appointment, UrgentScheduleRequest } from "@dental/shared";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { ScheduleMiniMonthCalendar } from "../inspector/ScheduleMiniMonthCalendar";
import { UrgentScheduleRequestsWidget } from "../UrgentScheduleRequestsWidget";

export interface ScheduleCockpitLeftPanelProps {
	isOpen: boolean;
	onToggleOpen: () => void;
	dateKey: string;
	onDateChange: (date: string) => void;
	appointments: readonly Appointment[];
	toDateTimeLocalValue?: ((iso: string, tz?: string) => string) | undefined;
	timezone?: string | undefined;
	onBookUrgentRequest: (request: UrgentScheduleRequest) => void;
}

export function ScheduleCockpitLeftPanel({
	isOpen,
	onToggleOpen,
	dateKey,
	onDateChange,
	appointments,
	toDateTimeLocalValue,
	timezone,
	onBookUrgentRequest,
}: ScheduleCockpitLeftPanelProps) {
	if (!isOpen) {
		return (
			<aside
				className="hidden lg:flex w-10 shrink-0 flex-col items-center py-2.5 gap-2 rounded-2xl border border-[var(--line)] bg-[var(--paper)] shadow-xs"
				data-testid="schedule-cockpit-collapsed-rail"
				aria-label="Свёрнутая панель обзора"
			>
				<button
					type="button"
					onClick={onToggleOpen}
					className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
					title="Развернуть панель обзора"
					aria-label="Развернуть панель обзора"
					data-testid="schedule-cockpit-toggle-btn"
				>
					<PanelLeftOpen className="w-4 h-4 shrink-0" aria-hidden="true" />
				</button>
			</aside>
		);
	}

	return (
		<aside
			className="hidden lg:flex w-[304px] xl:w-[320px] shrink-0 flex-col gap-2.5 overflow-y-auto pr-0.5"
			style={{ maxHeight: "calc(100vh - 156px)" }}
			data-testid="schedule-cockpit-left-panel"
			aria-label="Панель обзора расписания"
		>
			<div className="flex items-center justify-between px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-xs shrink-0">
				<span className="text-xs font-semibold text-[var(--ink)] truncate">
					Навигация и обращения
				</span>
				<button
					type="button"
					onClick={onToggleOpen}
					className="h-7 w-7 rounded-md flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer shrink-0"
					title="Свернуть панель обзора"
					aria-label="Свернуть панель обзора"
					data-testid="schedule-cockpit-toggle-btn"
				>
					<PanelLeftClose className="w-4 h-4 shrink-0" aria-hidden="true" />
				</button>
			</div>

			<ScheduleMiniMonthCalendar
				selectedDate={dateKey}
				onSelectDate={onDateChange}
				appointments={appointments}
				toDateTimeLocalValue={toDateTimeLocalValue}
				timezone={timezone}
				showClinicLoad={true}
			/>

			<UrgentScheduleRequestsWidget onBookUrgentRequest={onBookUrgentRequest} />
		</aside>
	);
}
