import { useCallback } from "react";
import { denteAdminSecretRequestHeaders } from "../../../AppHelpers";
import {
  safeLocalStorageSetItem,
} from "../../../lib/safeLocalStorage";
import type { QuickAddChairData } from "../QuickAddChairModal";
import type { QuickAddDoctorData } from "../QuickAddDoctorModal";
import type { ChairDoctorShiftAssignment } from "../grid/gridTypes";
import type {
  DoctorShift,
  ShiftArchetypeId,
} from "../roster/DoctorShiftRosterModal";
import type { MedicalStaffRole } from "../roster/doctorShiftRosterPresets";
import { buildChairDoctorAssignmentsFromShifts } from "./scheduleViewShifts";

export interface UseScheduleChairDoctorOpsParams {
  loadDashboard?: () => void | Promise<void>;
  setDashboard?: any;
  setScheduleChairFilterId: (id: string | null) => void;
  setEditingChairData: (data: QuickAddChairData | null) => void;
  setIsQuickAddChairOpen: (open: boolean) => void;
  setSavedDoctorShifts: React.Dispatch<React.SetStateAction<DoctorShift[]>>;
  currentDateKey: string;
  auth: any;
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
      const isUpdate = Boolean(chairData.id);

      const applyLocalOptimisticChair = () => {
        if (typeof setDashboard === "function") {
          setDashboard((prev: any) => {
            if (!prev?.clinicSettings) return prev;
            if (isUpdate) {
              return {
                ...prev,
                clinicSettings: {
                  ...prev.clinicSettings,
                  chairs: (prev.clinicSettings.chairs ?? []).map((c: any) =>
                    c.id === chairData.id
                      ? {
                          ...c,
                          name: chairData.name,
                          room: chairData.roomNumber || chairData.room,
                          roomNumber: chairData.roomNumber || chairData.room,
                          specialization: chairData.specialization,
                          color: chairData.color,
                          active: chairData.isActive,
                          isActive: chairData.isActive,
                        }
                      : c,
                  ),
                },
              };
            }
            const localChair = {
              id: `chair-local-${Date.now()}`,
              name: chairData.name,
              room: chairData.roomNumber || chairData.room,
              specialization: chairData.specialization,
              color: chairData.color,
              active: chairData.isActive ?? true,
              defaultDoctorId: chairData.defaultDoctorId || null,
            };
            return {
              ...prev,
              clinicSettings: {
                ...prev.clinicSettings,
                chairs: [...(prev.clinicSettings.chairs ?? []), localChair],
              },
            };
          });
        }
      };

      try {
        const url = isUpdate
          ? `/api/settings/chairs/${encodeURIComponent(chairData.id!)}`
          : "/api/settings/chairs";
        const method = isUpdate ? "PUT" : "POST";
        const res = await fetch(url, {
          method,
          headers: denteAdminSecretRequestHeaders({
            "Content-Type": "application/json",
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
        showToast(
          isUpdate
            ? `Параметры кресла «${chairData.name}» успешно обновлены`
            : `Кресло «${chairData.name}» успешно добавлено в расписание`,
          "success",
          3500,
        );
      } catch (err) {
        console.warn("Failed to add/update chair via QuickAddChairModal:", err);
        applyLocalOptimisticChair();
        showToast(
          isUpdate
            ? `Параметры кресла «${chairData.name}» обновлены локально`
            : `Кресло «${chairData.name}» добавлено локально`,
          "info",
          3000,
        );
      } finally {
        setEditingChairData(null);
      }
    },
    [loadDashboard, setDashboard, setScheduleChairFilterId, setEditingChairData, showToast],
  );

  const handleAddDoctorFromSchedule = useCallback(
    async (doctorData: QuickAddDoctorData) => {
      const applyLocalOptimisticDoctor = () => {
        if (typeof setDashboard === "function") {
          setDashboard((prev: any) => {
            if (!prev?.clinicSettings) return prev;
            const newStaff = {
              id: doctorData.id || `doc-local-${Date.now()}`,
              organizationId:
                prev.clinicSettings?.profile?.organizationId ||
                "00000000-0000-4000-8000-000000000001",
              fullName: doctorData.fullName,
              role: "doctor",
              specialties: [doctorData.specialty],
              phone: doctorData.phone || null,
              email: null,
              active: true,
              canSignMedicalRecords: true,
              canManageMoney: false,
              canManageImports: false,
              color: doctorData.color,
              preferredChairId: doctorData.preferredChairId || null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            return {
              ...prev,
              clinicSettings: {
                ...prev.clinicSettings,
                staff: [...(prev.clinicSettings.staff ?? []), newStaff],
              },
            };
          });
        }
      };

      try {
        const res = await fetch("/api/settings/staff", {
          method: "POST",
          headers: denteAdminSecretRequestHeaders({
            "Content-Type": "application/json",
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
        console.warn("Failed to add doctor via QuickAddDoctorModal:", err);
        applyLocalOptimisticDoctor();
        showToast(
          `Врач «${doctorData.fullName}» добавлен локально`,
          "info",
          3000,
        );
        return { id: doctorData.id };
      }
    },
    [loadDashboard, setDashboard, showToast],
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
          console.warn(
            "[ScheduleView] Error persisting doctor shifts to storage:",
            storageErr,
          );
        }
        try {
          if (typeof fetch !== "undefined") {
            const headers: Record<string, string> = {
              "Content-Type": "application/json",
              ...(auth?.denteClinicalMutationHeaders
                ? auth.denteClinicalMutationHeaders()
                : {}),
            };
            fetch("/api/diary/shifts", {
              method: "POST",
              headers,
              body: JSON.stringify({ shifts: nextShifts }),
            }).catch((syncErr: unknown) => {
              console.warn("[ScheduleView] Async shift sync failed:", syncErr);
            });
          }
        } catch (networkErr: unknown) {
          console.warn(
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
            const isEve =
              idx > 0 ||
              (sub.startHour ??
                (Number.parseInt((sub as any).startTime?.slice(0, 2), 10) ||
                  8)) >= 14;
            const archetypeId: ShiftArchetypeId = isEve
              ? "evening_shift"
              : "morning_shift";
            const suffix = isEve ? "eve" : "morn";
            const sH =
              sub.startHour ??
              (Number.parseInt((sub as any).startTime?.slice(0, 2), 10) ||
                (isEve ? 14 : 8));
            const eH =
              sub.endHour ??
              (Number.parseInt((sub as any).endTime?.slice(0, 2), 10) ||
                (isEve ? 20 : 14));
            const startTime =
              (sub as any).startTime || `${String(sH).padStart(2, "0")}:00`;
            const endTime =
              (sub as any).endTime || `${String(eH).padStart(2, "0")}:00`;
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
