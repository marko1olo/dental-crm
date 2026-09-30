import type { Appointment, Dashboard } from "@dental/shared";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import type { ScheduleChair } from "./ScheduleFilterStrip";
import type { ChairDoctorShiftAssignment, ChairDoctorSubShift } from "./ScheduleGrid";
import type { QuickAddChairData } from "./QuickAddChairModal";
import type { QuickAddDoctorData } from "./QuickAddDoctorModal";
import type { QuickBookingSlotInfo } from "./QuickBookingDrawer";
import type { DateRangeShiftPreset } from "./roster/DoctorShiftRosterModal";

export { resolveChairDutyDoctor } from "./QuickBookingDrawer";
export { useSchedule } from "./useSchedule";
export type { DateRangeShiftPreset };

export interface ChairScheduleViewProps {
  dashboard: Dashboard;
  dateKey: string;
  appointments: Appointment[];
  onSlotClick: (slot: QuickBookingSlotInfo) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  onAppointmentMove?:
    | ((appointmentId: string, updates: any) => Promise<any> | void)
    | undefined;
  onQuickStatusChange?:
    | ((appointmentId: string, status: Appointment["status"]) => void)
    | undefined;
  patientName?: (
    patients: Dashboard["patients"],
    patientId: string | null,
  ) => string;
  formatTime?: (iso: string) => string;
  toDateTimeLocalValue?: (iso: string, timezone?: string | null) => string;
  appointmentLabels?: Record<Appointment["status"], string>;
  selectedChairId?: string | null;
  selectedDoctorId?: string | null;
  chairDoctorAssignments?: Record<string, ChairDoctorShiftAssignment> | undefined;
  onAssignChairDoctor?:
    | ((
        chairId: string,
        assignment: ChairDoctorShiftAssignment | null,
      ) => void)
    | undefined;
  onAddChair?: (chairData: QuickAddChairData) => Promise<void> | void;
  onAddDoctor?: (doctorData: QuickAddDoctorData) => Promise<void> | void;
  onOpenRosterModal?: () => void;
  onSelectChair?: ((chairId: string | null) => void) | undefined;
  hideToolbar?: boolean;
  gridStepMinutes?: 15 | 30 | 60 | undefined;
  onGridStepChange?: ((step: 15 | 30 | 60) => void) | undefined;
  selectedBranchId?: string | null | undefined;
  onSelectBranch?: ((branchId: string | null) => void) | undefined;
}

export const defaultAppointmentLabels: Record<Appointment["status"], string> = {
  planned: "Запланирован",
  confirmed: "Подтвержден",
  arrived: "Прибыл",
  in_treatment: "В кресле",
  completed: "Завершен",
  cancelled: "Отменен",
  no_show: "Не явился",
};

export interface SyncShiftPayload {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty?: string | undefined;
  cabinetId: string;
  chairId: string;
  dateIso: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  status: string;
  shiftPreset?: string | undefined;
}

