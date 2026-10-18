import React from "react";
import type { Dashboard } from "@dental/shared";
import { ChairDateRangeModal } from "../ChairDateRangeModal";
import { DoctorFreeSlotsModal } from "../DoctorFreeSlotsModal";
import { PreventiveInspectionModal } from "../PreventiveInspectionModal";
import type { useChairScheduleState } from "../useChairScheduleState";

export interface ChairScheduleInspectionModalsProps {
  state: ReturnType<typeof useChairScheduleState>;
  dashboard?: Dashboard | null | undefined;
  dateKey?: string | undefined;
  selectedDoctorId?: string | null | undefined;
  isDoctorFreeSlotsOpen: boolean;
  setIsDoctorFreeSlotsOpen: (open: boolean) => void;
  isPreventiveInspectionOpen: boolean;
  setIsPreventiveInspectionOpen: (open: boolean) => void;
}

export function ChairScheduleInspectionModals({
  state,
  dashboard,
  dateKey,
  selectedDoctorId,
  isDoctorFreeSlotsOpen,
  setIsDoctorFreeSlotsOpen,
  isPreventiveInspectionOpen,
  setIsPreventiveInspectionOpen,
}: ChairScheduleInspectionModalsProps) {
  return (
    <>
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
    </>
  );
}
