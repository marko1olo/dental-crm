import React from "react";
import type { Appointment, Dashboard } from "@dental/shared";
import { ScheduleFilterStrip } from "../ScheduleFilterStrip";
import { DayConfirmationsPanel } from "../DayConfirmationsPanel";
import { FreedSlotsPanel } from "../FreedSlotsPanel";
import { ScheduleClipboardPanel } from "../ScheduleClipboardPanel";
import { ScheduleShiftAnalytics } from "../ScheduleShiftAnalytics";
import type { QuickAddChairData } from "../QuickAddChairModal";
import type { QuickBookingSlotInfo } from "../QuickBookingDrawer";

export interface ScheduleViewToolbarProps {
  clinicToday: string;
  scheduleDateFilter: string;
  setScheduleDateFilter: (val: string) => void;
  stepScheduleDay: (delta: number) => void;
  activeScheduleFilterCount: number;
  resetScheduleFilters: () => void;
  dashboard: Dashboard | null | undefined;
  scheduleDoctorFilterId: string | null;
  setScheduleDoctorFilterId: (id: string | null) => void;
  scheduleChairFilterId: string | null;
  setScheduleChairFilterId: (id: string | null) => void;
  scheduleStatusFilter: string;
  shiftQueueCounts: { all: number; arrived: number; inTreatment: number; awaitingPayment: number };
  setScheduleStatusFilter: (status: string | null) => void;
  computedChairDoctorAssignments: any;
  scheduleViewMode: "timeline" | "grid" | "chairs";
  setScheduleViewMode: (mode: "timeline" | "grid" | "chairs") => void;
  scheduleGridStep: 15 | 30 | 60;
  setScheduleGridStep: (step: 15 | 30 | 60) => void;
  scheduleFilterSummaryNode: React.ReactNode;
  isSmartAiOpen: boolean;
  setIsSmartAiOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setDoctorFreeSlotsOpen: (open: boolean) => void;
  setIsPatientSearchOpen: (open: boolean) => void;
  handleEmergencyCitoBooking: () => void;
  showShiftAnalytics: boolean;
  setShowShiftAnalytics: React.Dispatch<React.SetStateAction<boolean>>;
  setIsRosterModalOpen: (open: boolean) => void;
  setWaitlistOpen: (open: boolean) => void;
  waitlistCount: number;
  showConfirmationsPanel: boolean;
  setShowConfirmationsPanel: React.Dispatch<React.SetStateAction<boolean>>;
  showFreedSlotsPanel: boolean;
  setShowFreedSlotsPanel: React.Dispatch<React.SetStateAction<boolean>>;
  showClipboardPanel: boolean;
  setShowClipboardPanel: React.Dispatch<React.SetStateAction<boolean>>;
  setIsCalendarSyncModalOpen: (open: boolean) => void;
  setIsTomorrowRemindersOpen: (open: boolean) => void;
  setIsQuickAddChairOpen: (open: boolean) => void;
  handleAddChairFromSchedule: (chairData: QuickAddChairData) => Promise<void>;
  setQuickBookingSlot: (slot: QuickBookingSlotInfo | null) => void;
  setQuickBookingOpen: (open: boolean) => void;
  todayScheduleDate: () => string;
  clipboardReloadToken: number;
  loadDashboard?: () => void | Promise<void>;
  shiftWarnings: any[];
  openScheduleWarning: (w: any) => void;
}

