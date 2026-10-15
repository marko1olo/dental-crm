import React from "react";
import { ScheduleViewToolbar } from "../view/ScheduleViewToolbar";
import { ScheduleAdminUnlockFieldset } from "../view/ScheduleAdminUnlockFieldset";
import { NewAppointmentForm } from "../NewAppointmentForm";
import type { ScheduleHeaderToolbarProps } from "./types";

export function ScheduleHeaderToolbar(props: ScheduleHeaderToolbarProps) {
  return (
    <>
      <ScheduleViewToolbar {...(props as any)} />

      <ScheduleAdminUnlockFieldset
        scheduleAdminSecretNeeded={props.scheduleAdminSecretNeeded}
        scheduleAdminSecretSession={props.scheduleAdminSecretSession}
        scheduleAdminSecretDraft={props.scheduleAdminSecretDraft}
        setScheduleAdminSecretDraft={props.setScheduleAdminSecretDraft}
        scheduleAdminSecretReason={props.scheduleAdminSecretReason}
        adminSecretReady={props.adminSecretReady}
        unlockScheduleAdminSession={props.unlockScheduleAdminSession}
        lockScheduleAdminSession={props.lockScheduleAdminSession}
        showToast={props.showToast}
      />

      <NewAppointmentForm
        dashboard={props.dashboard}
        appointmentLabels={props.appointmentLabels}
        newAppointmentDraft={props.newAppointmentDraft}
        newAppointmentSaveState={props.newAppointmentSaveState}
        newAppointmentError={props.newAppointmentError}
        updateNewAppointmentDraft={props.updateNewAppointmentDraft}
        createAppointmentFromDraft={props.createAppointmentFromDraft}
        resetNewAppointmentDraft={props.resetNewAppointmentDraft}
        toDateTimeLocalValue={props.toDateTimeLocalValue}
        fromDateTimeLocalValue={props.fromDateTimeLocalValue}
        useManualSelects={props.useManualSelects}
        setUseManualSelects={props.setUseManualSelects}
        showCreateForm={props.showCreateForm}
        setShowCreateForm={props.setShowCreateForm}
        isSmartAiOpen={props.isSmartAiOpen}
        setIsSmartAiOpen={props.setIsSmartAiOpen}
        chairDoctorAssignments={props.computedChairDoctorAssignments}
      />
    </>
  );
}
