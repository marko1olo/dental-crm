import React from "react";
import type { Dashboard } from "@dental/shared";
import { ScheduleMobileAgendaView } from "../mobile/ScheduleMobileAgendaView";
import { useScheduleStore } from "../../../store/scheduleStore";
import type { ChairScheduleViewProps } from "../ChairScheduleTypes";
import type { useChairScheduleState } from "../useChairScheduleState";

export interface ChairScheduleMobileBranchProps {
  props: ChairScheduleViewProps;
  state: ReturnType<typeof useChairScheduleState>;
  dashboard: Dashboard;
  dateKey?: string | undefined;
  appointments?: any[] | undefined;
  selectedDoctorId?: string | null | undefined;
  onAppointmentClick?: ((appt: any) => void) | undefined;
  onAppointmentMove?: ((id: string, updates: any) => void) | undefined;
  onQuickStatusChange?: ((id: string, status: any) => void) | undefined;
}

export function ChairScheduleMobileBranch({
  props,
  state,
  dashboard,
  dateKey,
  appointments,
  selectedDoctorId,
  onAppointmentClick,
  onAppointmentMove,
  onQuickStatusChange,
}: ChairScheduleMobileBranchProps) {
  const todayDateKey = dateKey || new Date().toISOString().slice(0, 10);

  return (
    <ScheduleMobileAgendaView
      dashboard={dashboard}
      dateKey={todayDateKey}
      appointments={appointments ?? dashboard?.appointments ?? []}
      onDateChange={(newDateKey) => {
        useScheduleStore.getState().setScheduleDateFilter(newDateKey);
      }}
      onSlotClick={state.handleSlotClick}
      onAppointmentClick={onAppointmentClick}
      onQuickStatusChange={onQuickStatusChange}
      onAppointmentMove={onAppointmentMove}
      patientName={state.resolvedPatientName}
      formatTime={state.resolvedFormatTime}
      toDateTimeLocalValue={state.resolvedToDateTimeLocalValue}
      appointmentLabels={state.resolvedAppointmentLabels}
      selectedChairId={state.effectiveSelectedChairId}
      onSelectChair={(id) => {
        if (id) {
          state.handleToggleChairFilter(id);
        } else {
          useScheduleStore.getState().setScheduleChairFilterId(null);
          if (props.onSelectChair) props.onSelectChair(null);
        }
      }}
      selectedDoctorId={selectedDoctorId}
      onSelectDoctor={(id) => {
        useScheduleStore.getState().setScheduleDoctorFilterId(id);
        if (props.onSelectDoctor) props.onSelectDoctor(id);
      }}
      onQuickBooking={() => {
        if (state.handleSlotClick) {
          state.handleSlotClick({
            dateKey: todayDateKey,
            chairId: state.effectiveSelectedChairId || null,
            doctorUserId: selectedDoctorId || null,
            durationMinutes: 30,
          });
        }
      }}
      timezone={(dashboard?.clinicSettings as any)?.timezone || "Europe/Moscow"}
    />
  );
}