export function ScheduleViewToolbar(props: ScheduleViewToolbarProps) {
  const {
    clinicToday,
    scheduleDateFilter,
    setScheduleDateFilter,
    stepScheduleDay,
    activeScheduleFilterCount,
    resetScheduleFilters,
    dashboard,
    scheduleDoctorFilterId,
    setScheduleDoctorFilterId,
    scheduleChairFilterId,
    setScheduleChairFilterId,
    scheduleStatusFilter,
    shiftQueueCounts,
    setScheduleStatusFilter,
    computedChairDoctorAssignments,
    scheduleViewMode,
    setScheduleViewMode,
    scheduleGridStep,
    setScheduleGridStep,
    scheduleFilterSummaryNode,
    isSmartAiOpen,
    setIsSmartAiOpen,
    setDoctorFreeSlotsOpen,
    setIsPatientSearchOpen,
    handleEmergencyCitoBooking,
    showShiftAnalytics,
    setShowShiftAnalytics,
    setIsRosterModalOpen,
    setWaitlistOpen,
    waitlistCount,
    showConfirmationsPanel,
    setShowConfirmationsPanel,
    showFreedSlotsPanel,
    setShowFreedSlotsPanel,
    showClipboardPanel,
    setShowClipboardPanel,
    setIsCalendarSyncModalOpen,
    setIsTomorrowRemindersOpen,
    setIsQuickAddChairOpen,
    handleAddChairFromSchedule,
    setQuickBookingSlot,
    setQuickBookingOpen,
    todayScheduleDate,
    clipboardReloadToken,
    loadDashboard,
    shiftWarnings,
    openScheduleWarning,
  } = props;

  return (
    <>
      <ScheduleFilterStrip
        todayIso={clinicToday}
        scheduleDateFilter={scheduleDateFilter}
        setScheduleDateFilter={setScheduleDateFilter}
        stepScheduleDay={stepScheduleDay}
        activeScheduleFilterCount={activeScheduleFilterCount}
        resetScheduleFilters={resetScheduleFilters}
        staffMembers={dashboard?.clinicSettings?.staff ?? []}
        chairs={dashboard?.clinicSettings?.chairs ?? []}
        isSoloDoctor={
          dashboard?.clinicSettings?.profile?.mode === "solo_doctor"
        }
        scheduleDoctorFilterId={scheduleDoctorFilterId}
        setScheduleDoctorFilterId={setScheduleDoctorFilterId}
        scheduleChairFilterId={scheduleChairFilterId}
        setScheduleChairFilterId={setScheduleChairFilterId}
        scheduleStatusFilter={scheduleStatusFilter}
        queueCounts={shiftQueueCounts}
        setScheduleStatusFilter={(status: string | null) => {
          if (!setScheduleStatusFilter) return;
          if (!status || status === "all") {
            setScheduleStatusFilter("all");
          } else {
            setScheduleStatusFilter(
              status as
                | "cancelled"
                | "completed"
                | "confirmed"
                | "no_show"
                | "in_treatment"
                | "planned"
                | "arrived"
                | "all",
            );
          }
        }}
        chairDoctorAssignments={computedChairDoctorAssignments}
        scheduleViewMode={scheduleViewMode}
        setScheduleViewMode={setScheduleViewMode}
        gridStepMinutes={scheduleGridStep}
        onGridStepChange={setScheduleGridStep}
        activeFilterSummary={scheduleFilterSummaryNode}
        isSmartAiOpen={isSmartAiOpen}
        onToggleSmartAi={() => setIsSmartAiOpen((prev) => !prev)}
        onOpenDoctorFreeSlots={() => setDoctorFreeSlotsOpen(true)}
        onOpenPatientSearch={() => setIsPatientSearchOpen(true)}
        onEmergencyCitoBooking={handleEmergencyCitoBooking}
        onToggleShiftAnalytics={() => setShowShiftAnalytics((prev) => !prev)}
        showShiftAnalytics={showShiftAnalytics}
        onOpenShiftRoster={() => setIsRosterModalOpen(true)}
        onOpenWaitlist={() => setWaitlistOpen(true)}
        waitlistCount={waitlistCount}
        onToggleConfirmations={() => setShowConfirmationsPanel((prev) => !prev)}
        showConfirmationsPanel={showConfirmationsPanel}
        onToggleFreedSlots={() => setShowFreedSlotsPanel((prev) => !prev)}
        showFreedSlotsPanel={showFreedSlotsPanel}
        onToggleClipboard={() => setShowClipboardPanel((prev) => !prev)}
        showClipboardPanel={showClipboardPanel}
        onOpenCalendarSync={() => setIsCalendarSyncModalOpen(true)}
        onOpenTomorrowReminders={() => setIsTomorrowRemindersOpen(true)}
        onOpenAddChair={() => setIsQuickAddChairOpen(true)}
        onAddChair={handleAddChairFromSchedule}
        onQuickBooking={() => {
          setQuickBookingSlot({
            dateKey: scheduleDateFilter || clinicToday || todayScheduleDate(),
            doctorUserId: scheduleDoctorFilterId || null,
            chairId: scheduleChairFilterId || null,
            durationMinutes: 30,
          });
          setQuickBookingOpen(true);
        }}
      />
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
        />
      )}
    </>
  );
}
