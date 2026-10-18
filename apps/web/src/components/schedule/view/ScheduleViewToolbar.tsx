import React from "react";
import { ScheduleToolbarPanels } from "./ScheduleToolbarPanels";
import { ScheduleViewFilterStripSection } from "./ScheduleViewFilterStripSection";
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

  return (
    <>
      <ScheduleViewFilterStripSection props={props} />

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
    </>
  );
}
