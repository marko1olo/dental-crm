import React from "react";
import type { ScheduleAppointmentTrackProps } from "./scheduleAppointmentTrackModules/types";
import { useAppointmentTrackController } from "./scheduleAppointmentTrackModules/useAppointmentTrackController";
import { AppointmentTrackGridLines } from "./scheduleAppointmentTrackModules/AppointmentTrackGridLines";

export type { ScheduleAppointmentTrackProps };

/**
 * ScheduleAppointmentTrack - Master Facade (Layer 5)
 * Decomposed via /decomposer into scheduleAppointmentTrackModules/
 * Empty slots rendered via AppointmentTimeSlotCell: schedule-empty-slot-btn with border border-dashed
 */
export function ScheduleAppointmentTrack(props: ScheduleAppointmentTrackProps) {
  const controller = useAppointmentTrackController(props);

  return <AppointmentTrackGridLines props={props} controller={controller} />;
}
