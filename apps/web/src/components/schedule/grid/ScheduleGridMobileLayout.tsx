import React from "react";
import { ScheduleMobileAgendaView } from "../ScheduleMobileAgendaView";
import type { ScheduleGridProps } from "./gridTypes";

export interface ScheduleGridMobileLayoutProps {
  props: ScheduleGridProps;
  patientName: (patients: any, id: string | null) => string;
  timezone: string;
}

export function ScheduleGridMobileLayout({ props, patientName, timezone }: ScheduleGridMobileLayoutProps) {
  const {
    dashboard,
    dateKey,
    appointments = [],
    onSlotClick,
    onAppointmentClick,
    onQuickStatusChange,
    formatTime,
    toDateTimeLocalValue = (iso: string) => (iso ? iso.slice(0, 16) : ""),
    appointmentLabels,
    selectedChairId,
    selectedDoctorId,
    onAppointmentMove,
  } = props;

  if (!dashboard) return null;

  return (
    <ScheduleMobileAgendaView
      dashboard={dashboard}
      dateKey={dateKey}
      appointments={appointments}
      onDateChange={(newDateKey) => {
        window.dispatchEvent(new CustomEvent("dente:schedule-date-change", { detail: newDateKey }));
      }}
      onSlotClick={onSlotClick}
      onAppointmentClick={onAppointmentClick}
      onQuickStatusChange={onQuickStatusChange}
      onAppointmentMove={onAppointmentMove ? (id: string, updates: any) => onAppointmentMove(id, updates) : undefined}
      patientName={patientName}
      formatTime={formatTime}
      toDateTimeLocalValue={toDateTimeLocalValue}
      appointmentLabels={appointmentLabels}
      selectedChairId={selectedChairId}
      selectedDoctorId={selectedDoctorId}
      chairDoctorAssignments={props.chairDoctorAssignments}
      timezone={timezone}
    />
  );
}
