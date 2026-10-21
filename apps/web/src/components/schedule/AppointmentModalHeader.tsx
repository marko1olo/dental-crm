import type { Appointment, Dashboard } from "@dental/shared";
import React from "react";
import { formatDoctorShortName } from "./appointmentCardHelpers";
import { AppointmentModalHeaderTitle } from "./appointmentModalHeader/AppointmentModalHeaderTitle";
import { AppointmentModalHeaderActions } from "./appointmentModalHeader/AppointmentModalHeaderActions";

export interface AppointmentModalHeaderProps {
  appointment: Appointment;
  dashboard: Dashboard;
  patientId: string;
  currentPatientName: string;
  startsAtLocal: string;
  endsAtLocal: string;
  isNewAppointment: boolean;
  isCito: boolean;
  onConvertToCito: () => void;
  onClose: () => void;
  repeatAppointment?: ((appointment: Appointment) => void) | undefined;
  copyAppointmentToBuffer?: ((appointment: Appointment) => void) | undefined;
}

export function AppointmentModalHeader({
  appointment,
  dashboard,
  patientId,
  currentPatientName,
  startsAtLocal,
  endsAtLocal,
  isNewAppointment,
  isCito,
  onConvertToCito,
  onClose,
  repeatAppointment,
  copyAppointmentToBuffer,
}: AppointmentModalHeaderProps) {
  const shortPatient = formatDoctorShortName(currentPatientName) || currentPatientName;
  const headerTitle = isNewAppointment ? "Запись на приём" : `Запись: ${shortPatient}`;

  return (
    <div className="px-4 py-2.5 sm:py-3 border-b border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between gap-2.5 sm:gap-3 flex-nowrap shrink-0">
      <AppointmentModalHeaderTitle
        headerTitle={headerTitle}
        isNewAppointment={isNewAppointment}
        currentPatientName={currentPatientName}
        isCito={isCito}
        startsAtLocal={startsAtLocal}
        endsAtLocal={endsAtLocal}
      />
      <AppointmentModalHeaderActions
        appointment={appointment}
        dashboard={dashboard}
        patientId={patientId}
        currentPatientName={currentPatientName}
        isNewAppointment={isNewAppointment}
        isCito={isCito}
        onConvertToCito={onConvertToCito}
        onClose={onClose}
        repeatAppointment={repeatAppointment}
        copyAppointmentToBuffer={copyAppointmentToBuffer}
      />
    </div>
  );
}
