import type { ChangeEvent } from "react";
import type { Appointment, Dashboard } from "@dental/shared";
export type { AppointmentScheduleDraft } from "../../../utils/draftDefaults";

export type AppointmentScheduleSaveState = "idle" | "saving" | "saved" | "error";
export type TextFieldChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
export type SelectChangeEvent = ChangeEvent<HTMLSelectElement>;

export const activeVisitLockedAppointmentStatuses = new Set<Appointment["status"]>([
  "completed",
  "cancelled",
  "no_show",
]);
