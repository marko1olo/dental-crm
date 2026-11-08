import type { Appointment } from "@dental/shared";
import {
	LayoutGrid,
	ListFilter,
} from "lucide-react";
import React, { memo, useState } from "react";
import { useScheduleStore } from "../../../store/scheduleStore";
import "../scheduleMobileAgenda.css";
import { ScheduleMobileDrawerContainer } from "./ScheduleMobileDrawerContainer";
import {
	extractToothBadge,
	type ScheduleMobileAgendaViewProps,
} from "./scheduleMobileAgendaTypes";
import { ScheduleMobileMonthNav } from "./ScheduleMobileMonthNav";
import { ScheduleMobileWeekStrip } from "./ScheduleMobileWeekStrip";
import { ScheduleMobileFilterChips } from "./ScheduleMobileFilterChips";
import { ScheduleMobileTimeline } from "./ScheduleMobileTimeline";
import { ScheduleMobileGridMode } from "./ScheduleMobileGridMode";
import { ScheduleMobileBottomBar } from "./ScheduleMobileBottomBar";
import { useScheduleMobileAgendaState } from "./useScheduleMobileAgendaState";

export { extractToothBadge, ScheduleMobileBottomBar };
export type { ScheduleMobileAgendaViewProps };

/**
 * ScheduleMobileAgendaView — Canonical SSOT for Mobile Schedule Agenda (Mandate 8b, Apple HIG).
 * Dedicated vertical timeline with 7-day Apple calendar strip, horizontal filter chips,
 * 44x44px touch targets, floating bottom action bar, and strictly 0px horizontal drift.
 */
