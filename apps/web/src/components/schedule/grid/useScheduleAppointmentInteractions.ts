/**
 * useScheduleAppointmentInteractions.ts — Composed facade hook for schedule appointment interactions.
 */

import {
  type UseScheduleAppointmentInteractionsProps,
  useGridDisplaySettings,
  useAppointmentHoverAndMenu,
  useAppointmentDurationAndShift,
  useAppointmentReassignAndWaitlist,
} from "./interactionModules";

export type { UseScheduleAppointmentInteractionsProps } from "./interactionModules";

export function useScheduleAppointmentInteractions({
  dateKey,
  gridStepMinutes,
  onGridStepChange,
  chairMaintenanceBlocks,
  onAddChairMaintenance,
  onRemoveChairMaintenance,
  appointments,
  dashboard,
  patientName,
  formatTime,
  toDateTimeLocalValue,
  timezone,
  onAppointmentMove,
  onQuickStatusChange,
  onOpenWaitlistForSlot,
}: UseScheduleAppointmentInteractionsProps) {
  const displaySettings = useGridDisplaySettings(
    dateKey,
    gridStepMinutes,
    onGridStepChange,
    chairMaintenanceBlocks,
    onAddChairMaintenance,
    onRemoveChairMaintenance,
  );

  const hoverAndMenu = useAppointmentHoverAndMenu();
  const { setSelectedMobileAppt, setActiveMenuApptId } = hoverAndMenu;

  const durationAndShift = useAppointmentDurationAndShift(
    appointments,
    dashboard,
    displaySettings.effectiveMaintenanceBlocks,
    patientName,
    formatTime,
    toDateTimeLocalValue,
    timezone,
    onAppointmentMove,
    setSelectedMobileAppt,
  );

  const reassignAndWaitlist = useAppointmentReassignAndWaitlist(
    dashboard,
    patientName,
    onAppointmentMove,
    onQuickStatusChange,
    onOpenWaitlistForSlot,
    setSelectedMobileAppt,
    setActiveMenuApptId,
  );

  return {
    ...displaySettings,
    ...hoverAndMenu,
    ...durationAndShift,
    ...reassignAndWaitlist,
  };
}
