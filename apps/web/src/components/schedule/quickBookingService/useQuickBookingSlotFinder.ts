import { useCallback, useEffect, useState } from "react";
import {
  type Appointment,
  type Dashboard,
  type DayFreeSlots,
  findDoctorFreeSlots,
  todayDateKeyInTimeZone,
} from "@dental/shared";
import { getDenteAuthHeaders } from "../../../lib/denteRequestHeaders";
import { showToast } from "../../GlobalToast";
import { deriveClinicWorkingHours } from "../freeSlotsModules";
import { mapReservationsToMaintenanceBlocks } from "../grid/useScheduleTimeReservations";
import type { ScheduleTimeReservationItem } from "../ScheduleTimeReservationModal";

interface SlotFinderParams {
  dashboard?: Dashboard | null | undefined;
  startsAtLocal: string;
  doctorUserId: string;
  durationMinutes: number;
  chairs: Array<{ id: string; name: string }>;
}

export function useQuickBookingSlotFinder({
  dashboard,
  startsAtLocal,
  doctorUserId,
  durationMinutes,
  chairs,
}: SlotFinderParams) {
  const [isSearchingSlots, setIsSearchingSlots] = useState(false);
  const [freeSlotsList, setFreeSlotsList] = useState<DayFreeSlots[]>([]);
  const [reservations, setReservations] = useState<ScheduleTimeReservationItem[]>([]);

  const loadReservations = useCallback(async (): Promise<ScheduleTimeReservationItem[]> => {
    if (typeof window === "undefined" || typeof globalThis.fetch !== "function") {
      return [];
    }
    try {
      const res = await fetch("/api/schedule/time-reservations", {
        headers: getDenteAuthHeaders(),
      });
      if (!res.ok) return [];
      const json = (await res.json()) as { data?: ScheduleTimeReservationItem[] };
      const list = Array.isArray(json?.data) ? json.data.filter((r) => r.bookingLocked !== false) : [];
      setReservations(list);
      return list;
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    void loadReservations();
    if (typeof window === "undefined") return;
    const onUpdated = () => {
      void loadReservations();
    };
    window.addEventListener("dente:schedule-reservations-updated", onUpdated);
    return () => window.removeEventListener("dente:schedule-reservations-updated", onUpdated);
  }, [loadReservations]);

  const handleFindFreeSlots = async () => {
    if (!dashboard) {
      showToast("Данные расписания загружаются...", "info");
      return;
    }
    const latestReservations = reservations.length > 0 ? reservations : await loadReservations();
    const reservationBlocks = mapReservationsToMaintenanceBlocks(latestReservations, chairs);
    const reservationAsAppointments: Appointment[] = reservationBlocks.map((block) => ({
      id: block.id,
      patientId: null,
      doctorUserId: null,
      chairId: block.chairId,
      startsAt: block.startsAt,
      endsAt: block.endsAt,
      status: "planned",
      reason: block.note ?? null,
      comment: null,
      organizationId: "",
    }));

    const clinicTz = dashboard.clinicSettings?.profile?.timezone;
    const startDate = startsAtLocal
      ? startsAtLocal.slice(0, 10)
      : todayDateKeyInTimeZone(clinicTz);
    // Рабочее окно — из реальных настроек клиники и графика выбранного врача
    const workingWindow = deriveClinicWorkingHours(dashboard, doctorUserId || undefined);
    const found = findDoctorFreeSlots({
      doctorId: doctorUserId || undefined,
      startDate,
      horizonDays: 7,
      durationMinutes: durationMinutes || 30,
      appointments: [...(dashboard.appointments || []), ...reservationAsAppointments],
      chairs: chairs.map((c) => ({ id: c.id, name: c.name, active: true })),
      clinicStartHour: workingWindow.clinicStartHour,
      clinicEndHour: workingWindow.clinicEndHour,
      workingDays: workingWindow.workingDays,
      perDayWorkingHours: workingWindow.perDayWorkingHours,
      stepMinutes: 15,
    });
    setFreeSlotsList(found);
    setIsSearchingSlots(true);
  };

  return { isSearchingSlots, setIsSearchingSlots, freeSlotsList, handleFindFreeSlots };
}
