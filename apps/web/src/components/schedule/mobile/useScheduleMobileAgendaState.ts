import { useMemo, useState, useCallback } from "react";
import type { Appointment } from "@dental/shared";
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

  const todayKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  const effectiveDateKey = dateKey || todayKey;

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
    const parts = effectiveDateKey.split("-").map(Number);
    const d = new Date(parts[0] ?? 2026, (parts[1] ?? 1) - 1, (parts[2] ?? 1) + deltaDays);
    onDateChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }, [effectiveDateKey, onDateChange]);

  const doctors = useMemo(() => {
    return (dashboard?.clinicSettings?.staff ?? []).filter(
      (s: any) => s.active !== false && (s.role === "doctor" || s.specialties?.length || s.specialty)
    );
  }, [dashboard?.clinicSettings?.staff]);

  const chairs = useMemo(() => {
    return (dashboard?.clinicSettings?.chairs ?? []).filter((c: any) => c.active !== false);
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
    effectiveDateKey,
    weekDays,
    monthHeaderTitle,
    handleShiftWeek,
    doctors,
    chairs,
    timelineItems,
    selectedMobileAppt,
    setSelectedMobileAppt,
    ...actions,
  };
}
