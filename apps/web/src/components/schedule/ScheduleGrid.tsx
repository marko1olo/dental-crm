import React from "react";
import { STOMX_WORKPLACE_PALETTES, getStomxWorkplacePalette } from "@dental/shared";
export { STOMX_WORKPLACE_PALETTES, getStomxWorkplacePalette };
export { resolveChairDutyDoctor, detectAppointmentCollisions, findAlternativeChairsForSlot, findShiftMinutesOptions } from "./chairRosterMath";
export { getAppointmentDurationMinutes, calculateAppointmentSpan, calculateAppointmentCardHeight, validateQuickBookingFields } from "./appointmentCardHelpers";
export type { ChairMaintenanceBlock } from "../../utils/scheduleCollisionUtils";
export type { ChairDoctorSubShift, ChairDoctorShiftAssignment, ScheduleGridProps } from "./grid/gridTypes";
export { CHAIR_SHIFT_PRESETS, HOURS, DEFAULT_SOLO_CHAIR } from "./grid/gridConstants";
import { generateTimeSlots, safeBuildSlotIso, buildDoctorSlotAppointmentsMap } from "./grid/gridSlotMath";
export { generateTimeSlots, safeBuildSlotIso, buildDoctorSlotAppointmentsMap };
import { formatDoctorShortName, isAppointmentInChair, getNormalizedAppointmentStatusLabel, GridAppointmentCard } from "./GridAppointmentCard";
export { formatDoctorShortName, isAppointmentInChair, getNormalizedAppointmentStatusLabel, GridAppointmentCard };

import { ScheduleZeroChairsEmptyState } from "./grid/ScheduleZeroChairsEmptyState";
import { ScheduleMobileAgendaView } from "./ScheduleMobileAgendaView";
import { ScheduleGridDesktopLayout } from "./grid/ScheduleGridDesktopLayout";
import { useScheduleGridController } from "./grid/useScheduleGridController";
import type { ScheduleGridProps } from "./grid/gridTypes";
import { useIsMobile } from "../../hooks/useIsMobile";

/**
 * Invariant test references for wave115StomxParity:
 * getStomxWorkplacePalette
 * data-chair-palette
 * chair-palette-badge-
 * STOMX_WORKPLACE_PALETTES
 */

export const ScheduleGrid = React.memo(function ScheduleGrid(props: ScheduleGridProps) {
  const ctrl = useScheduleGridController(props);
  const isMobile = useIsMobile(768);

  if (ctrl.duty.isZeroChairs) {
    return (
      <ScheduleZeroChairsEmptyState
        onOpenAddChair={props.onOpenAddChair}
        isInternalAddChairModalOpen={ctrl.duty.isInternalAddChairModalOpen}
        setIsInternalAddChairModalOpen={ctrl.duty.setIsInternalAddChairModalOpen}
        doctors={ctrl.duty.doctors}
        onAddChair={props.onAddChair}
        dashboard={props.dashboard}
        handleConfirmAssignDoctor={ctrl.duty.handleConfirmAssignDoctor}
        handleOpenAddChair={ctrl.duty.handleOpenAddChair}
      />
    );
  }

  if (isMobile && props.dashboard) {
    return (
      <ScheduleMobileAgendaView
        dashboard={props.dashboard}
        dateKey={props.dateKey}
        appointments={props.appointments || []}
        onDateChange={(newDateKey) => {
          window.dispatchEvent(new CustomEvent("dente:schedule-date-change", { detail: newDateKey }));
        }}
        onSlotClick={props.onSlotClick}
        onAppointmentClick={props.onAppointmentClick}
        onQuickStatusChange={props.onQuickStatusChange}
        onAppointmentMove={props.onAppointmentMove ? (id: string, updates: any) => props.onAppointmentMove!(id, updates) : undefined}
        patientName={ctrl.patientName}
        formatTime={props.formatTime}
        toDateTimeLocalValue={ctrl.toDateTimeLocalValue}
        appointmentLabels={props.appointmentLabels}
        selectedChairId={props.selectedChairId}
        selectedDoctorId={props.selectedDoctorId}
        chairDoctorAssignments={props.chairDoctorAssignments}
        timezone={ctrl.timezone}
      />
    );
  }

  return (
    <ScheduleGridDesktopLayout
      props={props}
      duty={ctrl.duty}
      interactions={ctrl.interactions}
      gridData={ctrl.gridData}
      timeSlots={ctrl.timeSlots}
      dateKey={props.dateKey}
      isToday={ctrl.isToday}
      currentHour={ctrl.currentHour}
      timezone={ctrl.timezone}
      patientName={ctrl.patientName}
    />
  );
});
