import { useCallback } from "react";
import { generateUuidV7, type Dashboard } from "@dental/shared";
import { denteClinicalMutationHeaders } from "../../../lib/denteRequestHeaders";
import {
  safeLocalStorageSetItem,
} from "../../../lib/safeLocalStorage";
import { logger } from "../../../utils/logger";
import type { QuickAddChairData } from "../QuickAddChairModal";
import type { QuickAddDoctorData } from "../QuickAddDoctorModal";
import type { ChairDoctorShiftAssignment } from "../grid/gridTypes";
import type {
  DoctorShift,
  ShiftArchetypeId,
} from "../roster/DoctorShiftRosterModal";
import type { MedicalStaffRole } from "../roster/doctorShiftRosterPresets";
import { buildChairDoctorAssignmentsFromShifts } from "./scheduleViewShifts";

export interface ScheduleOpsAuthContext {
  readonly denteClinicalMutationHeaders?: (() => Record<string, string>) | undefined;
}

export interface UseScheduleChairDoctorOpsParams {
  loadDashboard?: () => void | Promise<void>;
  setDashboard?: ((updater: (prev: Dashboard) => Dashboard) => void) | undefined;
  setScheduleChairFilterId: (id: string | null) => void;
  setEditingChairData: (data: QuickAddChairData | null) => void;
  setIsQuickAddChairOpen: (open: boolean) => void;
  setSavedDoctorShifts: React.Dispatch<React.SetStateAction<DoctorShift[]>>;
  currentDateKey: string;
  auth?: ScheduleOpsAuthContext | null | undefined;
  showToast: (
    msg: string,
    type?: "success" | "error" | "info" | "warning",
    duration?: number,
  ) => void;
}

