import type {
  Appointment,
  AppointmentReadiness,
  Dashboard,
} from "@dental/shared";
import type { ChairDoctorShiftAssignment } from "../ScheduleGrid";
import type { TargetSlotInfo } from "../WaitlistDrawer";
import type { AppointmentModalProps } from "../AppointmentModalTypes";
import type { useAppointmentModalState } from "../useAppointmentModalState";
import {
  QUICK_APPOINTMENT_REASONS,
  TECHNICAL_BREAK_PRESETS,
  isTechnicalBreakAppointment,
} from "../AppointmentModalQuickReasons";
import { resolveChairDutyDoctor } from "../QuickBookingDrawer";

export {
  resolveChairDutyDoctor,
  QUICK_APPOINTMENT_REASONS,
  TECHNICAL_BREAK_PRESETS,
  isTechnicalBreakAppointment,
};

export type { AppointmentModalProps };
export type AppointmentModalState = ReturnType<typeof useAppointmentModalState>;

export const DURATION_PRESETS = [15, 30, 45, 60, 90, 120] as const;

export function validateAppointmentDuration(minutes: number): boolean {
  return !isNaN(minutes) && minutes >= 5 && minutes <= 720;
}

export function validateAppointmentTimeRange(
  start: string,
  end: string,
): { valid: boolean; error?: string } {
  if (!start || !end) {
    return { valid: false, error: "Укажите время начала и окончания приёма" };
  }
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return { valid: false, error: "Некорректный формат даты и времени" };
  }
  if (endDate.getTime() <= startDate.getTime()) {
    return {
      valid: false,
      error: "Время окончания должно быть строго позже времени начала",
    };
  }
  return { valid: true };
}

export function formatDurationLabel(minutes: number): string {
  if (minutes === 60) return "1 час (60 мин)";
  if (minutes > 60) {
    const hours = Math.floor(minutes / 60);
    const rem = minutes % 60;
    return rem > 0 ? `${hours} ч ${rem} мин` : `${hours} ч`;
  }
  return `${minutes} мин`;
}

export interface AppointmentPatientSectionProps {
  appointment: Appointment | null;
  dashboard: Dashboard;
  state: AppointmentModalState;
}

export interface AppointmentDetailsSectionProps {
  props: AppointmentModalProps;
  state: AppointmentModalState;
}

export interface AppointmentModalBannersProps {
  props: AppointmentModalProps;
  state: AppointmentModalState;
  isNewAppointment: boolean;
}

export interface AppointmentModalFooterProps {
  props: AppointmentModalProps;
  state: AppointmentModalState;
  isNewAppointment: boolean;
}

