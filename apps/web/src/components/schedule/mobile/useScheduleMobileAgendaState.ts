import { useMemo, useState, useCallback } from "react";
import {
  type Appointment,
  shiftCalendarDay,
  todayDateKeyInTimeZone,
  tomorrowDateKeyInTimeZone,
} from "@dental/shared";
import type { ScheduleMobileAgendaViewProps } from "./scheduleMobileAgendaTypes";
import { RUSSIAN_MONTHS } from "./scheduleMobileAgendaTypes";
import { useMobileWeekDays } from "./useMobileWeekDays";
import { useMobileTimelineItems } from "./useMobileTimelineItems";
import { useMobileAppointmentActions } from "./useMobileAppointmentActions";

export function useScheduleMobileAgendaState(props: ScheduleMobileAgendaViewProps) {
  const {
    dashboard,
    dateKey,
    appointments = [],
    onDateChange,
    onAppointmentMove,
    selectedChairId = null,
    selectedDoctorId = null,
    toDateTimeLocalValue,
    timezone = "Europe/Moscow",
  } = props;

  const [selectedMobileAppt, setSelectedMobileAppt] = useState<Appointment | null>(null);

  const todayKey = useMemo(() => todayDateKeyInTimeZone(timezone), [timezone]);

  const tomorrowKey = useMemo(() => tomorrowDateKeyInTimeZone(timezone), [timezone]);

  const effectiveDateKey = dateKey || todayKey;

  const handleShiftDay = useCallback((deltaDays: number) => {
    onDateChange(shiftCalendarDay(effectiveDateKey, deltaDays));
  }, [effectiveDateKey, onDateChange]);

  const weekDays = useMobileWeekDays({
    effectiveDateKey,
    todayKey,
    appointments,
    toDateTimeLocalValue,
    timezone,
  });

  const monthHeaderTitle = useMemo(() => {
    const parts = effectiveDateKey.split("-").map(Number);
    return `${RUSSIAN_MONTHS[(parts[1] ?? 1) - 1] ?? ""} ${parts[0] ?? 2026}`;
  }, [effectiveDateKey]);

  const handleShiftWeek = useCallback((deltaDays: number) => {
    onDateChange(shiftCalendarDay(effectiveDateKey, deltaDays));
  }, [effectiveDateKey, onDateChange]);

  const doctors = useMemo(() => {
    return (dashboard?.clinicSettings?.staff ?? []).filter(
      (s) =>
        s.active !== false &&
        (s.role === "doctor" ||
          Boolean((s as { specialties?: unknown[] }).specialties?.length) ||
          Boolean((s as { specialty?: unknown }).specialty)),
    );
  }, [dashboard?.clinicSettings?.staff]);

  const chairs = useMemo(() => {
    return (dashboard?.clinicSettings?.chairs ?? []).filter((c) => c.active !== false);
  }, [dashboard?.clinicSettings?.chairs]);

  const filteredDayAppointments = useMemo(() => {
    return appointments
      .filter((appt) => {
        if (!appt.startsAt) return false;
        if (!toDateTimeLocalValue(appt.startsAt, timezone).startsWith(effectiveDateKey)) return false;
        if (selectedDoctorId && appt.doctorUserId !== selectedDoctorId) return false;
        if (selectedChairId && appt.chairId !== selectedChairId) return false;
        return true;
      })
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [appointments, effectiveDateKey, selectedDoctorId, selectedChairId, toDateTimeLocalValue, timezone]);

  const timelineItems = useMobileTimelineItems({
    filteredDayAppointments,
    toDateTimeLocalValue,
    timezone,
  });

  const actions = useMobileAppointmentActions({ onAppointmentMove });

  return {
    todayKey,
    tomorrowKey,
    effectiveDateKey,
    weekDays,
    monthHeaderTitle,
    handleShiftWeek,
    handleShiftDay,
    doctors,
    chairs,
    timelineItems,
    selectedMobileAppt,
    setSelectedMobileAppt,
    ...actions,
  };
}
