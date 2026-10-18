import { useMemo } from "react";
import type { Appointment } from "@dental/shared";
import type { WeekDayItem } from "./scheduleMobileAgendaTypes";
import { RUSSIAN_DAY_NAMES } from "./scheduleMobileAgendaTypes";

export interface UseMobileWeekDaysParams {
  effectiveDateKey: string;
  todayKey: string;
  appointments: Appointment[];
  toDateTimeLocalValue: (iso: string, tz?: string) => string;
  timezone: string;
}

export function useMobileWeekDays({
  effectiveDateKey,
  todayKey,
  appointments,
  toDateTimeLocalValue,
  timezone,
}: UseMobileWeekDaysParams): WeekDayItem[] {
  return useMemo(() => {
    const parts = effectiveDateKey.split("-").map(Number);
    const targetDate = new Date(parts[0] ?? 2026, (parts[1] ?? 1) - 1, parts[2] ?? 1);
    const distanceToMonday = (targetDate.getDay() + 6) % 7;
    const monday = new Date(targetDate);
    monday.setDate(targetDate.getDate() - distanceToMonday);

    const days: WeekDayItem[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const dayLabel = RUSSIAN_DAY_NAMES[d.getDay()] ?? "Пн";
      const dayAppointments = appointments.filter((a) => {
        if (!a.startsAt) return false;
        return toDateTimeLocalValue(a.startsAt, timezone).startsWith(iso);
      });

      days.push({
        dateIso: iso,
        dayLabel,
        dayNumber: d.getDate(),
        isToday: iso === todayKey,
        isSelected: iso === effectiveDateKey,
        hasAppointments: dayAppointments.length > 0,
        appointmentCount: dayAppointments.length,
      });
    }
    return days;
  }, [effectiveDateKey, todayKey, appointments, toDateTimeLocalValue, timezone]);
}
