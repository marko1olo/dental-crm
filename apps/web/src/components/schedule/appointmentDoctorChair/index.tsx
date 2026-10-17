import React from "react";
import type { AppointmentModalDoctorChairSectionProps } from "./types";
import { resolveDoctorTargetChair } from "./doctorChairResolution";
import { CollisionAlerts } from "./CollisionAlerts";
import { TimeDurationFields } from "./TimeDurationFields";
import { DoctorSelector } from "./DoctorSelector";
import { AssistantChairFields } from "./AssistantChairFields";

export type { AppointmentModalDoctorChairSectionProps } from "./types";

export function AppointmentModalDoctorChairSection(props: AppointmentModalDoctorChairSectionProps) {
  const {
    appointment, dashboard, startsAtLocal, setStartsAtLocal, endsAtLocal, setEndsAtLocal,
    currentDurationMinutes, applyDuration, doctorUserId, setDoctorUserId,
    assistantUserId, setAssistantUserId, chairId, setChairId, isSoloDoctor,
    doctors, assistants, chairs, dutyDoctorId, dutyDoc, dutyDocHours,
    chairDoctorAssignments, collision, safeToDateTimeLocalValue, timezone, hideAssistant = false,
  } = props;

  const handleDoctorChange = (newDocId: string) => {
    setDoctorUserId(newDocId);
    if (newDocId && (!appointment?.chairId || appointment.id.startsWith("new"))) {
      const targetChairId = resolveDoctorTargetChair(
        newDocId,
        doctors,
        chairs,
        dashboard,
        startsAtLocal,
        chairDoctorAssignments,
      );
      if (targetChairId) setChairId(targetChairId);
    }
  };

  return (
    <>
      <CollisionAlerts
        collision={collision}
        safeToDateTimeLocalValue={safeToDateTimeLocalValue}
        timezone={timezone}
        setStartsAtLocal={setStartsAtLocal}
        setEndsAtLocal={setEndsAtLocal}
      />
      <TimeDurationFields
        startsAtLocal={startsAtLocal}
        setStartsAtLocal={setStartsAtLocal}
        endsAtLocal={endsAtLocal}
        setEndsAtLocal={setEndsAtLocal}
        currentDurationMinutes={currentDurationMinutes}
        applyDuration={applyDuration}
        chairId={chairId}
        doctorUserId={doctorUserId}
        dutyDoctorId={dutyDoctorId}
        setDoctorUserId={setDoctorUserId}
        chairDoctorAssignments={chairDoctorAssignments}
      />
      <DoctorSelector
        isSoloDoctor={isSoloDoctor}
        dutyDoc={dutyDoc}
        dutyDoctorId={dutyDoctorId}
        dutyDocHours={dutyDocHours}
        doctors={doctors}
        doctorUserId={doctorUserId}
        onDoctorChange={handleDoctorChange}
        chairDoctorAssignments={chairDoctorAssignments}
      />
      <AssistantChairFields
        hideAssistant={hideAssistant}
        isSoloDoctor={isSoloDoctor}
        assistantUserId={assistantUserId}
        setAssistantUserId={setAssistantUserId}
        assistants={assistants}
        chairId={chairId}
        setChairId={setChairId}
        chairs={chairs}
        startsAtLocal={startsAtLocal}
        chairDoctorAssignments={chairDoctorAssignments}
        doctorUserId={doctorUserId}
        dutyDoctorId={dutyDoctorId}
        setDoctorUserId={setDoctorUserId}
      />
    </>
  );
}
