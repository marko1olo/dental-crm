import { useCallback } from "react";
import type { Dashboard } from "@dental/shared";
import {
  getMondayOfWeekIso,
  addDaysToDateIso,
  copyWeekShiftsToTargetWeek,
  copyWeekShiftsToMonth,
  applyDoctorChairWeeklyTemplate,
  applyDoctorChairDateRange,
  type DateRangeShiftPreset,
} from "./roster/DoctorShiftRosterModal";
import {
  DEFAULT_SOLO_CHAIR,
  formatDoctorShortName,
  type ChairDoctorShiftAssignment,
} from "./ScheduleGrid";
import {
  DEFAULT_CLINIC_CHAIRS,
  type ScheduleChair,
} from "./ScheduleFilterStrip";
import type { QuickAddChairData } from "./QuickAddChairModal";
import { showToast } from "../GlobalToast";
import {
  safeLocalStorageGetItem,
  safeLocalStorageSetItem,
  safeLocalStorageRemoveItem,
  safeLocalStorageGetJson,
  safeLocalStorageSetJson,
} from "../../lib/safeLocalStorage";
import {
  calculatePresetAssignment,
  syncShiftsWithServer,
} from "./ChairScheduleTypes";

export interface UseChairShiftOperationsOptions {
  chairs: ScheduleChair[];
  doctors: Array<{ id: string; fullName: string; specialty?: any }>;
  dateKey: string;
  chairDoctorAssignments?: Record<string, ChairDoctorShiftAssignment> | undefined;
  onAssignChairDoctor?:
    | ((
        chairId: string,
        assignment: ChairDoctorShiftAssignment | null,
      ) => void)
    | undefined;
  dashboard?: Dashboard | null;
  popoverSelectedDocId: Record<string, string>;
  rangeDoctorId: string;
  rangeChairId: string;
  rangeStartDate: string;
  rangeEndDate: string;
  rangePreset: DateRangeShiftPreset;
  setActiveShiftChairId: (id: string | null) => void;
  setIsSubstituteOpen: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setIsDateRangeModalOpen: (open: boolean) => void;
  setEditingChair: (chair: QuickAddChairData | null) => void;
  setIsAddChairOpen: (open: boolean) => void;
}

