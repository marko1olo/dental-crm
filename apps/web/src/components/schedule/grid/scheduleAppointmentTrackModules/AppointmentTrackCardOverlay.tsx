import React from "react";
import { Clock, X } from "lucide-react";
import type { Appointment } from "@dental/shared";
import { GridAppointmentCard } from "../../GridAppointmentCard";
import type { ChairMaintenanceBlock } from "../../../../utils/scheduleCollisionUtils";
import type { ScheduleDensityMode } from "../../useScheduleState";
import type { ScheduleAppointmentTrackProps } from "./types";
import {
  calcMaintenanceDuration,
  getMaintenanceReasonLabel,
} from "./appointmentTrackUtils";

export function ChairMaintenanceCard({
  mBlock,
  chairId,
  onRemove,
}: {
  mBlock: ChairMaintenanceBlock;
  chairId: string;
  onRemove: (id: string) => void;
}) {
  const mReasonLabel = getMaintenanceReasonLabel(mBlock);
  const mDuration = calcMaintenanceDuration(mBlock);

  return (
    <div
      key={mBlock.id}
      className="w-full p-2 rounded-xl border border-amber-500/40 bg-amber-500/10 text-xs text-[var(--ink)] flex items-center justify-between"
      data-testid={`chair-maintenance-block-${chairId}`}
    >
      <div className="flex items-center gap-1.5 truncate min-w-0">
        <Clock
          size={12}
          className="text-amber-600 dark:text-amber-400 shrink-0"
        />
        <span className="truncate">
          {mReasonLabel} ({mDuration} мин)
        </span>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(mBlock.id);
        }}
        className="p-1 rounded-lg hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 cursor-pointer shrink-0"
        title="Удалить технический перерыв"
        aria-label="Удалить технический перерыв"
        data-testid={`btn-remove-maintenance-${chairId}`}
      >
        <X size={13} />
      </button>
    </div>
  );
}

export function TrackAppointmentCard({
  appointment,
  chair,
  isNearBottom,
  isNearRightEdge,
  effectiveDensityMode,
  props,
}: {
  appointment: Appointment;
  chair: any;
  isNearBottom: boolean;
  isNearRightEdge: boolean;
  effectiveDensityMode: ScheduleDensityMode;
  props: ScheduleAppointmentTrackProps;
}) {
  return (
    <GridAppointmentCard
      key={appointment.id}
      densityMode={effectiveDensityMode}
      appointment={appointment}
      chair={chair}
      effectiveChairs={props.effectiveChairs}
      doctors={props.doctors}
      patientLookupMap={props.patientLookupMap}
      staffLookupMap={props.staffLookupMap}
      collisionMap={props.collisionMap}
      patientNameFn={(pts, id) => props.patientName(pts, id)}
      getPatientName={(pts, id) => props.patientName(pts, id)}
      dashboard={props.dashboard}
      timezone={props.timezone}
      toDateTimeLocalValue={props.toDateTimeLocalValue}
      appointmentLabels={props.appointmentLabels}
      isHovered={props.hoveredApptId === appointment.id}
      isStatusPickerOpen={props.activeStatusPickerApptId === appointment.id}
      isMenuOpen={props.activeMenuApptId === appointment.id}
      isNearBottom={isNearBottom}
      isNearRightEdge={isNearRightEdge}
      onAppointmentClick={props.onAppointmentClick}
      onSelectMobileAppt={props.handleSelectMobileAppt}
      onQuickStatusChange={props.onQuickStatusChange}
      onAdjustDuration={props.handleAdjustAppointmentDuration}
      onShiftLateness={props.handleShiftAppointmentLateness}
      onReassignChair={props.handleReassignAppointmentChair}
      onReassignDoctor={props.handleReassignAppointmentDoctor}
      onFreeSlotToWaitlist={props.handleFreeSlotToWaitlist}
      onMouseEnter={props.handleAppointmentMouseEnter}
      onMouseLeave={props.handleAppointmentMouseLeave}
      onKeepHovered={props.handleKeepHovered}
      onToggleStatusPicker={props.handleToggleStatusPicker}
      onToggleMenu={props.handleToggleMenu}
      onCloseStatusPicker={props.handleCloseStatusPicker}
      onCloseMenu={props.handleCloseMenu}
    />
  );
}
