import type { Dashboard } from "@dental/shared";
import { type ChairDoctorShiftAssignment } from "../ScheduleGrid";
import { DEFAULT_CLINIC_CHAIRS, type ScheduleChair } from "../ScheduleFilterStrip";
import type { QuickAddChairData } from "../QuickAddChairModal";
import { showToast } from "../../GlobalToast";
import { safeLocalStorageGetItem, safeLocalStorageRemoveItem, safeLocalStorageGetJson, safeLocalStorageSetJson } from "../../../lib/safeLocalStorage";
import { syncShiftsWithServer } from "../ChairScheduleTypes";

export function performQuickSubstituteDoctor(
  chair: ScheduleChair, newDoctorId: string,
  doctors: Array<{ id: string; fullName: string }>,
  dashboard: Dashboard | null | undefined,
  chairDoctorAssignments: Record<string, ChairDoctorShiftAssignment> | undefined,
  chairs: ScheduleChair[], dateKey: string,
  onAssignChairDoctor?: (chairId: string, assignment: ChairDoctorShiftAssignment | null) => void,
  setIsSubstituteOpen?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
  setActiveShiftChairId?: (id: string | null) => void,
) {
  const targetDoc = doctors.find((d) => d.id === newDoctorId) || dashboard?.clinicSettings?.staff?.find((s) => s.id === newDoctorId) || doctors[0];
  const newDoctorName = targetDoc ? targetDoc.fullName : newDoctorId;
  const existing = chairDoctorAssignments?.[chair.id] || null;

  const updated: ChairDoctorShiftAssignment = {
    chairId: chair.id, chairName: chair.name, doctorId: newDoctorId, doctorName: newDoctorName,
    doctorSpecialty: targetDoc && (targetDoc as any).specialty ? String((targetDoc as any).specialty) : existing?.doctorSpecialty,
    shiftPreset: existing?.shiftPreset || "full", shiftLabel: existing?.shiftLabel || "Весь день",
    shiftHours: existing?.shiftHours || "08:00–20:00", startHour: existing?.startHour ?? 8, endHour: existing?.endHour ?? 20,
  };

  if (typeof window !== "undefined" && dateKey) {
    const storageKey = `dente_chair_doctor_assignments_${dateKey}`;
    const all = safeLocalStorageGetJson<Record<string, ChairDoctorShiftAssignment>>(storageKey, {});
    all[chair.id] = updated;
    safeLocalStorageSetJson(storageKey, all);
    syncShiftsWithServer(dateKey, all, chairs).catch(() => {});
  }

  if (onAssignChairDoctor) onAssignChairDoctor(chair.id, updated);
  showToast(`Врач ${newDoctorName} подменяет врача на кресле «${chair.name}»`, "success");
  setIsSubstituteOpen?.((prev) => ({ ...prev, [chair.id]: false }));
  setActiveShiftChairId?.(null);
}

export function performRotateChairShifts(
  chairs: ScheduleChair[],
  chairDoctorAssignments: Record<string, ChairDoctorShiftAssignment> | undefined,
  dateKey: string,
  onAssignChairDoctor?: (chairId: string, assignment: ChairDoctorShiftAssignment | null) => void,
) {
  const targetChairs = chairs.length > 0 ? chairs : DEFAULT_CLINIC_CHAIRS;
  if (targetChairs.length < 2) { showToast("Для ротации требуется минимум 2 кресла", "warning"); return; }

  let currentAssignments: Record<string, ChairDoctorShiftAssignment> = chairDoctorAssignments ? { ...chairDoctorAssignments } : {};
  if (typeof window !== "undefined" && dateKey) {
    const raw = safeLocalStorageGetItem(`dente_chair_doctor_assignments_${dateKey}`);
    if (raw) { try { currentAssignments = { ...JSON.parse(raw), ...currentAssignments }; } catch {} }
  }

  const n = targetChairs.length;
  const rotatedAssignments: Record<string, ChairDoctorShiftAssignment> = {};
  for (let i = 0; i < n; i++) {
    const targetChair = targetChairs[i]!;
    const sourceChair = targetChairs[(i - 1 + n) % n]!;
    const src = currentAssignments[sourceChair.id];
    if (src) rotatedAssignments[targetChair.id] = { ...src, chairId: targetChair.id, chairName: targetChair.name };
  }

  if (typeof window !== "undefined" && dateKey) {
    safeLocalStorageSetJson(`dente_chair_doctor_assignments_${dateKey}`, rotatedAssignments);
    syncShiftsWithServer(dateKey, rotatedAssignments, targetChairs).catch(() => {});
  }
  if (onAssignChairDoctor) {
    for (const chair of targetChairs) onAssignChairDoctor(chair.id, rotatedAssignments[chair.id] || null);
  }
  showToast("Выполнена циклическая ротация смен между креслами", "success", 3500);
}

export function performClearAllDayShifts(
  dateKey: string, chairs: ScheduleChair[],
  onAssignChairDoctor?: (chairId: string, assignment: null) => void,
) {
  if (typeof window !== "undefined" && dateKey) {
    safeLocalStorageRemoveItem(`dente_chair_doctor_assignments_${dateKey}`);
    syncShiftsWithServer(dateKey, {}, chairs).catch(() => {});
  }
  if (onAssignChairDoctor) {
    const targetChairs = chairs.length > 0 ? chairs : DEFAULT_CLINIC_CHAIRS;
    for (const chair of targetChairs) onAssignChairDoctor(chair.id, null);
  }
  showToast(`Все смены кресел на ${dateKey} очищены`, "info");
}

export function performDuplicateChair(
  chair: ScheduleChair,
  setEditingChair: (chair: QuickAddChairData | null) => void,
  setIsAddChairOpen: (open: boolean) => void,
  setActiveShiftChairId?: (id: string | null) => void,
) {
  const duplicatedData: QuickAddChairData = {
    name: `${chair.name} (копия)`, room: (chair as any).roomNumber || (chair as any).room || "",
    color: (chair as any).color || "var(--teal, #0d9488)", specialization: (chair as any).specialization || "therapist",
    defaultDoctorId: (chair as any).defaultDoctorId || null, isActive: true,
  };
  setEditingChair(duplicatedData);
  setIsAddChairOpen(true);
  showToast(`Клонирование параметров кресла «${chair.name}»`, "info", 3000);
  setActiveShiftChairId?.(null);
}
