import React from "react";
import type { Dashboard } from "@dental/shared";
import { DayConfirmationsPanel } from "../DayConfirmationsPanel";
import { FreedSlotsPanel } from "../FreedSlotsPanel";
import { ScheduleClipboardPanel } from "../ScheduleClipboardPanel";
import { ScheduleShiftAnalytics, type ScheduleShiftWarning } from "../ScheduleShiftAnalytics";
import type { DoctorShift } from "../roster/DoctorShiftRosterModal";

export interface ScheduleToolbarPanelsProps {
  showConfirmationsPanel: boolean;
  showFreedSlotsPanel: boolean;
  showClipboardPanel: boolean;
  showShiftAnalytics: boolean;
  clipboardReloadToken: number;
  loadDashboard?: ((options?: { adminSecret?: string }) => void | Promise<void>) | undefined;
  dashboard: Dashboard | null | undefined;
  shiftWarnings?: readonly ScheduleShiftWarning[] | ScheduleShiftWarning[] | Dashboard["shiftIntelligence"]["scheduleWarnings"] | undefined;
  openScheduleWarning?: ((w: ScheduleShiftWarning) => void) | undefined;
  onOpenDoctorShiftDrawer?: ((shiftToEdit?: Partial<DoctorShift> | null) => void) | undefined;
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
