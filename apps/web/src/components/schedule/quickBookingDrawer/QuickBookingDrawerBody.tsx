import React from "react";
import { QuickBookingDrawerPatientPart } from "./QuickBookingDrawerPatientPart";
import { QuickBookingServiceSection } from "../QuickBookingServiceSection";
import type { QuickBookingDrawerState } from "../useQuickBookingDrawerState";
import type { QuickBookingDrawerProps } from "../QuickBookingDrawerTypes";

export interface QuickBookingDrawerBodyProps {
  state: QuickBookingDrawerState;
  props: QuickBookingDrawerProps;
}

export function QuickBookingDrawerBody({ state, props }: QuickBookingDrawerBodyProps) {
  const { dashboard, initialSlot, chairDoctorAssignments } = props;
  const {
    appointmentType,
    handleSelectAppointmentType,
    selectedPatient,
    doctors,
    assistants,
    chairs,
    isSoloClinic,
    currentChair,
    doctorUserId,
    setDoctorUserId,
    assistantUserId,
    setAssistantUserId,
    chairId,
    setChairId,
    startsAtLocal,
    setStartsAtLocal,
    durationMinutes,
    handleSelectDuration,
    status,
    setStatus,
    reason,
    setReason,
    comment,
    setComment,
    submitError,
    slotConflict,
    setSlotConflict,
    dutyDoc,
    dutyDoctorHours,
    handleSubmitBooking,
  } = state;

  return (
    <div className="flex-1 overflow-y-auto p-5 pb-8 space-y-4" data-testid="quick-booking-scroll-body">
      <QuickBookingDrawerPatientPart state={state} props={props} />

      <QuickBookingServiceSection
        appointmentType={appointmentType}
        handleSelectAppointmentType={handleSelectAppointmentType}
        startsAtLocal={startsAtLocal}
        setStartsAtLocal={setStartsAtLocal}
        durationMinutes={durationMinutes}
        handleSelectDuration={handleSelectDuration}
        doctorUserId={doctorUserId}
        setDoctorUserId={setDoctorUserId}
        assistantUserId={assistantUserId}
        setAssistantUserId={setAssistantUserId}
        chairId={chairId}
        setChairId={setChairId}
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
        doctors={doctors}
        assistants={assistants}
        chairs={chairs}
        currentChair={currentChair}
        dutyDoc={dutyDoc}
        dutyDoctorHours={dutyDoctorHours}
        isSoloClinic={isSoloClinic}
        selectedPatientName={selectedPatient?.fullName}
        chairDoctorAssignments={chairDoctorAssignments}
        dashboard={dashboard}
        initialSlot={initialSlot}
      />
    </div>
  );
}