export const ScheduleMobileAgendaView: React.FC<ScheduleMobileAgendaViewProps> =
	memo(function ScheduleMobileAgendaView(props) {
		const {
			onDateChange,
			onSlotClick,
			selectedChairId = null,
			onSelectChair,
			selectedDoctorId = null,
			onSelectDoctor,
			onQuickBooking,
		} = props;

		const state = useScheduleMobileAgendaState(props);
		const [viewMode, setViewMode] = useState<"agenda" | "grid">("agenda");
		const {
			selectedMobileAppt,
			setSelectedMobileAppt,
			todayKey,
			tomorrowKey,
			effectiveDateKey,
			weekDays,
			monthHeaderTitle,
			handleShiftWeek,
			handleShiftDay,
			doctors,
			chairs,
			timelineItems,
		} = state;

		const handleCreateBooking = () => {
			if (onSlotClick) {
				onSlotClick({
					dateKey: effectiveDateKey,
					doctorUserId: selectedDoctorId || null,
					chairId: selectedChairId || null,
					durationMinutes: 30,
				});
			} else if (onQuickBooking) {
				onQuickBooking();
			}
		};

		return (
			<div
				className="schedule-mobile-agenda w-full max-w-[100vw] overflow-x-clip min-h-screen bg-[var(--paper-soft)] pb-36 select-none"
				data-testid="schedule-mobile-agenda-view"
				role="region"
				aria-label="Расписание: мобильная повестка дня (Agenda View)"
				style={{ maxWidth: "100vw", overflowX: "clip" }}
			>
				{/* 1. Month Navigation Bar */}
				<ScheduleMobileMonthNav
					monthHeaderTitle={monthHeaderTitle}
					isDifferentFromToday={effectiveDateKey !== todayKey}
					onTodayClick={() => onDateChange(todayKey)}
					onShiftWeek={handleShiftWeek}
				/>

				{/* 1.1 Apple HIG Segmented Controls: [ Сетка | Лента ] & [ Сегодня | Завтра | + День ] */}
				<div className="schedule-mobile-segmented-bar px-3 py-1.5 bg-[var(--paper)] border-b border-[var(--line-subtle)] flex flex-col items-center gap-1.5">
					<div
						className="flex w-full max-w-sm p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] gap-1 shadow-2xs"
						role="tablist"
						aria-label="Режим отображения"
					>
						<button
							type="button"
							role="tab"
							aria-selected={viewMode === "grid"}
							onClick={() => setViewMode("grid")}
							className={`flex-1 min-h-[44px] py-2 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
								viewMode === "grid"
									? "bg-[var(--teal,#0d9488)] text-white shadow-xs font-bold"
									: "bg-transparent text-[var(--ink)] hover:bg-[var(--paper)]"
							}`}
							data-testid="schedule-mobile-view-mode-grid"
						>
							<LayoutGrid size={15} className="shrink-0" />
							<span>Сетка</span>
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={viewMode === "agenda"}
							onClick={() => setViewMode("agenda")}
							className={`flex-1 min-h-[44px] py-2 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
								viewMode === "agenda"
									? "bg-[var(--teal,#0d9488)] text-white shadow-xs font-bold"
									: "bg-transparent text-[var(--ink)] hover:bg-[var(--paper)]"
							}`}
							data-testid="schedule-mobile-view-mode-agenda"
						>
							<ListFilter size={15} className="shrink-0" />
							<span>Лента</span>
						</button>
					</div>

					<div
						className="flex w-full max-w-sm p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] gap-1 shadow-2xs"
						role="group"
						aria-label="Быстрый выбор дня"
					>
						<button
							type="button"
							onClick={() => {
								useScheduleStore.getState().setScheduleDateFilter(todayKey);
								onDateChange(todayKey);
							}}
							className={`flex-1 min-h-[44px] py-2 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
								effectiveDateKey === todayKey
									? "bg-[var(--teal,#0d9488)] text-white shadow-xs font-bold"
									: "bg-transparent text-[var(--ink)] hover:bg-[var(--paper)]"
							}`}
							data-testid="schedule-mobile-segment-today"
						>
							Сегодня
						</button>
						<button
							type="button"
							onClick={() => {
								useScheduleStore.getState().setScheduleDateFilter(tomorrowKey);
								onDateChange(tomorrowKey);
							}}
							className={`flex-1 min-h-[44px] py-2 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
								effectiveDateKey === tomorrowKey
									? "bg-[var(--teal,#0d9488)] text-white shadow-xs font-bold"
									: "bg-transparent text-[var(--ink)] hover:bg-[var(--paper)]"
							}`}
							data-testid="schedule-mobile-segment-tomorrow"
						>
							Завтра
						</button>
						<button
							type="button"
							onClick={() => handleShiftDay(1)}
							className="flex-1 min-h-[44px] py-2 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer bg-transparent text-[var(--ink)] hover:bg-[var(--paper)] active:scale-95 flex items-center justify-center gap-1"
							data-testid="schedule-mobile-segment-plus-day"
							title="Сдвиг на +1 день вперед"
						>
							<span>+ День</span>
						</button>
					</div>
				</div>

				{/* 2. Apple iOS 7-Day Week Strip */}
				<ScheduleMobileWeekStrip
					weekDays={weekDays}
					onDateChange={(iso) => {
						useScheduleStore.getState().setScheduleDateFilter(iso);
						onDateChange(iso);
					}}
				/>

				{/* 3. Horizontal Filter Chips for Doctors and Chairs */}
				<ScheduleMobileFilterChips
					selectedDoctorId={selectedDoctorId}
					selectedChairId={selectedChairId}
					doctors={doctors}
					chairs={chairs}
					onSelectDoctor={onSelectDoctor}
					onSelectChair={onSelectChair}
				/>

				{/* 4. Display Area: Grid vs Agenda */}
				{viewMode === "grid" ? (
					<ScheduleMobileGridMode
						chairs={chairs}
						appointments={props.appointments}
						effectiveDateKey={effectiveDateKey}
						selectedDoctorId={selectedDoctorId}
						dashboard={props.dashboard}
						patientName={props.patientName}
						appointmentLabels={props.appointmentLabels}
						onSlotClick={onSlotClick}
						onQuickBooking={onQuickBooking}
						onSelectMobileAppt={setSelectedMobileAppt}
					/>
				) : (
					/* 4. Vertical Agenda Timeline List */
					<ScheduleMobileTimeline
						timelineItems={timelineItems}
						effectiveDateKey={effectiveDateKey}
						selectedDoctorId={selectedDoctorId}
						selectedChairId={selectedChairId}
						dashboard={props.dashboard as any}
						patientName={props.patientName}
						appointmentLabels={props.appointmentLabels}
						onSlotClick={onSlotClick}
						onSelectMobileAppt={setSelectedMobileAppt}
						onAddAppointment={handleCreateBooking}
						onQuickStatusChange={props.onQuickStatusChange}
						onOpenVisit={props.onOpenVisit}
					/>
				)}

				{/* 5. Apple HIG Sticky Floating Bottom Bar */}
				<ScheduleMobileBottomBar
					isVisible={!selectedMobileAppt}
					onAction={handleCreateBooking}
					label="Новая запись"
				/>

				{/* 6. Mobile Appointment Detail & Quick Booking Drawer Container */}
				<ScheduleMobileDrawerContainer props={props} state={state} />
			</div>
		);
	});
