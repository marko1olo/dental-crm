import { useCallback } from "react";
import type { Dashboard, DentalSpecialty } from "@dental/shared";
import { specialtyLabels } from "../../../workspaceUiLabels";
import { showToast } from "../../GlobalToast";
import { formatDoctorShortName } from ".././GridAppointmentCard";
import {
  getMondayOfWeekIso,
  addDaysToDateIso,
  copyWeekShiftsToTargetWeek,
  copyWeekShiftsToMonth,
  applyDoctorChairWeeklyTemplate,
} from ".././roster/DoctorShiftRosterModal";
import {
  safeLocalStorageGetItem,
  safeLocalStorageSetItem,
  safeLocalStorageGetJson,
  safeLocalStorageSetJson,
} from "../../../lib/safeLocalStorage";
import type { ChairDoctorShiftAssignment } from "./gridTypes";

export interface UseScheduleChairShiftBulkOpsProps {
  doctors: Array<any>;
  effectiveChairs: Array<any>;
  effectiveChairAssignments?: Record<string, ChairDoctorShiftAssignment>;
  dateKey: string;
  dashboard: Dashboard;
  setLocalChairAssignments: React.Dispatch<
    React.SetStateAction<Record<string, ChairDoctorShiftAssignment>>
  >;
  onAssignChairDoctor?:
    | ((chairId: string, assignment: ChairDoctorShiftAssignment | null) => void)
    | undefined;
}