export function calculatePresetAssignment(
  chair: ScheduleChair,
  targetDoc: { id: string; fullName: string; specialty?: any },
  preset:
    | "morning"
    | "morning_9"
    | "evening"
    | "evening_15"
    | "full"
    | "full_9_21"
    | "2x2"
    | "even_odd",
  existingAssignment: ChairDoctorShiftAssignment | null,
  dateKey: string,
): ChairDoctorShiftAssignment {
  let shiftPreset: "morning" | "evening" | "full" | "two_shifts" = "morning";
  let shiftLabel = "Утро 08-14";
  let shiftHours = "08:00–14:00";
  let startHour = 8;
  let endHour = 14;
  let subShifts: ChairDoctorSubShift[] | undefined;

  const isMorn = preset === "morning" || preset === "morning_9";
  const isEve = preset === "evening" || preset === "evening_15";
  const startH =
    preset === "morning_9" ? 9 : preset === "evening_15" ? 15 : isEve ? 14 : 8;
  const endH =
    preset === "morning_9" ? 15 : preset === "evening_15" ? 21 : isEve ? 20 : 14;
  const sHours = `${String(startH).padStart(2, "0")}:00–${String(endH).padStart(2, "0")}:00`;

  const targetSubShift: ChairDoctorSubShift = {
    doctorId: targetDoc.id,
    doctorName: targetDoc.fullName,
    doctorSpecialty: (targetDoc as any).specialty ? String((targetDoc as any).specialty) : undefined,
    startHour: startH,
    endHour: endH,
    shiftHours: sHours,
  };

  if (isMorn) {
    let existingEvening: ChairDoctorSubShift | null = null;
    if (existingAssignment?.subShifts && existingAssignment.subShifts.length > 0) {
      const found = existingAssignment.subShifts.find(
        (s) =>
          s.doctorId !== targetDoc.id &&
          ((s.startHour !== undefined && s.startHour >= 14) ||
            s.shiftHours?.includes("14:00") ||
            s.shiftHours?.includes("15:00")),
      );
      if (found) existingEvening = found;
    } else if (
      existingAssignment &&
      existingAssignment.doctorId !== targetDoc.id &&
      existingAssignment.shiftPreset !== "full" &&
      ((existingAssignment.startHour !== undefined && existingAssignment.startHour >= 14) ||
        existingAssignment.shiftPreset === "evening")
    ) {
      existingEvening = {
        doctorId: existingAssignment.doctorId,
        doctorName: existingAssignment.doctorName,
        doctorSpecialty: existingAssignment.doctorSpecialty,
        startHour: existingAssignment.startHour ?? 14,
        endHour: existingAssignment.endHour ?? 20,
        shiftHours: existingAssignment.shiftHours || "14:00–20:00",
      };
    }

    if (existingEvening) {
      shiftPreset = "two_shifts";
      shiftLabel = "2 смены (Утро + Вечер)";
      shiftHours = "08:00–20:00";
      startHour = startH;
      endHour = existingEvening.endHour || 20;
      subShifts = [targetSubShift, existingEvening];
    } else {
      shiftPreset = "morning";
      shiftLabel = preset === "morning_9" ? "1 см. 09-15" : "Утро 08-14";
      shiftHours = sHours;
      startHour = startH;
      endHour = endH;
      subShifts = [targetSubShift];
    }
  } else if (isEve) {
    let existingMorning: ChairDoctorSubShift | null = null;
    if (existingAssignment?.subShifts && existingAssignment.subShifts.length > 0) {
      const found = existingAssignment.subShifts.find(
        (s) =>
          s.doctorId !== targetDoc.id &&
          ((s.startHour !== undefined && s.startHour < 14) ||
            s.shiftHours?.includes("08:00") ||
            s.shiftHours?.includes("09:00")),
      );
      if (found) existingMorning = found;
    } else if (
      existingAssignment &&
      existingAssignment.doctorId !== targetDoc.id &&
      existingAssignment.shiftPreset !== "full" &&
      ((existingAssignment.startHour !== undefined && existingAssignment.startHour < 14) ||
        existingAssignment.shiftPreset === "morning")
    ) {
      existingMorning = {
        doctorId: existingAssignment.doctorId,
        doctorName: existingAssignment.doctorName,
        doctorSpecialty: existingAssignment.doctorSpecialty,
        startHour: existingAssignment.startHour ?? 8,
        endHour: existingAssignment.endHour ?? 14,
        shiftHours: existingAssignment.shiftHours || "08:00–14:00",
      };
    }

    if (existingMorning) {
      shiftPreset = "two_shifts";
      shiftLabel = "2 смены (Утро + Вечер)";
      shiftHours = "08:00–20:00";
      startHour = existingMorning.startHour || 8;
      endHour = endH;
      subShifts = [existingMorning, targetSubShift];
    } else {
      shiftPreset = "evening";
      shiftLabel = preset === "evening_15" ? "2 см. 15-21" : "Вечер 14-20";
      shiftHours = sHours;
      startHour = startH;
      endHour = endH;
      subShifts = [targetSubShift];
    }
  } else if (preset === "full") {
    shiftPreset = "full";
    shiftLabel = "Весь день";
    shiftHours = "08:00–20:00";
    startHour = 8;
    endHour = 20;
    subShifts = undefined;
  } else if (preset === "full_9_21") {
    shiftPreset = "full";
    shiftLabel = "Весь день (09:00–21:00)";
    shiftHours = "09:00–21:00";
    startHour = 9;
    endHour = 21;
    subShifts = undefined;
  } else if (preset === "2x2") {
    shiftPreset = "two_shifts";
    shiftLabel = "2 через 2";
    shiftHours = "08:00–20:00";
    startHour = 8;
    endHour = 20;
  } else if (preset === "even_odd") {
    const dayOfMonth = Number.parseInt(dateKey ? dateKey.slice(8, 10) : "1", 10) || 1;
    const isEven = dayOfMonth % 2 === 0;
    shiftPreset = isEven ? "morning" : "evening";
    shiftLabel = isEven ? "Чет (Утро 08-14)" : "Нечет (Вечер 14-20)";
    shiftHours = isEven ? "08:00–14:00" : "14:00–20:00";
    startHour = isEven ? 8 : 14;
    endHour = isEven ? 14 : 20;
  }

  const firstSub = subShifts?.[0];
  const secondSub = subShifts?.[1];

  return {
    chairId: chair.id,
    chairName: chair.name,
    doctorId: targetDoc.id,
    doctorName:
      firstSub && secondSub
        ? `${firstSub.doctorName} / ${secondSub.doctorName}`
        : targetDoc.fullName,
    doctorSpecialty: (targetDoc as any).specialty ? String((targetDoc as any).specialty) : undefined,
    shiftPreset,
    shiftLabel,
    shiftHours,
    startHour,
    endHour,
    ...(subShifts ? { subShifts } : {}),
  };
}

