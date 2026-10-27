import type { Dashboard } from "@dental/shared";
import { getMondayOfWeekIso, applyDoctorChairWeeklyTemplate } from "../roster/DoctorShiftRosterModal";
import { formatDoctorShortName, type ChairDoctorShiftAssignment } from "../ScheduleGrid";
import type { ScheduleChair } from "../ScheduleFilterStrip";
import { showToast } from "../../GlobalToast";
import {
  safeLocalStorageGetJson,
  safeLocalStorageSetJson,
} from "../../../lib/safeLocalStorage";
import { calculatePresetAssignment, syncShiftsWithServer } from "../ChairScheduleTypes";

export function performAssignShift(
  chair: ScheduleChair,
  preset: "morning" | "morning_9" | "evening" | "evening_15" | "full" | "full_9_21" | "2x2" | "even_odd",
  popoverSelectedDocId: Record<string, string>,
  chairDoctorAssignments: Record<string, ChairDoctorShiftAssignment> | undefined,
  doctors: Array<{ id: string; fullName: string }>,
  dateKey: string,
  dashboard: Dashboard | null | undefined,
  chairs: ScheduleChair[],
  onAssignChairDoctor?: (chairId: string, assignment: ChairDoctorShiftAssignment | null) => void,
  setActiveShiftChairId?: (id: string | null) => void,
) {
  const targetDocId =
    popoverSelectedDocId[chair.id] ||
    chairDoctorAssignments?.[chair.id]?.doctorId ||
    (chair as any).defaultDoctorId ||
    doctors[0]?.id;
  const targetDoc = doctors.find((d) => d.id === targetDocId) || doctors[0];

  if (!targetDoc) {
    showToast("Нет доступных врачей: добавьте врача в настройках клиники", "warning");
    setActiveShiftChairId?.(null);
    return;
  }

  let existingAssignment: ChairDoctorShiftAssignment | null = chairDoctorAssignments?.[chair.id] || null;
  if (!existingAssignment && typeof window !== "undefined" && dateKey) {
    const storageKey = `dente_chair_doctor_assignments_${dateKey}`;
    const parsed = safeLocalStorageGetJson<Record<string, ChairDoctorShiftAssignment> | null>(storageKey, null);
    if (parsed?.[chair.id]) existingAssignment = parsed[chair.id] ?? null;
  }

  const assignment = calculatePresetAssignment(chair, targetDoc, preset, existingAssignment, dateKey);
  let updatedTodayAssignments: Record<string, ChairDoctorShiftAssignment> = {};

  if (typeof window !== "undefined" && dateKey) {
    const storageKey = `dente_chair_doctor_assignments_${dateKey}`;
    const existing = safeLocalStorageGetJson<Record<string, ChairDoctorShiftAssignment>>(storageKey, {});
    existing[chair.id] = assignment;
    updatedTodayAssignments = existing;
    safeLocalStorageSetJson(storageKey, existing);

    if (preset === "even_odd" || preset === "2x2") {
      const currentShifts = safeLocalStorageGetJson<any[]>("dente_doctor_shifts", []);
      const mondayIso = getMondayOfWeekIso(dateKey);
      const templateId = preset === "even_odd" ? "even_odd_month" : "two_two_full";
      const updatedShifts = applyDoctorChairWeeklyTemplate(currentShifts, {
        weekStartDateIso: mondayIso,
        templateId,
        doctorId: targetDoc.id,
        chairId: chair.id,
        staffList: (dashboard?.clinicSettings?.staff as any) || (doctors as any),
      });
      safeLocalStorageSetJson("dente_doctor_shifts", updatedShifts);
    }
  }

  if (onAssignChairDoctor) onAssignChairDoctor(chair.id, assignment);
  syncShiftsWithServer(dateKey, updatedTodayAssignments, chairs).catch(() => {});
  showToast(
    `Врач назначен на смену: ${formatDoctorShortName(targetDoc.fullName)} • ${assignment.shiftLabel} • ${chair.name}`,
    "success",
  );
  setActiveShiftChairId?.(null);
}

export function performUnassignShift(
  chair: ScheduleChair,
  dateKey: string,
  chairs: ScheduleChair[],
  onAssignChairDoctor?: (chairId: string, assignment: null) => void,
  setActiveShiftChairId?: (id: string | null) => void,
) {
  let updatedAssignments: Record<string, ChairDoctorShiftAssignment> = {};
  if (typeof window !== "undefined" && dateKey) {
    const storageKey = `dente_chair_doctor_assignments_${dateKey}`;
    const existing = safeLocalStorageGetJson<Record<string, ChairDoctorShiftAssignment>>(storageKey, {});
    delete existing[chair.id];
    updatedAssignments = existing;
    safeLocalStorageSetJson(storageKey, existing);
    syncShiftsWithServer(dateKey, updatedAssignments, chairs).catch(() => {});
  }

  if (onAssignChairDoctor) onAssignChairDoctor(chair.id, null);
  showToast(`Врач снят со смены: кресло «${chair.name}» освобождено`, "info");
  setActiveShiftChairId?.(null);
}
