import React from "react";
import { ScheduleToolbarPanels } from "./ScheduleToolbarPanels";
import { ScheduleViewFilterStripSection } from "./ScheduleViewFilterStripSection";
import { ScheduleTimeReservationModal } from "../ScheduleTimeReservationModal";
import type { ScheduleViewToolbarProps } from "./scheduleViewToolbarTypes";

export type { ScheduleViewToolbarProps };

export function ScheduleViewToolbar(props: ScheduleViewToolbarProps) {
  const {
    showConfirmationsPanel,
    showFreedSlotsPanel,
    showClipboardPanel,
    showShiftAnalytics,
    clipboardReloadToken,
    loadDashboard,
    dashboard,
    shiftWarnings,
    openScheduleWarning,
    onOpenDoctorShiftDrawer,
    onOpenChairDateRangeModal,
  } = props;

  const [isTimeReservationOpen, setIsTimeReservationOpen] = React.useState(false);

  return (
    <>
      <ScheduleViewFilterStripSection
        props={{
          ...props,
          onOpenTimeReservation:
            props.onOpenTimeReservation ?? (() => setIsTimeReservationOpen(true)),
        }}
      />

      <ScheduleToolbarPanels
        showConfirmationsPanel={showConfirmationsPanel}
        showFreedSlotsPanel={showFreedSlotsPanel}
        showClipboardPanel={showClipboardPanel}
        showShiftAnalytics={showShiftAnalytics}
        clipboardReloadToken={clipboardReloadToken}
        loadDashboard={loadDashboard}
        dashboard={dashboard}
        shiftWarnings={shiftWarnings}
        openScheduleWarning={openScheduleWarning}
        onOpenDoctorShiftDrawer={onOpenDoctorShiftDrawer}
        onOpenChairDateRangeModal={onOpenChairDateRangeModal}
      />

      <ScheduleTimeReservationModal
        isOpen={isTimeReservationOpen}
        onClose={() => setIsTimeReservationOpen(false)}
        defaultDateKey={props.scheduleDateFilter}
        chairs={props.dashboard?.clinicSettings?.chairs}
        timezone={props.dashboard?.clinicSettings?.profile?.timezone}
      />
    </>
  );
}