export function useChairShiftOperations({
  chairs,
  doctors,
  dateKey,
  chairDoctorAssignments,
  onAssignChairDoctor,
  dashboard,
  popoverSelectedDocId,
  rangeDoctorId,
  rangeChairId,
  rangeStartDate,
  rangeEndDate,
  rangePreset,
  setActiveShiftChairId,
  setIsSubstituteOpen,
  setIsDateRangeModalOpen,
  setEditingChair,
  setIsAddChairOpen,
}: UseChairShiftOperationsOptions) {
  const handleAssignShift = useCallback(
    (
      chair: ScheduleChair,
      preset:
        | "morning"
        | "morning_9"
        | "evening"
        | "evening_15"
        | "full"
        | "full_9_21"
        | "2x2"
        | "even_odd",
    ) => {
      const targetDocId =
        popoverSelectedDocId[chair.id] ||
        chairDoctorAssignments?.[chair.id]?.doctorId ||
        (chair as any).defaultDoctorId ||
        doctors[0]?.id;
      const targetDoc = doctors.find((d) => d.id === targetDocId) || doctors[0];

      if (!targetDoc) {
        showToast("Нет доступных врачей: добавьте врача в настройках клиники", "warning");
        setActiveShiftChairId(null);
        return;
      }

      let existingAssignment: ChairDoctorShiftAssignment | null =
        chairDoctorAssignments?.[chair.id] || null;

      if (!existingAssignment && typeof window !== "undefined" && dateKey) {
        const storageKey = `dente_chair_doctor_assignments_${dateKey}`;
        const parsed = safeLocalStorageGetJson<Record<string, ChairDoctorShiftAssignment> | null>(storageKey, null);
        if (parsed?.[chair.id]) {
          existingAssignment = parsed[chair.id] ?? null;
        }
      }

      const assignment = calculatePresetAssignment(
        chair,
        targetDoc,
        preset,
        existingAssignment,
        dateKey,
      );

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

      if (onAssignChairDoctor) {
        onAssignChairDoctor(chair.id, assignment);
      }

      syncShiftsWithServer(dateKey, updatedTodayAssignments, chairs).catch(() => {});

      showToast(
        `Врач назначен на смену: ${formatDoctorShortName(targetDoc.fullName)} • ${assignment.shiftLabel} • ${chair.name}`,
        "success",
      );

      setActiveShiftChairId(null);
    },
    [
      chairDoctorAssignments,
      chairs,
      dateKey,
      doctors,
      dashboard?.clinicSettings?.staff,
      onAssignChairDoctor,
      popoverSelectedDocId,
      setActiveShiftChairId,
    ],
  );

  const handleApplyDateRange = useCallback(() => {
    const targetDocId = rangeDoctorId || doctors[0]?.id;
    const targetChairId = rangeChairId || chairs[0]?.id || DEFAULT_SOLO_CHAIR.id;
    if (!rangeStartDate || !rangeEndDate || !targetDocId || !targetChairId) {
      showToast("Укажите диапазон дат, врача и кресло", "warning");
      return;
    }
    const doc =
      doctors.find((d) => d.id === targetDocId) ||
      (dashboard?.clinicSettings?.staff ?? []).find((s) => s.id === targetDocId);
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
        const startH =
          rangePreset === "morning_9" ? 9 : rangePreset === "evening_15" ? 15 : isEve ? 14 : 8;
        const endH =
          rangePreset === "morning_9" ? 15 : rangePreset === "evening_15" ? 21 : isEve ? 20 : 14;
        const sHours = `${String(startH).padStart(2, "0")}:00–${String(endH).padStart(2, "0")}:00`;
        const sLabel =
          rangePreset === "morning_9"
            ? "1 см. 09-15"
            : rangePreset === "evening_15"
              ? "2 см. 15-21"
              : isEve
                ? "Вечер 14-20"
                : isMorn
                  ? "Утро 08-14"
                  : "Весь день";

        const assignment: ChairDoctorShiftAssignment = {
          chairId: targetChairId,
          chairName: chairObj.name,
          doctorId: targetDocId,
          doctorName: doc?.fullName || "Врач",
          doctorSpecialty:
            doc && (doc as any).specialty ? String((doc as any).specialty) : undefined,
          shiftPreset: isMorn ? "morning" : isEve ? "evening" : "full",
          shiftLabel: sLabel,
          shiftHours: sHours,
          startHour: startH,
          endHour: endH,
        };

        const storageKey = `dente_chair_doctor_assignments_${dateKey}`;
        const existing = safeLocalStorageGetJson<Record<string, ChairDoctorShiftAssignment>>(storageKey, {});
        existing[targetChairId] = assignment;
        safeLocalStorageSetJson(storageKey, existing);
        syncShiftsWithServer(dateKey, existing, chairs).catch(() => {});

        if (onAssignChairDoctor) {
          onAssignChairDoctor(targetChairId, assignment);
        }
      }
    }

    showToast(
      `График врача ${doc?.fullName ? formatDoctorShortName(doc.fullName) : ""} применен на кресло «${chairObj.name}» (${rangeStartDate} — ${rangeEndDate})`,
      "success",
      3500,
    );
    setIsDateRangeModalOpen(false);
  }, [
    rangeDoctorId,
    rangeChairId,
    rangeStartDate,
    rangeEndDate,
    rangePreset,
    doctors,
    chairs,
    dashboard?.clinicSettings?.staff,
    dateKey,
    onAssignChairDoctor,
    setIsDateRangeModalOpen,
  ]);

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
          try {
            const parsed = JSON.parse(raw);
            syncShiftsWithServer(targetDay, parsed, chairs).catch(() => {});
          } catch {}
        } else if (srcDay === dateKey && chairDoctorAssignments) {
          safeLocalStorageSetJson(targetKey, chairDoctorAssignments);
          syncShiftsWithServer(targetDay, chairDoctorAssignments, chairs).catch(() => {});
        }
      }

      const currentShifts = safeLocalStorageGetJson<any[]>("dente_doctor_shifts", []);
      const updatedShifts = copyWeekShiftsToTargetWeek(currentShifts, mondayIso, nextMondayIso);
      safeLocalStorageSetJson("dente_doctor_shifts", updatedShifts);
    }

    showToast(
      `График смен кресел скопирован на следующую неделю (${nextMondayIso})`,
      "success",
      3500,
    );
  }, [chairs, dateKey, chairDoctorAssignments]);

  const handleCopyTodayShiftsToCurrentWeek = useCallback(
    (workdaysOnly = false) => {
      const label = workdaysOnly ? "будни (Пн–Пт)" : "всю неделю (Пн–Вс)";
      const mondayIso = getMondayOfWeekIso(dateKey);
      const daysCount = workdaysOnly ? 5 : 7;

      let todayAssignments: Record<string, ChairDoctorShiftAssignment> =
        chairDoctorAssignments ? { ...chairDoctorAssignments } : {};

      if (typeof window !== "undefined" && dateKey) {
        const raw = safeLocalStorageGetItem(`dente_chair_doctor_assignments_${dateKey}`);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            todayAssignments = { ...parsed, ...todayAssignments };
          } catch {}
        }

        for (let i = 0; i < daysCount; i++) {
          const targetDay = addDaysToDateIso(mondayIso, i);
          safeLocalStorageSetJson(
            `dente_chair_doctor_assignments_${targetDay}`,
            todayAssignments,
            true,
          );
          syncShiftsWithServer(targetDay, todayAssignments, chairs).catch(() => {});
        }
      }

      showToast(
        `График смен кресел применен на ${label} (${mondayIso}..) в 1 клик (StomX Parity)`,
        "success",
        3500,
      );
    },
    [dateKey, chairDoctorAssignments, chairs],
  );

  const handleCopyTodayShiftsToMonth = useCallback(() => {
    const year = Number.parseInt(dateKey ? dateKey.slice(0, 4) : "2026", 10) || 2026;
    const month = Number.parseInt(dateKey ? dateKey.slice(5, 7) : "9", 10) || 9;
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthNamesRu = [
      "январь",
      "февраль",
      "март",
      "апрель",
      "май",
      "июнь",
      "июль",
      "август",
      "сентябрь",
      "октябрь",
      "ноябрь",
      "декабрь",
    ];
    const monthName = monthNamesRu[month - 1] || "текущий месяц";

    let todayAssignments: Record<string, ChairDoctorShiftAssignment> =
      chairDoctorAssignments ? { ...chairDoctorAssignments } : {};

    if (typeof window !== "undefined" && dateKey) {
      const raw = safeLocalStorageGetItem(`dente_chair_doctor_assignments_${dateKey}`);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          todayAssignments = { ...parsed, ...todayAssignments };
        } catch {}
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const targetDayIso = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        safeLocalStorageSetJson(
          `dente_chair_doctor_assignments_${targetDayIso}`,
          todayAssignments,
        );
        syncShiftsWithServer(targetDayIso, todayAssignments, chairs).catch(() => {});
      }

      const currentShifts = safeLocalStorageGetJson<any[]>("dente_doctor_shifts", []);
      const mondayIso = getMondayOfWeekIso(dateKey);
      const updatedShifts = copyWeekShiftsToMonth(currentShifts, mondayIso, 4);
      safeLocalStorageSetJson("dente_doctor_shifts", updatedShifts);
    }

    showToast(
      `График смен кресел применен на весь текущий месяц (${monthName}) в 1 клик (StomX Parity)`,
      "success",
      3500,
    );
  }, [dateKey, chairDoctorAssignments, chairs]);

  const handleQuickSubstituteDoctor = useCallback(
    (chair: ScheduleChair, newDoctorId: string) => {
      const targetDoc =
        doctors.find((d) => d.id === newDoctorId) ||
        dashboard?.clinicSettings?.staff?.find((s) => s.id === newDoctorId) ||
        doctors[0];
      const newDoctorName = targetDoc ? targetDoc.fullName : newDoctorId;
      const existingAssignment = chairDoctorAssignments?.[chair.id] || null;

      const updatedAssignment: ChairDoctorShiftAssignment = {
        chairId: chair.id,
        chairName: chair.name,
        doctorId: newDoctorId,
        doctorName: newDoctorName,
        doctorSpecialty:
          targetDoc && (targetDoc as any).specialty
            ? String((targetDoc as any).specialty)
            : existingAssignment?.doctorSpecialty,
        shiftPreset: existingAssignment?.shiftPreset || "full",
        shiftLabel: existingAssignment?.shiftLabel || "Весь день",
        shiftHours: existingAssignment?.shiftHours || "08:00–20:00",
        startHour: existingAssignment?.startHour ?? 8,
        endHour: existingAssignment?.endHour ?? 20,
      };

      if (typeof window !== "undefined" && dateKey) {
        const storageKey = `dente_chair_doctor_assignments_${dateKey}`;
        const existing = safeLocalStorageGetJson<Record<string, ChairDoctorShiftAssignment>>(storageKey, {});
        existing[chair.id] = updatedAssignment;
        safeLocalStorageSetJson(storageKey, existing);
        syncShiftsWithServer(dateKey, existing, chairs).catch(() => {});
      }

      if (onAssignChairDoctor) {
        onAssignChairDoctor(chair.id, updatedAssignment);
      }

      showToast(
        `Врач ${newDoctorName} подменяет врача на кресле «${chair.name}» (StomX Parity)`,
        "success",
      );
      setIsSubstituteOpen((prev) => ({ ...prev, [chair.id]: false }));
      setActiveShiftChairId(null);
    },
    [
      doctors,
      dashboard?.clinicSettings?.staff,
      chairDoctorAssignments,
      chairs,
      dateKey,
      onAssignChairDoctor,
      setIsSubstituteOpen,
      setActiveShiftChairId,
    ],
  );

  const handleRotateChairShifts = useCallback(() => {
    const targetChairs = chairs.length > 0 ? chairs : DEFAULT_CLINIC_CHAIRS;
    if (targetChairs.length < 2) {
      showToast("Для ротации требуется минимум 2 кресла", "warning");
      return;
    }

    let currentAssignments: Record<string, ChairDoctorShiftAssignment> =
      chairDoctorAssignments ? { ...chairDoctorAssignments } : {};

    if (typeof window !== "undefined" && dateKey) {
      const raw = safeLocalStorageGetItem(`dente_chair_doctor_assignments_${dateKey}`);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          currentAssignments = { ...parsed, ...currentAssignments };
        } catch {}
      }
    }

    // Cyclic shift: chair i gets assignment from chair (i - 1 + n) % n
    const n = targetChairs.length;
    const rotatedAssignments: Record<string, ChairDoctorShiftAssignment> = {};

    for (let i = 0; i < n; i++) {
      const targetChair = targetChairs[i]!;
      const sourceChair = targetChairs[(i - 1 + n) % n]!;
      const sourceAssignment = currentAssignments[sourceChair.id];

      if (sourceAssignment) {
        rotatedAssignments[targetChair.id] = {
          ...sourceAssignment,
          chairId: targetChair.id,
          chairName: targetChair.name,
        };
      }
    }

    if (typeof window !== "undefined" && dateKey) {
      safeLocalStorageSetJson(
        `dente_chair_doctor_assignments_${dateKey}`,
        rotatedAssignments,
      );
      syncShiftsWithServer(dateKey, rotatedAssignments, targetChairs).catch(() => {});
    }

    if (onAssignChairDoctor) {
      for (const chair of targetChairs) {
        onAssignChairDoctor(chair.id, rotatedAssignments[chair.id] || null);
      }
    }

    showToast(
      "Выполнена циклическая ротация смен между креслами в 1 клик (StomX Parity)",
      "success",
      3500,
    );
  }, [chairs, chairDoctorAssignments, dateKey, onAssignChairDoctor]);

  const handleClearAllDayShifts = useCallback(() => {
    if (typeof window !== "undefined" && dateKey) {
      safeLocalStorageRemoveItem(`dente_chair_doctor_assignments_${dateKey}`);
      syncShiftsWithServer(dateKey, {}, chairs).catch(() => {});
    }

    if (onAssignChairDoctor) {
      const targetChairs = chairs.length > 0 ? chairs : DEFAULT_CLINIC_CHAIRS;
      for (const chair of targetChairs) {
        onAssignChairDoctor(chair.id, null);
      }
    }

    showToast(`Все смены кресел на ${dateKey} очищены`, "info");
  }, [dateKey, onAssignChairDoctor, chairs]);

  const handleApplyDoctorPreferredChairs = useCallback(() => {
    const targetChairs = (chairs.length > 0 ? chairs : DEFAULT_CLINIC_CHAIRS).filter(
      (c) => c.active !== false,
    );

    let storedPreferredMap: Record<string, string> = {};
    let storedChairDefaultMap: Record<string, string> = {};
    if (typeof window !== "undefined") {
      storedPreferredMap = safeLocalStorageGetJson<Record<string, string>>("dente_doctor_preferred_chairs", {});
      storedChairDefaultMap = safeLocalStorageGetJson<Record<string, string>>("dente_chair_default_doctors", {});
    }

    const todayAssignments: Record<string, ChairDoctorShiftAssignment> = {};
    if (typeof window !== "undefined" && dateKey) {
      const raw = safeLocalStorageGetItem(`dente_chair_doctor_assignments_${dateKey}`);
      if (raw) {
        try {
          Object.assign(todayAssignments, JSON.parse(raw));
        } catch {}
      }
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
          chairId: chair.id,
          chairName: chair.name,
          doctorId: boundDoc.id,
          doctorName: boundDoc.fullName,
          doctorSpecialty: (boundDoc as any).specialty
            ? String((boundDoc as any).specialty)
            : undefined,
          shiftPreset: "full",
          shiftLabel: "Весь день",
          shiftHours: "08:00–20:00",
          startHour: 8,
          endHour: 20,
        };
        todayAssignments[chair.id] = assignment;
        if (onAssignChairDoctor) {
          onAssignChairDoctor(chair.id, assignment);
        }
      }
    }

    if (typeof window !== "undefined" && dateKey) {
      safeLocalStorageSetJson(
        `dente_chair_doctor_assignments_${dateKey}`,
        todayAssignments,
      );
      syncShiftsWithServer(dateKey, todayAssignments, targetChairs).catch(() => {});
    }

    showToast(
      "Закрепленные врачи назначены на смены дня в 1 клик (StomX Parity)",
      "success",
      3500,
    );
  }, [chairs, doctors, dashboard?.clinicSettings?.staff, dateKey, onAssignChairDoctor]);

  const handleDuplicateChair = useCallback((chair: ScheduleChair) => {
    const duplicatedData: QuickAddChairData = {
      name: `${chair.name} (копия)`,
      room: (chair as any).roomNumber || (chair as any).room || "",
      color: (chair as any).color || "var(--teal, #0d9488)",
      specialization: (chair as any).specialization || "therapist",
      defaultDoctorId: (chair as any).defaultDoctorId || null,
      isActive: true,
    };
    setEditingChair(duplicatedData);
    setIsAddChairOpen(true);
    showToast(`Клонирование параметров кресла «${chair.name}»`, "info", 3000);
    setActiveShiftChairId(null);
  }, [setEditingChair, setIsAddChairOpen, setActiveShiftChairId]);

  const handleUnassignShift = useCallback(
    (chair: ScheduleChair) => {
      let updatedAssignments: Record<string, ChairDoctorShiftAssignment> = {};
      if (typeof window !== "undefined" && dateKey) {
        const storageKey = `dente_chair_doctor_assignments_${dateKey}`;
        const existing = safeLocalStorageGetJson<Record<string, ChairDoctorShiftAssignment>>(storageKey, {});
        delete existing[chair.id];
        updatedAssignments = existing;
        safeLocalStorageSetJson(storageKey, existing);
        syncShiftsWithServer(dateKey, updatedAssignments, chairs).catch(() => {});
      }

      if (onAssignChairDoctor) {
        onAssignChairDoctor(chair.id, null);
      }
      showToast(`Врач снят со смены: кресло «${chair.name}» освобождено`, "info");
      setActiveShiftChairId(null);
    },
    [chairs, dateKey, onAssignChairDoctor, setActiveShiftChairId],
  );

  return {
    handleAssignShift,
    handleApplyDateRange,
    handleCopyWeekShiftsToNextWeek,
    handleCopyTodayShiftsToCurrentWeek,
    handleCopyTodayShiftsToMonth,
    handleQuickSubstituteDoctor,
    handleRotateChairShifts,
    handleClearAllDayShifts,
    handleApplyDoctorPreferredChairs,
    handleDuplicateChair,
    handleUnassignShift,
  };
}
