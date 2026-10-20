import React, { memo } from "react";
import { ScheduleDisconnectedState } from "./components/schedule/view/ScheduleDisconnectedState";
import { useScheduleViewController } from "./components/schedule/scheduleViewModules/useScheduleViewController";
import { ScheduleHeaderToolbar } from "./components/schedule/scheduleViewModules/ScheduleHeaderToolbar";
import { ScheduleActiveViewPort } from "./components/schedule/scheduleViewModules/ScheduleActiveViewPort";
import { ScheduleModalsLayer } from "./components/schedule/scheduleViewModules/ScheduleModalsLayer";
import type { ScheduleViewProps } from "./components/schedule/scheduleViewModules/types";

// Zero-downtime backwards-compatible re-exports
export {
  buildChairDoctorAssignmentsFromShifts,
  buildChairDoctorAssignmentsByDate,
} from "./components/schedule/scheduleViewModules/scheduleViewConstants";

export type {
  AppointmentScheduleDraft,
  AppointmentScheduleSaveState,
  TextFieldChangeEvent,
  SelectChangeEvent,
  ScheduleViewProps,
} from "./components/schedule/scheduleViewModules/types";

export {
  activeVisitLockedAppointmentStatuses,
} from "./components/schedule/scheduleViewModules/scheduleViewConstants";

function ScheduleViewComponent(rawProps?: Partial<ScheduleViewProps>) {
  const ctrl = useScheduleViewController(rawProps);

  if (!ctrl.dashboard) {
    return <ScheduleDisconnectedState onRetry={ctrl.handleRetryDashboard} />;
  }

  return (
    <div
      className={`panel schedule-panel ${ctrl.isMobile ? "schedule-mobile-panel" : ""}`}
      id="schedule"
      data-testid="schedule-view"
    >
      {!ctrl.isMobile && (
        <ScheduleHeaderToolbar {...ctrl.headerToolbarProps} />
      )}
      <ScheduleActiveViewPort {...ctrl.activeViewPortProps} />
      <ScheduleModalsLayer {...ctrl.modalsLayerProps} />
    </div>
  );
}

export const ScheduleView = memo(ScheduleViewComponent);
export default ScheduleView;
