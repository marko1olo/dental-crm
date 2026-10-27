import type { Dashboard } from "@dental/shared";
import { applyDoctorChairDateRange, type DateRangeShiftPreset } from "../roster/DoctorShiftRosterModal";
import { DEFAULT_SOLO_CHAIR, formatDoctorShortName, type ChairDoctorShiftAssignment } from "../ScheduleGrid";
import type { ScheduleChair } from "../ScheduleFilterStrip";
import { showToast } from "../../GlobalToast";
import { safeLocalStorageGetJson, safeLocalStorageSetJson } from "../../../lib/safeLocalStorage";
import { syncShiftsWithServer } from "../ChairScheduleTypes";

export function performApplyDateRange(
  params: {
    rangeDoctorId: string;
    rangeChairId: string;
    rangeStartDate: string;
    rangeEndDate: string;
    rangePreset: DateRangeShiftPreset;
    doctors: Array<{ id: string; fullName: string }>;
    chairs: ScheduleChair[];
    dashboard?: Dashboard | null;
    dateKey: string;
    onAssignChairDoctor?: (chairId: string, assignment: ChairDoctorShiftAssignment | null) => void;
    setIsDateRangeModalOpen: (open: boolean) => void;
  },
) {
  const {
    rangeDoctorId, rangeChairId, rangeStartDate, rangeEndDate, rangePreset,
    doctors, chairs, dashboard, dateKey, onAssignChairDoctor, setIsDateRangeModalOpen,
  } = params;

  const targetDocId = rangeDoctorId || doctors[0]?.id;
  const targetChairId = rangeChairId || chairs[0]?.id || DEFAULT_SOLO_CHAIR.id;
  if (!rangeStartDate || !rangeEndDate || !targetDocId || !targetChairId) {
    showToast("Укажите диапазон дат, врача и кресло", "warning");
    return;
  }
  const doc = doctors.find((d) => d.id === targetDocId) || (dashboard?.clinicSettings?.staff ?? []).find((s) => s.id === targetDocId);
  const chairObj = chairs.find((c) => c.id === targetChairId) || DEFAULT_SOLO_CHAIR;

  if (typeof window !== "undefined") {
    const currentShifts = safeLocalStorageGetJson<any[]>("dente_doctor_shifts", []);
    const updatedShifts = applyDoctorChairDateRange(currentShifts, {
      startDateIso: rangeStartDate,
      endDateIso: rangeEndDate,
      doctorId: targetDocId,
      chairId: targetChairId,
      shiftPreset: rangePreset,
      staffList: (dashboard?.clinicSettings?.staff as any) || (doctors as any),
    });
    safeLocalStorageSetJson("dente_doctor_shifts", updatedShifts);

    if (dateKey && dateKey >= rangeStartDate && dateKey <= rangeEndDate) {
      const isMorn = rangePreset === "morning" || rangePreset === "morning_9";
      const isEve = rangePreset === "evening" || rangePreset === "evening_15";
      const startH = rangePreset === "morning_9" ? 9 : rangePreset === "evening_15" ? 15 : isEve ? 14 : 8;
      const endH = rangePreset === "morning_9" ? 15 : rangePreset === "evening_15" ? 21 : isEve ? 20 : 14;
      const sHours = `${String(startH).padStart(2, "0")}:00–${String(endH).padStart(2, "0")}:00`;
      const sLabel = rangePreset === "morning_9" ? "1 см. 09-15" : rangePreset === "evening_15" ? "2 см. 15-21" : isEve ? "Вечер 14-20" : isMorn ? "Утро 08-14" : "Весь день";

      const assignment: ChairDoctorShiftAssignment = {
        chairId: targetChairId, chairName: chairObj.name, doctorId: targetDocId,
        doctorName: doc?.fullName || "Врач",
        doctorSpecialty: doc && (doc as any).specialty ? String((doc as any).specialty) : undefined,
        shiftPreset: isMorn ? "morning" : isEve ? "evening" : "full",
        shiftLabel: sLabel, shiftHours: sHours, startHour: startH, endHour: endH,
      };

      const storageKey = `dente_chair_doctor_assignments_${dateKey}`;
      const existing = safeLocalStorageGetJson<Record<string, ChairDoctorShiftAssignment>>(storageKey, {});
      existing[targetChairId] = assignment;
      safeLocalStorageSetJson(storageKey, existing);
      syncShiftsWithServer(dateKey, existing, chairs).catch(() => {});
      if (onAssignChairDoctor) onAssignChairDoctor(targetChairId, assignment);
    }
  }

  showToast(
    `График врача ${doc?.fullName ? formatDoctorShortName(doc.fullName) : ""} применен на кресло «${chairObj.name}» (${rangeStartDate} — ${rangeEndDate})`,
    "success",
    3500,
  );
  setIsDateRangeModalOpen(false);
}
