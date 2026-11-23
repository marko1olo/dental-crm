import React from "react";
import {
  DoctorShiftRosterModal,
  getMondayOfWeekIso,
} from "../../roster/DoctorShiftRosterModal";
import { QuickAddChairModal } from "../../QuickAddChairModal";
import { DoctorCalendarSyncModal } from "../../DoctorCalendarSyncModal";
import { DoctorShiftDrawer } from "../../roster/DoctorShiftDrawer";
import type { ScheduleViewModalsProps } from "./scheduleModalsTypes";

interface ClinicSettingsWithBranches {
  branches?: readonly { id: string; name: string }[];
}

export function ScheduleRosterAndSyncModals(props: ScheduleViewModalsProps) {
  const {
    isRosterModalOpen,
    setIsRosterModalOpen,
    rosterStaffList,
    rosterCabinets,
    savedDoctorShifts,
    rosterAppointments,
    dashboard,
    handleSaveDoctorShifts,
    currentDateKey,
    isQuickAddChairOpen,
    setIsQuickAddChairOpen,
    setEditingChairData,
    handleAddChairFromSchedule,
    editingChairData,
    scheduleDoctors,
    isCalendarSyncModalOpen,
    setIsCalendarSyncModalOpen,
    scheduleDoctorFilterId,
    editingDrawerShift,
    onCloseDoctorShiftDrawer,
    setEditingDrawerShift,
    onSaveDrawerShift,
    onDeleteDrawerShift,
    isNewDrawerShift,
    isChairDateRangeModalOpen,
    setIsChairDateRangeModalOpen,
  } = props;

  return (
    <>
      <DoctorShiftRosterModal
        key={currentDateKey || "doctor_shift_roster"}
        isOpen={Boolean(isRosterModalOpen || isChairDateRangeModalOpen)}
        onClose={() => {
          setIsRosterModalOpen(false);
          setIsChairDateRangeModalOpen?.(false);
        }}
        staffList={rosterStaffList}
        cabinets={rosterCabinets}
        initialShifts={
          savedDoctorShifts.length > 0 ? savedDoctorShifts : undefined
        }
        appointments={rosterAppointments}
        clinicName={
          dashboard?.clinicSettings?.profile?.clinicName ||
          dashboard?.clinicName
        }
        onSave={handleSaveDoctorShifts}
        currentDate={currentDateKey}
      />

      <QuickAddChairModal
        key={editingChairData?.id || "quick_add_chair"}
        isOpen={isQuickAddChairOpen}
        onClose={() => {
          setIsQuickAddChairOpen(false);
          setEditingChairData(null);
        }}
        onAddChair={handleAddChairFromSchedule}
        initialData={editingChairData}
        onUpdateChair={handleAddChairFromSchedule}
        existingChairsCount={dashboard?.clinicSettings?.chairs?.length || 0}
        branches={(dashboard?.clinicSettings as ClinicSettingsWithBranches | undefined)?.branches}
        doctors={scheduleDoctors?.map((d) => ({
          id: d.id,
          fullName: d.fullName || d.name || "Врач",
          ...(d.role ? { role: d.role } : {}),
        }))}
      />

      <DoctorCalendarSyncModal
        key={scheduleDoctorFilterId || "doctor_calendar_sync"}
        isOpen={isCalendarSyncModalOpen}
        onClose={() => setIsCalendarSyncModalOpen(false)}
        dashboard={dashboard ?? null}
        initialDoctorId={scheduleDoctorFilterId}
      />

      {editingDrawerShift &&
        onCloseDoctorShiftDrawer &&
        setEditingDrawerShift &&
        onSaveDrawerShift &&
        onDeleteDrawerShift && (
          <DoctorShiftDrawer
            key={editingDrawerShift.id || "doctor_shift_drawer"}
            editingShift={editingDrawerShift}
            isNewShift={Boolean(isNewDrawerShift)}
            staffList={rosterStaffList}
            cabinets={rosterCabinets}
            weekStartDateIso={getMondayOfWeekIso(currentDateKey)}
            onClose={onCloseDoctorShiftDrawer}
            onChangeEditingShift={setEditingDrawerShift}
            onSaveShift={onSaveDrawerShift}
            onDeleteShift={onDeleteDrawerShift}
          />
        )}
    </>
  );
}
