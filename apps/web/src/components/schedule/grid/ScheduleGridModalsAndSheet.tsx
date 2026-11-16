import React from "react";
import type { Dashboard } from "@dental/shared";
import type { ScheduleGridProps } from "./gridTypes";
import type { useScheduleChairDuty } from "./useScheduleChairDuty";
import type { useScheduleAppointmentInteractions } from "./useScheduleAppointmentInteractions";
import { ScheduleMobileBottomSheet } from "./ScheduleMobileBottomSheet";
import { ScheduleGridModals } from "./ScheduleGridModals";

export interface ScheduleGridModalsAndSheetProps {
  props: ScheduleGridProps;
  duty: ReturnType<typeof useScheduleChairDuty>;
  interactions: ReturnType<typeof useScheduleAppointmentInteractions>;
  dateKey: string;
  timezone: string;
  patientName: (patients: Dashboard["patients"] | undefined, id: string | null) => string;
}

export function ScheduleGridModalsAndSheet({
  props,
  duty,
  interactions,
  dateKey,
  timezone,
  patientName,
}: ScheduleGridModalsAndSheetProps) {
  const { dashboard, onAppointmentClick, onQuickStatusChange, toDateTimeLocalValue, appointmentLabels } = props;

  return (
    <>
      <ScheduleMobileBottomSheet
        selectedMobileAppt={interactions.selectedMobileAppt}
        onClose={() => interactions.setSelectedMobileAppt(null)}
        patientName={patientName}
        dashboard={dashboard}
        timezone={timezone}
        toDateTimeLocalValue={toDateTimeLocalValue}
        appointmentLabels={appointmentLabels}
        effectiveChairs={duty.effectiveChairs}
        doctors={duty.doctors}
        onAppointmentClick={onAppointmentClick}
        onQuickStatusChange={onQuickStatusChange}
        handleAdjustAppointmentDuration={interactions.handleAdjustAppointmentDuration}
        handleShiftAppointmentLateness={interactions.handleShiftAppointmentLateness}
        handleReassignAppointmentChair={interactions.handleReassignAppointmentChair}
        handleReassignAppointmentDoctor={interactions.handleReassignAppointmentDoctor}
        handleFreeSlotToWaitlist={interactions.handleFreeSlotToWaitlist}
      />

      <ScheduleGridModals
        assigningChairId={duty.assigningChairId}
        setAssigningChairId={duty.setAssigningChairId}
        effectiveChairs={duty.effectiveChairs}
        doctors={duty.doctors}
        dateKey={dateKey}
        effectiveChairAssignments={duty.effectiveChairAssignments}
        handleConfirmAssignDoctor={duty.handleConfirmAssignDoctor}
        handleUnassignDoctor={duty.handleUnassignDoctor}
        onAddDoctor={props.onAddDoctor}
        isSoloDoctor={duty.isSoloDoctor}
        onOpenAddChair={props.onOpenAddChair}
        isInternalAddChairModalOpen={duty.isInternalAddChairModalOpen}
        setIsInternalAddChairModalOpen={duty.setIsInternalAddChairModalOpen}
        onAddChair={props.onAddChair}
        dashboard={dashboard}
        isQuickAddDoctorOpen={duty.isQuickAddDoctorOpen}
        setIsQuickAddDoctorOpen={duty.setIsQuickAddDoctorOpen}
        handleBindDoctorToChair={duty.handleBindDoctorToChair}
        waitlistDrawerSlot={interactions.waitlistDrawerSlot}
        setWaitlistDrawerSlot={interactions.setWaitlistDrawerSlot}
      />
    </>
  );
}