export function useScheduleChairShiftBulkOps({
  doctors,
  effectiveChairs,
  effectiveChairAssignments,
  dateKey,
  dashboard,
  setLocalChairAssignments,
  onAssignChairDoctor,
}: UseScheduleChairShiftBulkOpsProps) {
  const handleAssignDoctorWeek = useCallback(
    (chairId: string, docId: string, fullWeek = false) => {
      const doc = doctors.find((d) => d.id === docId) || doctors[0];
      const chair = effectiveChairs.find((c) => c.id === chairId) || {
        id: chairId,
        name: "Кресло",
      };
      if (!doc) return;

      const specialty =
        doc.specialties && doc.specialties.length > 0
          ? specialtyLabels[doc.specialties[0] as DentalSpecialty] ||
            doc.specialties[0]
          : doc.role === "doctor"
            ? "Стоматолог"
            : "";
      const doctorName = doc.fullName || "Врач";

      const assignment: ChairDoctorShiftAssignment = {
        chairId,
        doctorId: doc.id,
        doctorName,
        doctorSpecialty: specialty,
        shiftPreset: "full",
        shiftLabel: fullWeek ? "Весь день (Пн–Вс)" : "Весь день (Пн–Пт)",
        shiftHours: "08:00–20:00",
        startHour: 8,
        endHour: 20,
        subShifts: [
          {
            doctorId: doc.id,
            doctorName,
            doctorSpecialty: specialty,
            startHour: 8,
            endHour: 20,
            shiftHours: "08:00–20:00",
          },
        ],
      };

      const mondayIso = getMondayOfWeekIso(dateKey);
      const dayOffsets = fullWeek ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4];
      const weekDays = dayOffsets.map((offset) =>
        addDaysToDateIso(mondayIso, offset),
      );

      if (typeof window !== "undefined") {
        for (const dayIso of weekDays) {
          const existingKey = `dente_chair_doctor_assignments_${dayIso}`;
          const parsed = safeLocalStorageGetJson<Record<string, any>>(
            existingKey,
            {},
          );
          parsed[chairId] = assignment;
          safeLocalStorageSetJson(existingKey, parsed, true);
        }

        const currentShifts = safeLocalStorageGetJson<any[]>(
          "dente_doctor_shifts",
          [],
        );
        const updatedShifts = applyDoctorChairWeeklyTemplate(currentShifts, {
          weekStartDateIso: mondayIso,
          templateId: fullWeek ? "seven_day_full" : "five_day_standard",
          doctorId: doc.id,
          chairId,
          staffList:
            (dashboard?.clinicSettings?.staff as any) || (doctors as any),
        });
        safeLocalStorageSetJson("dente_doctor_shifts", updatedShifts);
      }

      setLocalChairAssignments((prev) => ({
        ...prev,
        [chairId]: assignment,
      }));

      if (typeof onAssignChairDoctor === "function") {
        onAssignChairDoctor(chairId, assignment);
      }

      showToast(
        `Врач ${formatDoctorShortName(doctorName)} закреплен за креслом «${chair.name}» на ${fullWeek ? "всю неделю (Пн–Вс)" : "рабочую неделю (Пн–Пт)"}`,
        "success",
        3500,
      );
    },
    [
      doctors,
      effectiveChairs,
      dateKey,
      dashboard?.clinicSettings?.staff,
      onAssignChairDoctor,
      setLocalChairAssignments,
    ],
  );

  const handleAssignDoctorMonth = useCallback(
    (chairId: string, docId: string) => {
      const doc = doctors.find((d) => d.id === docId) || doctors[0];
      const chair = effectiveChairs.find((c) => c.id === chairId) || {
        id: chairId,
        name: "Кресло",
      };
      if (!doc) return;

      const specialty =
        doc.specialties && doc.specialties.length > 0
          ? specialtyLabels[doc.specialties[0] as DentalSpecialty] ||
            doc.specialties[0]
          : doc.role === "doctor"
            ? "Стоматолог"
            : "";
      const doctorName = doc.fullName || "Врач";

      const assignment: ChairDoctorShiftAssignment = {
        chairId,
        doctorId: doc.id,
        doctorName,
        doctorSpecialty: specialty,
        shiftPreset: "full",
        shiftLabel: "Весь день (Месяц)",
        shiftHours: "08:00–20:00",
        startHour: 8,
        endHour: 20,
        subShifts: [
          {
            doctorId: doc.id,
            doctorName,
            doctorSpecialty: specialty,
            startHour: 8,
            endHour: 20,
            shiftHours: "08:00–20:00",
          },
        ],
      };

      const year =
        Number.parseInt(dateKey ? dateKey.slice(0, 4) : "2026", 10) || 2026;
      const month =
        Number.parseInt(dateKey ? dateKey.slice(5, 7) : "9", 10) || 9;
      const daysInMonth = new Date(year, month, 0).getDate();

      if (typeof window !== "undefined") {
        for (let d = 1; d <= daysInMonth; d++) {
          const dayIso = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const existingKey = `dente_chair_doctor_assignments_${dayIso}`;
          const parsed = safeLocalStorageGetJson<Record<string, any>>(
            existingKey,
            {},
          );
          parsed[chairId] = assignment;
          safeLocalStorageSetJson(existingKey, parsed, true);
        }

        const mondayIso = getMondayOfWeekIso(dateKey);
        const currentShifts = safeLocalStorageGetJson<any[]>(
          "dente_doctor_shifts",
          [],
        );
        const updatedShifts = copyWeekShiftsToMonth(
          currentShifts,
          mondayIso,
          4,
        );
        safeLocalStorageSetJson("dente_doctor_shifts", updatedShifts);
      }

      setLocalChairAssignments((prev) => ({
        ...prev,
        [chairId]: assignment,
      }));

      if (typeof onAssignChairDoctor === "function") {
        onAssignChairDoctor(chairId, assignment);
      }

      showToast(
        `Врач ${formatDoctorShortName(doctorName)} закреплен за креслом «${chair.name}» на весь месяц`,
        "success",
        3500,
      );
    },
    [doctors, effectiveChairs, dateKey, onAssignChairDoctor, setLocalChairAssignments],
  );

  const handleQuickSubstituteDoctor = useCallback(
    (chairId: string, newDoctorId?: string) => {
      const chair = effectiveChairs.find((c) => c.id === chairId) || {
        id: chairId,
        name: "Кресло",
      };
      const currentDocId = effectiveChairAssignments?.[chairId]?.doctorId;
      const candidate = newDoctorId
        ? doctors.find((d) => d.id === newDoctorId)
        : doctors.find((d) => d.id !== currentDocId) || doctors[0];
      if (!candidate) return;

      const doctorName = candidate.fullName || "Врач";
      const specialty =
        candidate.specialties && candidate.specialties.length > 0
          ? specialtyLabels[candidate.specialties[0] as DentalSpecialty] ||
            candidate.specialties[0]
          : candidate.role === "doctor"
            ? "Стоматолог"
            : "";

      const existing = effectiveChairAssignments?.[chairId];
      const updatedAssignment: ChairDoctorShiftAssignment = {
        chairId,
        doctorId: candidate.id,
        doctorName,
        doctorSpecialty: specialty,
        shiftPreset: existing?.shiftPreset || "full",
        shiftLabel: existing?.shiftLabel || "Весь день",
        shiftHours: existing?.shiftHours || "08:00–20:00",
        startHour: existing?.startHour ?? 8,
        endHour: existing?.endHour ?? 20,
        subShifts: existing?.subShifts
          ? existing.subShifts.map((s) => ({
              ...s,
              doctorId: candidate.id,
              doctorName,
              doctorSpecialty: specialty,
            }))
          : [
              {
                doctorId: candidate.id,
                doctorName,
                doctorSpecialty: specialty,
                startHour: existing?.startHour ?? 8,
                endHour: existing?.endHour ?? 20,
                shiftHours: existing?.shiftHours || "08:00–20:00",
              },
            ],
      };

      if (typeof window !== "undefined" && dateKey) {
        const storageKey = `dente_chair_doctor_assignments_${dateKey}`;
        const existingStorage = safeLocalStorageGetJson<Record<string, any>>(
          storageKey,
          {},
        );
        existingStorage[chairId] = updatedAssignment;
        safeLocalStorageSetJson(storageKey, existingStorage);
      }

      setLocalChairAssignments((prev) => ({
        ...prev,
        [chairId]: updatedAssignment,
      }));

      if (typeof onAssignChairDoctor === "function") {
        onAssignChairDoctor(chairId, updatedAssignment);
      }

      showToast(
        `Врач ${formatDoctorShortName(doctorName)} подменяет врача на кресле «${chair.name}» (StomX Parity)`,
        "success",
      );
    },
    [
      effectiveChairs,
      effectiveChairAssignments,
      doctors,
      dateKey,
      onAssignChairDoctor,
      setLocalChairAssignments,
    ],
  );

  const handleCopyWeekShiftsToNextWeek = useCallback(() => {
    const mondayIso = getMondayOfWeekIso(dateKey);
    const nextMondayIso = addDaysToDateIso(mondayIso, 7);

    if (typeof window !== "undefined") {
      for (let i = 0; i < 7; i++) {
        const srcDay = addDaysToDateIso(mondayIso, i);
        const targetDay = addDaysToDateIso(nextMondayIso, i);
        const srcKey = `dente_chair_doctor_assignments_${srcDay}`;
        const targetKey = `dente_chair_doctor_assignments_${targetDay}`;
        const raw = safeLocalStorageGetItem(srcKey);
        if (raw) {
          safeLocalStorageSetItem(targetKey, raw);
        } else if (srcDay === dateKey && effectiveChairAssignments) {
          safeLocalStorageSetJson(targetKey, effectiveChairAssignments);
        }
      }

      const currentShifts = safeLocalStorageGetJson<any[]>(
        "dente_doctor_shifts",
        [],
      );
      const updatedShifts = copyWeekShiftsToTargetWeek(
        currentShifts,
        mondayIso,
        nextMondayIso,
      );
      safeLocalStorageSetJson("dente_doctor_shifts", updatedShifts);
    }

    showToast(
      `График смен кресел скопирован на следующую неделю (${nextMondayIso})`,
      "success",
      3500,
    );
  }, [dateKey, effectiveChairAssignments]);

  const handleUnassignDoctor = useCallback(
    (chairId: string) => {
      const chair = effectiveChairs.find((c) => c.id === chairId) || {
        id: chairId,
        name: "Кресло",
      };
      const emptyAssignment: ChairDoctorShiftAssignment = {
        chairId,
        doctorId: "",
        doctorName: "",
        shiftPreset: "full",
        shiftLabel: "",
        shiftHours: "",
      };
      setLocalChairAssignments((prev) => {
        const next = { ...prev, [chairId]: emptyAssignment };
        if (typeof window !== "undefined") {
          safeLocalStorageSetJson(
            `dente_chair_doctor_assignments_${dateKey}`,
            next,
          );
        }
        return next;
      });

      if (typeof onAssignChairDoctor === "function") {
        onAssignChairDoctor(chairId, null);
      }

      showToast(
        `Назначение врача для кресла «${chair.name}» снято`,
        "info",
        3000,
      );
    },
    [effectiveChairs, dateKey, onAssignChairDoctor, setLocalChairAssignments],
  );

  return {
    handleAssignDoctorWeek,
    handleAssignDoctorMonth,
    handleQuickSubstituteDoctor,
    handleCopyWeekShiftsToNextWeek,
    handleUnassignDoctor,
  };
}
