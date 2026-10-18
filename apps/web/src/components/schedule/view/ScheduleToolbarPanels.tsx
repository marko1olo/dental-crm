import React from "react";
import type { Dashboard } from "@dental/shared";
import { DayConfirmationsPanel } from "../DayConfirmationsPanel";
import { FreedSlotsPanel } from "../FreedSlotsPanel";
import { ScheduleClipboardPanel } from "../ScheduleClipboardPanel";
import { ScheduleShiftAnalytics } from "../ScheduleShiftAnalytics";

export interface ScheduleToolbarPanelsProps {
  showConfirmationsPanel: boolean;
  showFreedSlotsPanel: boolean;
  showClipboardPanel: boolean;
  showShiftAnalytics: boolean;
  clipboardReloadToken: number;
  loadDashboard?: (() => void | Promise<void>) | undefined;
  dashboard: Dashboard | null | undefined;
  shiftWarnings: any[];
  openScheduleWarning: (w: any) => void;
  onOpenDoctorShiftDrawer?: (() => void) | undefined;
  onOpenChairDateRangeModal?: (() => void) | undefined;
}

export function ScheduleToolbarPanels({
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
}: ScheduleToolbarPanelsProps) {
  return (
    <>
      {showConfirmationsPanel && <DayConfirmationsPanel />}
      {showFreedSlotsPanel && <FreedSlotsPanel />}
      {showClipboardPanel && (
        <ScheduleClipboardPanel
          reloadToken={clipboardReloadToken}
          onPasted={() => {
            if (typeof loadDashboard === "function") {
              void loadDashboard();
            }
          }}
        />
      )}

      {showShiftAnalytics && (
        <ScheduleShiftAnalytics
          dashboard={dashboard}
          shiftWarnings={shiftWarnings}
          onOpenWarning={openScheduleWarning}
          onOpenDoctorShiftDrawer={onOpenDoctorShiftDrawer}
          onOpenChairDateRangeModal={onOpenChairDateRangeModal}
        />
      )}
    </>
  );
}
