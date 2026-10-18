import React from "react";
import { QuickServiceTopSelectors } from "./QuickServiceTopSelectors";
import { QuickDurationAndSlotsSection } from "./SelectedServicesSummaryCard";
import { QuickResourceAllocationSection } from "./QuickResourceAllocationSection";
import { QuickNotesAndConflictSection } from "./QuickNotesAndConflictSection";
import { useQuickBookingSlotFinder } from "./useQuickBookingSlotFinder";
import type { QuickBookingServiceSectionProps } from "./types";

export * from "./QuickPresetChipsBar";
export * from "./quickServicePresets";
export * from "./SelectedServicesSummaryCard";
export * from "./QuickResourceAllocationSection";
export * from "./QuickNotesAndConflictSection";
export * from "./types";

export function QuickBookingServiceSection(props: QuickBookingServiceSectionProps) {
  const {
    appointmentType, handleSelectAppointmentType, startsAtLocal, setStartsAtLocal,
    durationMinutes, handleSelectDuration, doctorUserId, setDoctorUserId,
    assistantUserId, setAssistantUserId, chairId, setChairId, status, setStatus,
    reason, setReason, comment, setComment, submitError, slotConflict, setSlotConflict,
    handleSubmitBooking, doctors, assistants, chairs, currentChair, dutyDoc,
    dutyDoctorHours, isSoloClinic, selectedPatientName, chairDoctorAssignments,
    dashboard, initialSlot,
  } = props;

  const { isSearchingSlots, setIsSearchingSlots, freeSlotsList, handleFindFreeSlots } =
    useQuickBookingSlotFinder({
      dashboard,
      startsAtLocal,
      doctorUserId,
      durationMinutes,
      chairs,
    });

  return (
    <>
      <QuickServiceTopSelectors
        appointmentType={appointmentType}
        handleSelectAppointmentType={handleSelectAppointmentType}
        status={status}
        setStatus={setStatus}
        reason={reason}
        setReason={setReason}
        initialSlot={initialSlot}
      />

      <QuickDurationAndSlotsSection
        startsAtLocal={startsAtLocal}
        setStartsAtLocal={setStartsAtLocal}
        durationMinutes={durationMinutes}
        handleSelectDuration={handleSelectDuration}
        chairId={chairId}
        setChairId={setChairId}
        doctorUserId={doctorUserId}
        setDoctorUserId={setDoctorUserId}
        chairDoctorAssignments={chairDoctorAssignments}
        isSearchingSlots={isSearchingSlots}
        setIsSearchingSlots={setIsSearchingSlots}
        freeSlotsList={freeSlotsList}
        handleFindFreeSlots={handleFindFreeSlots}
      />

      <QuickResourceAllocationSection
        chairId={chairId}
        setChairId={setChairId}
        chairs={chairs}
        startsAtLocal={startsAtLocal}
        chairDoctorAssignments={chairDoctorAssignments}
        isSoloClinic={isSoloClinic}
        doctors={doctors}
        doctorUserId={doctorUserId}
        setDoctorUserId={setDoctorUserId}
        dutyDoc={dutyDoc}
        dutyDoctorHours={dutyDoctorHours}
        currentChair={currentChair}
        assistantUserId={assistantUserId}
        setAssistantUserId={setAssistantUserId}
        assistants={assistants}
      />

      <QuickNotesAndConflictSection
        status={status}
        setStatus={setStatus}
        reason={reason}
        setReason={setReason}
        comment={comment}
        setComment={setComment}
        submitError={submitError}
        slotConflict={slotConflict}
        setSlotConflict={setSlotConflict}
        handleSubmitBooking={handleSubmitBooking}
        selectedPatientName={selectedPatientName}
        doctors={doctors}
        doctorUserId={doctorUserId}
        chairs={chairs}
        chairId={chairId}
        setChairId={setChairId}
        startsAtLocal={startsAtLocal}
        setStartsAtLocal={setStartsAtLocal}
      />
    </>
  );
}
