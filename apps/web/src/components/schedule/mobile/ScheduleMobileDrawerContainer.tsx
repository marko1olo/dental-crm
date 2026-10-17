import React from "react";
import { ScheduleMobileBottomSheet } from "../grid/ScheduleMobileBottomSheet";
import type { ScheduleMobileAgendaViewProps } from "./scheduleMobileAgendaTypes";
import type { useScheduleMobileAgendaState } from "./useScheduleMobileAgendaState";

export interface ScheduleMobileDrawerContainerProps {
  props: ScheduleMobileAgendaViewProps;
  state: ReturnType<typeof useScheduleMobileAgendaState>;
}

export const ScheduleMobileDrawerContainer: React.FC<ScheduleMobileDrawerContainerProps> = ({
  props,
  state,
}) => {
  const {
    dashboard,
    patientName,
    timezone = "Europe/Moscow",
    toDateTimeLocalValue,
    appointmentLabels,
    onAppointmentClick,
    onQuickStatusChange,
  } = props;

  const {
    selectedMobileAppt,
    setSelectedMobileAppt,
    chairs,
    doctors,
    handleAdjustDuration,
    handleShiftLateness,
    handleReassignChair,
    handleReassignDoctor,
  } = state;

  return (
    <ScheduleMobileBottomSheet
      selectedMobileAppt={selectedMobileAppt}
      onClose={() => setSelectedMobileAppt(null)}
      patientName={patientName}
      dashboard={dashboard}
      timezone={timezone}
      toDateTimeLocalValue={toDateTimeLocalValue}
      appointmentLabels={appointmentLabels}
      effectiveChairs={chairs}
      doctors={doctors}
      onAppointmentClick={(appointment) => {
        setSelectedMobileAppt(null);
        if (onAppointmentClick) onAppointmentClick(appointment);
      }}
      onQuickStatusChange={(appointmentId, status) => {
        if (onQuickStatusChange) onQuickStatusChange(appointmentId, status);
        setSelectedMobileAppt(null);
      }}
      handleAdjustAppointmentDuration={handleAdjustDuration}
      handleShiftAppointmentLateness={handleShiftLateness}
      handleReassignAppointmentChair={handleReassignChair}
      handleReassignAppointmentDoctor={handleReassignDoctor}
      handleFreeSlotToWaitlist={(appt) => {
        if (onQuickStatusChange) {
          onQuickStatusChange(appt.id, "cancelled");
        } else if (props.onAppointmentMove) {
          props.onAppointmentMove(appt.id, { status: "cancelled" } as any);
        }
        setSelectedMobileAppt(null);
      }}
    />
  );
};
