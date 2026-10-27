import type { Dashboard } from "@dental/shared";
import type { ChairDoctorShiftAssignment } from "../ScheduleGrid";
import { DEFAULT_CLINIC_CHAIRS, type ScheduleChair } from "../ScheduleFilterStrip";
import { showToast } from "../../GlobalToast";
import { safeLocalStorageGetItem, safeLocalStorageGetJson, safeLocalStorageSetJson } from "../../../lib/safeLocalStorage";
import { syncShiftsWithServer } from "../ChairScheduleTypes";

export function performApplyDoctorPreferredChairs(
  chairs: ScheduleChair[],
  doctors: Array<{ id: string; fullName: string }>,
  dashboard: Dashboard | null | undefined,
  dateKey: string,
  onAssignChairDoctor?: (chairId: string, assignment: ChairDoctorShiftAssignment | null) => void,
) {
  const targetChairs = (chairs.length > 0 ? chairs : DEFAULT_CLINIC_CHAIRS).filter((c) => c.active !== false);
  let storedPreferredMap: Record<string, string> = {};
  let storedChairDefaultMap: Record<string, string> = {};
  if (typeof window !== "undefined") {
    storedPreferredMap = safeLocalStorageGetJson<Record<string, string>>("dente_doctor_preferred_chairs", {});
    storedChairDefaultMap = safeLocalStorageGetJson<Record<string, string>>("dente_chair_default_doctors", {});
  }

  const todayAssignments: Record<string, ChairDoctorShiftAssignment> = {};
  if (typeof window !== "undefined" && dateKey) {
    const raw = safeLocalStorageGetItem(`dente_chair_doctor_assignments_${dateKey}`);
    if (raw) { try { Object.assign(todayAssignments, JSON.parse(raw)); } catch {} }
  }

  for (const chair of targetChairs) {
    const boundDoc =
      doctors.find((d) => {
        if ((d as any).preferredChairId === chair.id) return true;
        if (storedPreferredMap[d.id] === chair.id) return true;
        if ((chair as any).defaultDoctorId === d.id) return true;
        if (storedChairDefaultMap[chair.id] === d.id) return true;
        return false;
      }) ||
      (dashboard?.clinicSettings?.staff ?? []).find((s) => {
        if ((s as any).preferredChairId === chair.id) return true;
        if (storedPreferredMap[s.id] === chair.id) return true;
        if ((chair as any).defaultDoctorId === s.id) return true;
        if (storedChairDefaultMap[chair.id] === s.id) return true;
        return false;
      });

    if (boundDoc) {
      const assignment: ChairDoctorShiftAssignment = {
        chairId: chair.id, chairName: chair.name, doctorId: boundDoc.id, doctorName: boundDoc.fullName,
        doctorSpecialty: (boundDoc as any).specialty ? String((boundDoc as any).specialty) : undefined,
        shiftPreset: "full", shiftLabel: "Весь день", shiftHours: "08:00–20:00", startHour: 8, endHour: 20,
      };
      todayAssignments[chair.id] = assignment;
      if (onAssignChairDoctor) onAssignChairDoctor(chair.id, assignment);
    }
  }

  if (typeof window !== "undefined" && dateKey) {
    safeLocalStorageSetJson(`dente_chair_doctor_assignments_${dateKey}`, todayAssignments);
    syncShiftsWithServer(dateKey, todayAssignments, targetChairs).catch(() => {});
  }

  showToast("Закреплённые врачи назначены на смены дня", "success", 3500);
}