export async function syncShiftsWithServer(
  targetDateKey: string,
  currentAssignments: Record<string, ChairDoctorShiftAssignment>,
  chairsList?: readonly ScheduleChair[] | ScheduleChair[],
): Promise<boolean> {
  if (!targetDateKey || !currentAssignments) return false;

  const shiftsToSend: SyncShiftPayload[] = [];

  for (const [chairId, assignment] of Object.entries(currentAssignments)) {
    if (!assignment) continue;
    const chairObj = chairsList?.find((c) => c.id === chairId);
    const cabinetId =
      (chairObj as any)?.roomNumber ||
      (chairObj as any)?.room ||
      (assignment as any)?.room ||
      "cab-1";

    if (assignment.subShifts && assignment.subShifts.length > 0) {
      for (const sub of assignment.subShifts) {
        const startH = sub.startHour ?? 8;
        const endH = sub.endHour ?? 14;
        shiftsToSend.push({
          id: `shift-${sub.doctorId}-${chairId}-${targetDateKey}-${startH}-${endH}`,
          doctorId: sub.doctorId,
          doctorName: sub.doctorName,
          doctorSpecialty: sub.doctorSpecialty,
          cabinetId,
          chairId,
          dateIso: targetDateKey,
          startTime: `${String(startH).padStart(2, "0")}:00`,
          endTime: `${String(endH).padStart(2, "0")}:00`,
          durationHours: endH - startH,
          status: "scheduled",
          shiftPreset: assignment.shiftPreset || "two_shifts",
        });
      }
    } else if (assignment.doctorId) {
      const startH = assignment.startHour ?? 8;
      const endH = assignment.endHour ?? 20;
      shiftsToSend.push({
        id: `shift-${assignment.doctorId}-${chairId}-${targetDateKey}-${startH}-${endH}`,
        doctorId: assignment.doctorId,
        doctorName: assignment.doctorName,
        doctorSpecialty: assignment.doctorSpecialty,
        cabinetId,
        chairId,
        dateIso: targetDateKey,
        startTime: `${String(startH).padStart(2, "0")}:00`,
        endTime: `${String(endH).padStart(2, "0")}:00`,
        durationHours: endH - startH,
        status: "scheduled",
        shiftPreset: assignment.shiftPreset || "full",
      });
    }
  }

  if (typeof window !== "undefined" && typeof fetch === "function") {
    try {
      const response = await fetch("/api/schedule/shifts", {
        method: "POST",
        headers: {
          ...denteAdminSecretRequestHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ shifts: shiftsToSend }),
      });
      return response.ok;
    } catch {
      // Soft fallback per Mandate 8n & 8e (offline / isolated / network degradation)
      return false;
    }
  }
  return false;
}
