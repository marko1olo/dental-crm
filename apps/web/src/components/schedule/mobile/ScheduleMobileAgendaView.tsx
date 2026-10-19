import React from "react";
import type { ScheduleMobileAgendaViewProps } from "./scheduleMobileAgendaTypes";
import { extractToothBadge } from "./scheduleMobileAgendaTypes";
import { ScheduleMobileMonthNav } from "./ScheduleMobileMonthNav";
import { ScheduleMobileWeekStrip } from "./ScheduleMobileWeekStrip";
import { ScheduleMobileFilterChips } from "./ScheduleMobileFilterChips";
import { ScheduleMobileTimeline } from "./ScheduleMobileTimeline";
import { ScheduleMobileBottomBar } from "./ScheduleMobileBottomBar";
import { ScheduleMobileDrawerContainer } from "./ScheduleMobileDrawerContainer";
import { useScheduleMobileAgendaState } from "./useScheduleMobileAgendaState";
import "../scheduleMobileAgenda.css";

export { extractToothBadge };
export type { ScheduleMobileAgendaViewProps };

export const ScheduleMobileAgendaView: React.FC<ScheduleMobileAgendaViewProps> = React.memo(
  function ScheduleMobileAgendaView(props) {
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
        className="schedule-mobile-agenda"
        data-testid="schedule-mobile-agenda-view"
        role="region"
        aria-label="Расписание: мобильная повестка дня (Agenda View)"
      >
        <ScheduleMobileMonthNav
          monthHeaderTitle={monthHeaderTitle}
          isDifferentFromToday={effectiveDateKey !== todayKey}
          onTodayClick={() => onDateChange(todayKey)}
          onShiftWeek={handleShiftWeek}
        />

        <ScheduleMobileWeekStrip weekDays={weekDays} onDateChange={onDateChange} />

        <ScheduleMobileFilterChips
          selectedDoctorId={selectedDoctorId}
          selectedChairId={selectedChairId}
          doctors={doctors}
          chairs={chairs}
          onSelectDoctor={onSelectDoctor}
          onSelectChair={onSelectChair}
        />

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

        <ScheduleMobileBottomBar
          isVisible={!selectedMobileAppt}
          onAction={handleCreateBooking}
        />

        <ScheduleMobileDrawerContainer
          props={props}
          state={state}
        />
      </div>
    );
  }
);
