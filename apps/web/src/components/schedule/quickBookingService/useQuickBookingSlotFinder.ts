import { useState } from "react";
import type { Dashboard } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import {
  type DayFreeSlots,
  deriveClinicWorkingHours,
  findDoctorFreeSlots,
} from "../doctorFreeSlotsEngine";

interface SlotFinderParams {
  dashboard?: Dashboard | undefined;
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

  const handleFindFreeSlots = () => {
    if (!dashboard) {
      showToast("Данные расписания загружаются...", "info");
      return;
    }
    const startDate = startsAtLocal
      ? startsAtLocal.slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    // Рабочее окно — из реальных настроек клиники и графика выбранного
    // врача, а не константа 9:00–20:00, иначе поиск предлагал часы,
    // когда врач физически не работает.
    const workingWindow = deriveClinicWorkingHours(dashboard, doctorUserId || undefined);
    const found = findDoctorFreeSlots({
      doctorId: doctorUserId || undefined,
      startDate,
      horizonDays: 7,
      durationMinutes: durationMinutes || 30,
      appointments: dashboard.appointments || [],
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
