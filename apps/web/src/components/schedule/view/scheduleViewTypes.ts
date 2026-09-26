import type { ChangeEvent } from "react";
import type { Appointment, Dashboard } from "@dental/shared";

export type AppointmentScheduleDraft = {
  patientId: string;
  doctorUserId: string;
  assistantUserId?: string | null;
  chairId: string;
  startsAt: string;
  endsAt: string;
  status: Appointment["status"];
  reason?: string;
  comment?: string;
  notes?: string;
  cancellationReason?: string;
};

export type AppointmentScheduleSaveState = "idle" | "saving" | "saved" | "error";
export type TextFieldChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
export type SelectChangeEvent = ChangeEvent<HTMLSelectElement>;

export const activeVisitLockedAppointmentStatuses = new Set<Appointment["status"]>([
  "completed",
  "cancelled",
  "no_show",
]);
