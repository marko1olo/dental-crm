import React from "react";
import { ScheduleGrid } from "../ScheduleGrid";
import { ChairScheduleToolbar } from "../ChairScheduleToolbar";
import type { ChairScheduleViewProps } from "../ChairScheduleTypes";
import type { useChairScheduleState } from "../useChairScheduleState";

export interface ChairScheduleDesktopLayoutProps {
  props: ChairScheduleViewProps;
  state: ReturnType<typeof useChairScheduleState>;
  preventiveCandidatesCount: number;
  onOpenDoctorFreeSlots: () => void;
  onOpenPreventiveInspection: () => void;
}

export function ChairScheduleDesktopLayout({
  props,
  state,
  preventiveCandidatesCount,
  onOpenDoctorFreeSlots,
  onOpenPreventiveInspection,
}: ChairScheduleDesktopLayoutProps) {
  const {
    dashboard,
    dateKey,
    appointments,
    onAppointmentClick,
    onAppointmentMove,
    onQuickStatusChange,
    selectedDoctorId,
    chairDoctorAssignments,
    onAssignChairDoctor,
    onAddChair,
    onAddDoctor,
    onOpenRosterModal,
    hideToolbar,
    gridStepMinutes,
    onGridStepChange,
    selectedBranchId,
    onSelectBranch,
  } = props;

  return (
    <>
      {!hideToolbar && (
        <ChairScheduleToolbar
          chairs={state.chairs}
          isSoloDoctor={state.isSoloDoctor}
          rawBranches={state.rawBranches}
          hasMultipleBranches={state.hasMultipleBranches}
          selectedBranchId={selectedBranchId}
          onSelectBranch={onSelectBranch}
          effectiveSelectedChairId={state.effectiveSelectedChairId}
          handleToggleChairFilter={state.handleToggleChairFilter}
          chairDoctorAssignments={chairDoctorAssignments}
          dashboard={dashboard}
          activeShiftChairId={state.activeShiftChairId}
          setActiveShiftChairId={state.setActiveShiftChairId}
          handleEditChair={state.handleEditChair}
          popoverRef={state.popoverRef}
          doctors={state.doctors}
          popoverSelectedDocId={state.popoverSelectedDocId}
          setPopoverSelectedDocId={state.setPopoverSelectedDocId}
          dateKey={dateKey}
          onAssignChairDoctor={onAssignChairDoctor}
          handleAssignShift={state.handleAssignShift}
          handleUnassignShift={state.handleUnassignShift}
          handleDuplicateChair={state.handleDuplicateChair}
          isSubstituteOpen={state.isSubstituteOpen}
          setIsSubstituteOpen={state.setIsSubstituteOpen}
          handleQuickSubstituteDoctor={state.handleQuickSubstituteDoctor}
          handleOpenAddChair={state.handleOpenAddChair}
          isShiftsMenuOpen={state.isShiftsMenuOpen}
          setIsShiftsMenuOpen={state.setIsShiftsMenuOpen}
          shiftsMenuRef={state.shiftsMenuRef}
          handleCopyTodayShiftsToCurrentWeek={state.handleCopyTodayShiftsToCurrentWeek}
          handleCopyTodayShiftsToMonth={state.handleCopyTodayShiftsToMonth}
          handleRotateChairShifts={state.handleRotateChairShifts}
          handleApplyDoctorPreferredChairs={state.handleApplyDoctorPreferredChairs}
          handleCopyWeekShiftsToNextWeek={state.handleCopyWeekShiftsToNextWeek}
          setIsDateRangeModalOpen={state.setIsDateRangeModalOpen}
          handleClearAllDayShifts={state.handleClearAllDayShifts}
          onOpenRosterModal={onOpenRosterModal}
          setIsAddDoctorOpen={state.setIsAddDoctorOpen}
          onOpenDoctorFreeSlots={onOpenDoctorFreeSlots}
          onOpenPreventiveInspection={onOpenPreventiveInspection}
          preventiveInspectionCount={preventiveCandidatesCount}
        />
      )}

      <div className="flex-1 overflow-hidden">
        <ScheduleGrid
          dashboard={dashboard}
          hideInlineAddChair={true}
          dateKey={dateKey}
          gridStepMinutes={gridStepMinutes}
          onGridStepChange={onGridStepChange}
          appointments={appointments}
          onSlotClick={state.handleSlotClick}
          onAppointmentClick={onAppointmentClick}
          onAppointmentMove={onAppointmentMove}
          onQuickStatusChange={onQuickStatusChange}
          patientName={state.resolvedPatientName}
          formatTime={state.resolvedFormatTime}
          toDateTimeLocalValue={state.resolvedToDateTimeLocalValue}
          appointmentLabels={state.resolvedAppointmentLabels}
          selectedChairId={state.effectiveSelectedChairId}
          selectedDoctorId={selectedDoctorId}
          chairDoctorAssignments={chairDoctorAssignments}
          onAssignChairDoctor={onAssignChairDoctor}
          onOpenAddChair={state.handleOpenAddChair}
          onAddChair={onAddChair}
          onEditChair={state.handleEditChair}
          onAddDoctor={onAddDoctor}
        />
      </div>
    </>
  );
}