export function useScheduleChairDoctorOps({
  loadDashboard,
  setDashboard,
  setScheduleChairFilterId,
  setEditingChairData,
  setIsQuickAddChairOpen,
  setSavedDoctorShifts,
  currentDateKey,
  auth,
  showToast,
}: UseScheduleChairDoctorOpsParams) {
  const handleEditChairFromSchedule = useCallback(
    (chairData: QuickAddChairData) => {
      setEditingChairData(chairData);
      setIsQuickAddChairOpen(true);
    },
    [setEditingChairData, setIsQuickAddChairOpen],
  );

  const handleAddChairFromSchedule = useCallback(
    async (chairData: QuickAddChairData) => {
      setScheduleChairFilterId(null);
      const chairId = chairData.id;
      const isUpdate = Boolean(chairId);
      let isSuccess = false;
      try {
        const url = isUpdate && chairId
          ? `/api/settings/chairs/${encodeURIComponent(chairId)}`
          : "/api/settings/chairs";
        const method = isUpdate ? "PUT" : "POST";
        const res = await fetch(url, {
          method,
          headers: denteClinicalMutationHeaders({
            "Content-Type": "application/json",
            "Idempotency-Key": generateUuidV7(),
          }),
          body: JSON.stringify({
            name: chairData.name,
            room: chairData.roomNumber || chairData.room,
            specialization: chairData.specialization,
            color: chairData.color,
            defaultDoctorId: chairData.defaultDoctorId || null,
            ...(isUpdate ? { active: chairData.isActive } : {}),
          }),
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        if (typeof loadDashboard === "function") {
          await loadDashboard();
        }
        isSuccess = true;
        showToast(
          isUpdate
            ? `Параметры кресла «${chairData.name}» успешно обновлены`
            : `Кресло «${chairData.name}» успешно добавлено в расписание`,
          "success",
          3500,
        );
      } catch (err) {
        logger.error("Failed to add/update chair via QuickAddChairModal:", err);
        showToast(
          isUpdate
            ? `Не удалось обновить параметры кресла «${chairData.name}» на сервере. Проверьте соединение.`
            : `Не удалось добавить кресло «${chairData.name}» на сервере. Проверьте соединение.`,
          "error",
          4000,
        );
      } finally {
        if (isSuccess) {
          setEditingChairData(null);
        }
      }
    },
    [loadDashboard, setScheduleChairFilterId, setEditingChairData, showToast],
  );

  const handleAddDoctorFromSchedule = useCallback(
    async (doctorData: QuickAddDoctorData) => {
      try {
        const res = await fetch("/api/settings/staff", {
          method: "POST",
          headers: denteClinicalMutationHeaders({
            "Content-Type": "application/json",
            "Idempotency-Key": generateUuidV7(),
          }),
          body: JSON.stringify({
            fullName: doctorData.fullName,
            role: "doctor",
            specialties: [doctorData.specialty],
            phone: doctorData.phone || null,
            color: doctorData.color,
            preferredChairId: doctorData.preferredChairId || null,
          }),
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const createdData = await res.json().catch(() => null);
        if (typeof loadDashboard === "function") {
          await loadDashboard();
        }
        showToast(
          `Врач «${doctorData.fullName}» успешно добавлен в расписание`,
          "success",
          3500,
        );
        return createdData || { id: doctorData.id };
      } catch (err) {
        logger.error("Failed to add doctor via QuickAddDoctorModal:", err);
        showToast(
          `Не удалось добавить врача «${doctorData.fullName}» на сервере. Проверьте права доступа.`,
          "error",
          4000,
        );
        return null;
      }
    },
    [loadDashboard, showToast],
  );

  const handleAssignChairDoctor = useCallback(
    (chairId: string, assignment: ChairDoctorShiftAssignment | null) => {
      const persistAndSyncShifts = (nextShifts: DoctorShift[]) => {
        try {
          safeLocalStorageSetItem(
            "dente_doctor_shifts",
            JSON.stringify(nextShifts),
          );
          const dateMap = buildChairDoctorAssignmentsFromShifts(
            nextShifts,
            currentDateKey,
          );
          safeLocalStorageSetItem(
            `dente_chair_doctor_assignments_${currentDateKey}`,
            JSON.stringify(dateMap),
          );
        } catch (storageErr: unknown) {
          logger.warn(
            "[ScheduleView] Error persisting doctor shifts to storage:",
            storageErr,
          );
        }
        try {
          if (typeof fetch !== "undefined") {
            const headers: Record<string, string> = {
              "Content-Type": "application/json",
              "Idempotency-Key": generateUuidV7(),
              ...(auth?.denteClinicalMutationHeaders
                ? auth.denteClinicalMutationHeaders()
                : {}),
            };
            fetch("/api/schedule/shifts", {
              method: "POST",
              headers,
              body: JSON.stringify({
                shifts: nextShifts,
                dateIso: currentDateKey,
              }),
            }).catch((syncErr: unknown) => {
              logger.warn("[ScheduleView] Async shift sync failed:", syncErr);
            });
          }
        } catch (networkErr: unknown) {
          logger.warn(
            "[ScheduleView] Error initiating shift sync fetch:",
            networkErr,
          );
        }
      };

      if (!assignment || !assignment.doctorId) {
        setSavedDoctorShifts((prev) => {
          const next = prev.filter(
            (s) => !(s.dateIso === currentDateKey && s.chairId === chairId),
          );
          persistAndSyncShifts(next);
          return next;
        });
      } else if (
        (assignment.shiftPreset === "two_shifts" ||
          (assignment.subShifts && assignment.subShifts.length > 1)) &&
        assignment.subShifts &&
        assignment.subShifts.length > 0
      ) {
        const multiShifts: DoctorShift[] = assignment.subShifts.map(
          (sub, idx) => {
            const parsedStart = sub.startTime
              ? Number.parseInt(sub.startTime.slice(0, 2), 10)
              : NaN;
            const parsedEnd = sub.endTime
              ? Number.parseInt(sub.endTime.slice(0, 2), 10)
              : NaN;
            const sH = Number.isFinite(sub.startHour)
              ? sub.startHour
              : Number.isFinite(parsedStart)
                ? parsedStart
                : idx > 0
                  ? 14
                  : 8;
            const eH = Number.isFinite(sub.endHour)
              ? sub.endHour
              : Number.isFinite(parsedEnd)
                ? parsedEnd
                : idx > 0
                  ? 20
                  : 14;
            const isEve = idx > 0 || sH >= 14;
            const archetypeId: ShiftArchetypeId = isEve
              ? "evening_shift"
              : "morning_shift";
            const suffix = isEve ? "eve" : "morn";
            const startTime =
              sub.startTime || `${String(sH).padStart(2, "0")}:00`;
            const endTime =
              sub.endTime || `${String(eH).padStart(2, "0")}:00`;
            const doctorRole: MedicalStaffRole =
              (sub.doctorSpecialty as MedicalStaffRole) || "therapist";
            return {
              id: `shift-${currentDateKey}-${chairId}-${suffix}`,
              doctorId: sub.doctorId,
              doctorName: sub.doctorName,
              doctorRole,
              assistantId: null,
              assistantName: null,
              cabinetId: chairId,
              chairId: chairId,
              dateIso: currentDateKey,
              archetypeId,
              startTime,
              endTime,
              durationHours: Math.max(1, eH - sH) || 6.0,
              breakMinutes: 0,
              isNight: false,
              nightHours: 0,
              status: "scheduled",
            };
          },
        );
        setSavedDoctorShifts((prev) => {
          const filtered = prev.filter(
            (s) => !(s.dateIso === currentDateKey && s.chairId === chairId),
          );
          const next = [...filtered, ...multiShifts];
          persistAndSyncShifts(next);
          return next;
        });
      } else {
        const archetypeId: ShiftArchetypeId =
          assignment.shiftPreset === "evening"
            ? "evening_shift"
            : "morning_shift";
        const parts = assignment.shiftHours.split("–");
        const startTime = parts[0]?.trim() || "08:00";
        const endTime = parts[1]?.trim() || "20:00";
        const suffix =
          assignment.shiftPreset === "evening"
            ? "eve"
            : assignment.shiftPreset === "morning"
              ? "morn"
              : "full";
        const doctorRole: MedicalStaffRole =
          (assignment.doctorSpecialty as MedicalStaffRole) || "therapist";
        const newShift: DoctorShift = {
          id: `shift-${currentDateKey}-${chairId}-${suffix}`,
          doctorId: assignment.doctorId,
          doctorName: assignment.doctorName,
          doctorRole,
          assistantId: null,
          assistantName: null,
          cabinetId: chairId,
          chairId: chairId,
          dateIso: currentDateKey,
          archetypeId,
          startTime,
          endTime,
          durationHours:
            Number.parseInt(endTime.slice(0, 2), 10) -
              Number.parseInt(startTime.slice(0, 2), 10) || 6.0,
          breakMinutes: 0,
          isNight: false,
          nightHours: 0,
          status: "scheduled",
        };
        setSavedDoctorShifts((prev) => {
          const filtered = prev.filter((s) => {
            if (s.dateIso !== currentDateKey || s.chairId !== chairId)
              return true;
            if (assignment.shiftPreset === "full") return false;
            if (
              assignment.shiftPreset === "morning" &&
              (s.archetypeId === "morning_shift" ||
                s.id.endsWith("-morn") ||
                s.id.endsWith("-full"))
            )
              return false;
            if (
              assignment.shiftPreset === "evening" &&
              (s.archetypeId === "evening_shift" ||
                s.id.endsWith("-eve") ||
                s.id.endsWith("-full"))
            )
              return false;
            return true;
          });
          const next = [...filtered, newShift];
          persistAndSyncShifts(next);
          return next;
        });
      }
    },
    [currentDateKey, auth, setSavedDoctorShifts],
  );

  return {
    handleEditChairFromSchedule,
    handleAddChairFromSchedule,
    handleAddDoctorFromSchedule,
    handleAssignChairDoctor,
  };
}
