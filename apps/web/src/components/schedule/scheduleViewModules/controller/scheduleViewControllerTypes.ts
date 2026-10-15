/**
 * scheduleViewControllerTypes.ts
 *
 * Layer 0: Строгие контракты типов контроллера расписания
 * (фильтры, масштаб сетки, режимы отображения, драг-н-дроп и сценическое планирование).
 */

import type { Appointment, Dashboard } from "@dental/shared";
import type { QuickBookingSlotInfo } from "../../QuickBookingDrawer";
import type { TargetSlotInfo } from "../../WaitlistDrawer";
import type { DayGroupingAppointment, ScheduleDayGroup } from "../../scheduleDayGrouping";

export type ScheduleGridStep = 15 | 30 | 60;
export type ScheduleViewMode = "timeline" | "grid" | "chairs";

export interface ScheduleGridNavigationOptions {
  scheduleDateFilter: string;
  setScheduleDateFilter: (date: string) => void;
  clinicToday: string;
  todayScheduleDate: () => string;
  effectiveSortedAppointments: Appointment[];
  dashboard: Dashboard | null | undefined;
  toDateTimeLocalValue?: (iso: string, tz?: string) => string;
  scheduleDoctorFilterId: string | null;
  scheduleAssistantFilterId?: string | null;
  scheduleChairFilterId: string | null;
  setScheduleDoctorFilterId: (id: string | null) => void;
  setScheduleAssistantFilterId: (id: string | null) => void;
  setScheduleChairFilterId: (id: string | null) => void;
  setScheduleStatusFilter?: (status: "cancelled" | "completed" | "confirmed" | "no_show" | "in_treatment" | "planned" | "arrived" | "all") => void;
}

export interface ScheduleGridNavigationResult {
  scheduleGridStep: ScheduleGridStep;
  setScheduleGridStep: (step: ScheduleGridStep) => void;
  scheduleViewMode: ScheduleViewMode;
  setScheduleViewMode: (mode: ScheduleViewMode) => void;
  currentDateKey: string;
  scheduleDayGroups: ScheduleDayGroup[];
  visibleDayGroups: ScheduleDayGroup[];
  scheduleOverlapCount: number;
  shiftQueueCounts: {
    all: number;
    arrived: number;
    inTreatment: number;
    awaitingPayment: number;
  };
  stepScheduleDay: (deltaDays: number) => void;
  resetScheduleFilters: () => void;
  openScheduleSuggestion: (section: string) => void;
}

export interface ScheduleAppointmentDragDropOptions {
  dashboard: Dashboard | null | undefined;
  pendingStageBooking: QuickBookingSlotInfo | null;
  setPendingStageBooking: (slot: QuickBookingSlotInfo | null) => void;
  repeatAppointment?: (appointment: Appointment) => void;
  copyAppointmentToBuffer?: (appointment: Appointment) => void;
}

export interface ScheduleAppointmentDragDropResult {
  quickBookingOpen: boolean;
  setQuickBookingOpen: (open: boolean) => void;
  quickBookingSlot: QuickBookingSlotInfo | null;
  setQuickBookingSlot: (slot: QuickBookingSlotInfo | null) => void;
  waitlistOpen: boolean;
  setWaitlistOpen: (open: boolean) => void;
  waitlistQuickFillSlot: TargetSlotInfo | null;
  setWaitlistQuickFillSlot: (slot: TargetSlotInfo | null) => void;
  handleOpenWaitlistForSlot: (slot: TargetSlotInfo) => void;
}
