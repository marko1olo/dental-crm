import React from "react";
import { ScheduleFilterStrip } from "../ScheduleFilterStrip";
import type { ScheduleViewToolbarProps } from "./scheduleViewToolbarTypes";

export function ScheduleViewFilterStripSection({ props }: { props: ScheduleViewToolbarProps }) {
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
    onOpenPreventiveInspection,
    preventiveInspectionCount,
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
    onOpenDoctorShiftDrawer,
    onOpenChairDateRangeModal,
    pendingOnlineBookingsCount,
    onOpenPendingOnlineBookings,
  } = props;

  return (
    <ScheduleFilterStrip
      todayIso={clinicToday}
      scheduleDateFilter={scheduleDateFilter}
      setScheduleDateFilter={setScheduleDateFilter}
      stepScheduleDay={stepScheduleDay}
      activeScheduleFilterCount={activeScheduleFilterCount}
      resetScheduleFilters={resetScheduleFilters}
      staffMembers={dashboard?.clinicSettings?.staff ?? []}
      chairs={dashboard?.clinicSettings?.chairs ?? []}
      isSoloDoctor={dashboard?.clinicSettings?.profile?.mode === "solo_doctor"}
      scheduleDoctorFilterId={scheduleDoctorFilterId}
      setScheduleDoctorFilterId={setScheduleDoctorFilterId}
      scheduleChairFilterId={scheduleChairFilterId}
      setScheduleChairFilterId={setScheduleChairFilterId}
      scheduleStatusFilter={scheduleStatusFilter}
      queueCounts={shiftQueueCounts}
      setScheduleStatusFilter={setScheduleStatusFilter}
      chairDoctorAssignments={computedChairDoctorAssignments}
      scheduleViewMode={scheduleViewMode}
      setScheduleViewMode={setScheduleViewMode}
      gridStepMinutes={scheduleGridStep}
      onGridStepChange={setScheduleGridStep}
      activeFilterSummary={scheduleFilterSummaryNode}
      isSmartAiOpen={isSmartAiOpen}
      onToggleSmartAi={() => setIsSmartAiOpen((prev) => !prev)}
      onOpenDoctorFreeSlots={() => setDoctorFreeSlotsOpen(true)}
      onOpenPreventiveInspection={onOpenPreventiveInspection}
      preventiveInspectionCount={preventiveInspectionCount}
      onOpenPatientSearch={() => setIsPatientSearchOpen(true)}
      onEmergencyCitoBooking={handleEmergencyCitoBooking}
      showShiftAnalytics={showShiftAnalytics}
      onToggleShiftAnalytics={() => setShowShiftAnalytics((prev) => !prev)}
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
      onOpenDoctorShiftDrawer={onOpenDoctorShiftDrawer}
      onOpenChairDateRangeModal={onOpenChairDateRangeModal}
      pendingOnlineBookingsCount={pendingOnlineBookingsCount}
      onOpenPendingOnlineBookings={onOpenPendingOnlineBookings}
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
  );
}
