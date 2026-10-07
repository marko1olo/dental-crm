import React from "react";
import { ScheduleGrid } from "./ScheduleGrid";
import { QuickAddChairModal } from "./QuickAddChairModal";
import { QuickAddDoctorModal } from "./QuickAddDoctorModal";
import {
  type ChairScheduleViewProps,
  resolveChairDutyDoctor,
  useSchedule,
} from "./ChairScheduleTypes";
import { ChairDateRangeModal } from "./ChairDateRangeModal";
import { ChairScheduleToolbar } from "./ChairScheduleToolbar";
import { useChairScheduleState } from "./useChairScheduleState";
import { DoctorFreeSlotsModal } from "./DoctorFreeSlotsModal";
import { PreventiveInspectionModal } from "./PreventiveInspectionModal";
import { findPreventiveInspectionCandidates } from "./doctorFreeSlotsEngine";
import { useIsMobile } from "../../hooks/useIsMobile";

// Transparent re-exports per Mandates 8b, 8e
export * from "./ChairScheduleTypes";
export * from "./ChairDateRangeModal";
export * from "./ChairShiftPopover";
export * from "./useChairShiftOperations";
export * from "./useChairScheduleState";
export * from "./ChairScheduleToolbar";
export * from "./DoctorFreeSlotsModal";
export * from "./PreventiveInspectionModal";
export { resolveChairDutyDoctor, useSchedule };

export const ChairScheduleView: React.FC<ChairScheduleViewProps> = (props) => {
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

  const state = useChairScheduleState(props);
  const [isDoctorFreeSlotsOpen, setIsDoctorFreeSlotsOpen] = React.useState(false);
  const [isPreventiveInspectionOpen, setIsPreventiveInspectionOpen] = React.useState(false);

  const preventiveCandidatesCount = React.useMemo(() => {
    return findPreventiveInspectionCandidates({
      patients: dashboard?.patients ?? [],
      appointments: appointments ?? dashboard?.appointments ?? [],
      minDaysSinceVisit: 150,
      referenceDate: dateKey || undefined,
    }).length;
  }, [dashboard?.patients, dashboard?.appointments, appointments, dateKey]);

  const isMobile = useIsMobile(768);

  return (
    <div className="flex flex-col h-full w-full bg-[var(--paper)]">
      {!hideToolbar && !isMobile && (
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
          onOpenDoctorFreeSlots={() => setIsDoctorFreeSlotsOpen(true)}
          onOpenPreventiveInspection={() => setIsPreventiveInspectionOpen(true)}
          preventiveInspectionCount={preventiveCandidatesCount}
        />
      )}

      {/* Main Grid */}
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

      {/* Quick Add / Edit Chair Modal */}
      <QuickAddChairModal
        isOpen={state.isAddChairOpen}
        onClose={() => {
          state.setIsAddChairOpen(false);
          state.setEditingChair(null);
        }}
        onAddChair={state.handleSaveChair}
        initialData={state.editingChair}
        onUpdateChair={state.handleSaveChair}
        existingChairsCount={state.chairs.length}
        branches={(dashboard?.clinicSettings as any)?.branches ?? []}
        doctors={(dashboard?.clinicSettings?.staff ?? []).filter(
          (s) => s.active && (s.role === "doctor" || s.role === "owner"),
        )}
      />

      {/* Модальное окно быстрого добавления врача */}
      <QuickAddDoctorModal
        isOpen={state.isAddDoctorOpen}
        onClose={() => state.setIsAddDoctorOpen(false)}
        chairs={state.chairs}
        existingDoctorsCount={state.doctors.length}
        onAddDoctor={async (docData) => {
          if (onAddDoctor) {
            await onAddDoctor(docData);
          } else {
            const newStaffMember: any = {
              id: docData.id || `doc-quick-${Date.now()}`,
              organizationId:
                dashboard?.clinicSettings?.profile?.organizationId ||
                "00000000-0000-4000-8000-000000000001",
              fullName: docData.fullName,
              role: "doctor",
              specialties: [docData.specialty],
              phone: docData.phone || null,
              email: null,
              active: true,
              canSignMedicalRecords: true,
              canManageMoney: false,
              canManageImports: false,
              color: docData.color,
              preferredChairId: docData.preferredChairId || null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            if (dashboard?.clinicSettings?.staff) {
              dashboard.clinicSettings.staff = [...dashboard.clinicSettings.staff, newStaffMember];
            }
            if (docData.preferredChairId && onAssignChairDoctor) {
              const targetCh = state.chairs.find((c) => c.id === docData.preferredChairId);
              onAssignChairDoctor(docData.preferredChairId, {
                chairId: docData.preferredChairId,
                chairName: targetCh?.name || docData.preferredChairId,
                doctorId: newStaffMember.id,
                doctorName: newStaffMember.fullName,
                doctorSpecialty: docData.specialtyLabel,
                shiftPreset: "full",
                shiftLabel: "Весь день",
                shiftHours: "08:00–20:00",
                startHour: 8,
                endHour: 20,
              });
            }
          }
          state.setIsAddDoctorOpen(false);
        }}
      />

      {/* Модальное окно назначения смен на диапазон дат */}
      <ChairDateRangeModal
        isOpen={state.isDateRangeModalOpen}
        onClose={() => state.setIsDateRangeModalOpen(false)}
        doctors={state.doctors}
        chairs={state.chairs}
        rangeDoctorId={state.rangeDoctorId}
        setRangeDoctorId={state.setRangeDoctorId}
        rangeChairId={state.rangeChairId}
        setRangeChairId={state.setRangeChairId}
        rangeStartDate={state.rangeStartDate}
        setRangeStartDate={state.setRangeStartDate}
        rangeEndDate={state.rangeEndDate}
        setRangeEndDate={state.setRangeEndDate}
        rangePreset={state.rangePreset}
        setRangePreset={state.setRangePreset}
        onApply={state.handleApplyDateRange}
      />

      {/* Поиск свободных окон врача в 1 клик */}
      <DoctorFreeSlotsModal
        isOpen={isDoctorFreeSlotsOpen}
        onClose={() => setIsDoctorFreeSlotsOpen(false)}
        dashboard={dashboard as any}
        initialDoctorId={selectedDoctorId}
        onSelectSlot={(slot) => {
          setIsDoctorFreeSlotsOpen(false);
          const doc = state.doctors.find((d) => d.id === slot.doctorId);
          state.handleSlotClick({
            startsAt: slot.startsAtIso,
            dateKey: slot.date,
            startTime: slot.startTime,
            doctorUserId: slot.doctorId || null,
            doctorName: doc?.fullName,
            chairId: slot.chairId,
            durationMinutes: slot.durationMinutes,
          });
        }}
      />

      {/* Preventive Inspection & Warranty Control Modal (Mandate 8x & Mandate 8y) */}
      <PreventiveInspectionModal
        isOpen={isPreventiveInspectionOpen}
        onClose={() => setIsPreventiveInspectionOpen(false)}
        dashboard={dashboard as any}
        onBookPatient={(candidate) => {
          setIsPreventiveInspectionOpen(false);
          state.handleSlotClick({
            patientId: candidate.patientId,
            patientName: candidate.patientFullName,
            doctorUserId: candidate.lastDoctorId || null,
            doctorName: candidate.lastDoctorName,
            reason: candidate.recommendedProcedureName || candidate.categoryTitle,
            dateKey: dateKey || new Date().toISOString().slice(0, 10),
            durationMinutes: 45,
          });
        }}
      />
    </div>
  );
};

export default ChairScheduleView;
