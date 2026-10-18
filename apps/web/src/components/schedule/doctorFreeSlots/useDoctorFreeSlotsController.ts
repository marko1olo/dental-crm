import { useState, useMemo } from "react";
import type { Dashboard } from "@dental/shared";
import {
  findDoctorFreeSlots,
  type TimeOfDayFilter,
} from "../doctorFreeSlotsEngine";

export interface UseDoctorFreeSlotsParams {
  dashboard: Dashboard;
  initialDoctorId?: string | null | undefined;
}

export function useDoctorFreeSlotsController({ dashboard, initialDoctorId }: UseDoctorFreeSlotsParams) {
  const staffDoctors = useMemo(() => {
    return (dashboard?.clinicSettings?.staff ?? []).filter(
      (s) => s.active && (s.role === "doctor" || s.role === "owner"),
    );
  }, [dashboard?.clinicSettings?.staff]);

  const clinicChairs = useMemo(() => {
    return (dashboard?.clinicSettings?.chairs ?? []).filter((c) => c.active !== false);
  }, [dashboard?.clinicSettings?.chairs]);

  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(initialDoctorId || "");
  const [selectedChairId, setSelectedChairId] = useState<string>("");
  const [horizonDays, setHorizonDays] = useState<number>(7);
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [timeOfDayFilter, setTimeOfDayFilter] = useState<TimeOfDayFilter>("all");
  const [startDateOffsetDays, setStartDateOffsetDays] = useState<number>(0);
  const [activeRangeLabel, setActiveRangeLabel] = useState<string>("На этой неделе");

  const activeStartDateIso = useMemo(() => {
    const now = new Date();
    if (startDateOffsetDays > 0) {
      now.setDate(now.getDate() + startDateOffsetDays);
    }
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, [startDateOffsetDays]);

  const freeSlotsByDay = useMemo(() => {
    return findDoctorFreeSlots({
      doctorId: selectedDoctorId || undefined,
      chairId: selectedChairId || undefined,
      startDate: activeStartDateIso,
      horizonDays,
      durationMinutes,
      timeOfDayFilter,
      appointments: dashboard?.appointments ?? [],
      chairs: dashboard?.clinicSettings?.chairs ?? [],
      clinicStartHour: 9,
      clinicEndHour: 20,
      stepMinutes: durationMinutes <= 30 ? 15 : 30,
    });
  }, [
    selectedDoctorId,
    selectedChairId,
    activeStartDateIso,
    horizonDays,
    durationMinutes,
    timeOfDayFilter,
    dashboard?.appointments,
    dashboard?.clinicSettings?.chairs,
  ]);

  const totalSlotsCount = useMemo(() => {
    return freeSlotsByDay.reduce((acc, day) => acc + day.slots.length, 0);
  }, [freeSlotsByDay]);

  const selectedDoctor = staffDoctors.find((d) => d.id === selectedDoctorId);
  const selectedChair = clinicChairs.find((c) => c.id === selectedChairId);

  return {
    staffDoctors,
    clinicChairs,
    selectedDoctorId,
    setSelectedDoctorId,
    selectedChairId,
    setSelectedChairId,
    horizonDays,
    setHorizonDays,
    durationMinutes,
    setDurationMinutes,
    timeOfDayFilter,
    setTimeOfDayFilter,
    setStartDateOffsetDays,
    activeRangeLabel,
    setActiveRangeLabel,
    freeSlotsByDay,
    totalSlotsCount,
    selectedDoctor,
    selectedChair,
  };
}
