import { useMemo, useState, useCallback } from "react";
import type { Appointment } from "@dental/shared";
import type { ScheduleMobileAgendaViewProps, TimelineItem, WeekDayItem } from "./scheduleMobileAgendaTypes";
import { RUSSIAN_MONTHS, RUSSIAN_DAY_NAMES } from "./scheduleMobileAgendaTypes";

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

  const weekDays = useMemo(() => {
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

  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [];
    if (filteredDayAppointments.length === 0) return items;

    let prev: Appointment | undefined;
    for (const current of filteredDayAppointments) {
      const currentStartLocal = toDateTimeLocalValue(current.startsAt, timezone);
      const currentEndLocal = toDateTimeLocalValue(current.endsAt, timezone);
      const currentStartDate = new Date(current.startsAt);
      const currentEndDate = new Date(current.endsAt);
      const durationMinutes = Math.max(15, Math.round((currentEndDate.getTime() - currentStartDate.getTime()) / 60000));

      if (prev) {
        const prevEndDate = new Date(prev.endsAt);
        const gapMinutes = Math.round((currentStartDate.getTime() - prevEndDate.getTime()) / 60000);
        if (gapMinutes >= 15) {
          const prevEndLocal = toDateTimeLocalValue(prev.endsAt, timezone);
          items.push({
            type: "gap",
            startsAt: prev.endsAt,
            endsAt: current.startsAt,
            durationMinutes: gapMinutes,
            startsAtLocal: prevEndLocal.slice(11, 16),
            endsAtLocal: currentStartLocal.slice(11, 16),
          });
        }
      }

      items.push({
        type: "appointment",
        appointment: current,
        startsAtLocal: currentStartLocal.slice(11, 16),
        endsAtLocal: currentEndLocal.slice(11, 16),
        durationMinutes,
      });

      prev = current;
    }
    return items;
  }, [filteredDayAppointments, toDateTimeLocalValue, timezone]);

  const handleAdjustDuration = async (appt: Appointment, delta: number) => {
    if (!onAppointmentMove) return;
    const start = new Date(appt.startsAt);
    const end = new Date(appt.endsAt);
    const newEnd = new Date(end.getTime() + delta * 60000);
    if (newEnd <= start) return;
    await onAppointmentMove(appt.id, { endsAt: newEnd.toISOString() });
  };

  const handleShiftLateness = async (appt: Appointment, shift: number) => {
    if (!onAppointmentMove) return;
    const start = new Date(appt.startsAt);
    const end = new Date(appt.endsAt);
    await onAppointmentMove(appt.id, {
      startsAt: new Date(start.getTime() + shift * 60000).toISOString(),
      endsAt: new Date(end.getTime() + shift * 60000).toISOString(),
    });
  };

  const handleReassignChair = async (appt: Appointment, chairId: string | null) => {
    if (!onAppointmentMove) return;
    await onAppointmentMove(appt.id, chairId ? { chairId } : {});
  };

  const handleReassignDoctor = async (appt: Appointment, doctorUserId: string) => {
    if (!onAppointmentMove) return;
    await onAppointmentMove(appt.id, { doctorUserId });
  };

  return {
    selectedMobileAppt,
    setSelectedMobileAppt,
    todayKey,
    effectiveDateKey,
    weekDays,
    monthHeaderTitle,
    handleShiftWeek,
    doctors,
    chairs,
    timelineItems,
    handleAdjustDuration,
    handleShiftLateness,
    handleReassignChair,
    handleReassignDoctor,
  };
}
