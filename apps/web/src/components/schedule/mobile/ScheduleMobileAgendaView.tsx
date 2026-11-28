import type { Appointment } from "@dental/shared";
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
			effectiveDateKey,
			weekDays,
			monthHeaderTitle,
			handleShiftWeek,
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
				className="schedule-mobile-agenda w-full max-w-[100vw] overflow-x-clip min-h-screen bg-[var(--paper-soft)] pb-40 select-none"
				data-testid="schedule-mobile-agenda-view"
				role="region"
				aria-label="Расписание: мобильная повестка дня (Agenda View)"
				style={{ maxWidth: "100vw", overflowX: "clip" }}
			>
				{/* 1. Compact Header Bar: Month Nav + [ Лента | Сетка ] */}
				<ScheduleMobileMonthNav
					monthHeaderTitle={monthHeaderTitle}
					isDifferentFromToday={effectiveDateKey !== todayKey}
					viewMode={viewMode}
					onViewModeChange={setViewMode}
					onTodayClick={() => onDateChange(todayKey)}
					onShiftWeek={handleShiftWeek}
				/>

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
					isSoloDoctor={
						props.dashboard?.clinicSettings?.profile?.mode === "solo_doctor" ||
						props.dashboard?.clinicSettings?.profile?.mode === "one_chair"
					}
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
						dashboard={props.dashboard}
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
