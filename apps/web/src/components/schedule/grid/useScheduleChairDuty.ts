import { useCallback, useEffect, useMemo, useState } from "react";
import type { Dashboard, DentalSpecialty } from "@dental/shared";
import { specialtyLabels } from "../../../workspaceUiLabels";
import { showToast } from "../../GlobalToast";
import { formatDoctorShortName } from ".././GridAppointmentCard";
import {
  safeLocalStorageGetJson,
  safeLocalStorageSetJson,
} from "../../../lib/safeLocalStorage";
import { useScheduleChairShiftBulkOps } from "./useScheduleChairShiftBulkOps";
import { DEFAULT_SOLO_CHAIR, CHAIR_SHIFT_PRESETS } from "./gridConstants";
import type {
  ChairDoctorShiftAssignment,
  ChairDoctorSubShift,
} from "./gridTypes";

export interface UseScheduleChairDutyProps {
  dashboard: Dashboard;
  dateKey: string;
  selectedChairId?: string | null | undefined;
  chairDoctorAssignments?:
    | Record<string, ChairDoctorShiftAssignment>
    | undefined;
  onAssignChairDoctor?:
    | ((chairId: string, assignment: ChairDoctorShiftAssignment | null) => void)
    | undefined;
  onOpenAddChair?: (() => void) | undefined;
}

export function useScheduleChairDuty({
  dashboard,
  dateKey,
  selectedChairId,
  chairDoctorAssignments,
  onAssignChairDoctor,
  onOpenAddChair,
}: UseScheduleChairDutyProps) {
  const staff = dashboard?.clinicSettings?.staff ?? [];
  const doctors = useMemo(() => {
    return staff.filter(
      (m) =>
        m.active !== false &&
        (m.role === "doctor" || m.role === "owner" || !m.role),
    );
  }, [staff]);

  const chairs = useMemo(() => {
    const all = (dashboard?.clinicSettings?.chairs ?? []).filter(
      (c) => c.active,
    );
    if (selectedChairId) {
      const filtered = all.filter((c) => c.id === selectedChairId);
      if (filtered.length > 0) return filtered;
    }
    return all;
  }, [dashboard?.clinicSettings?.chairs, selectedChairId]);

  const rawChairs = dashboard?.clinicSettings?.chairs;
  const isSoloMode =
    dashboard?.clinicSettings?.profile?.mode === "solo_doctor" ||
    dashboard?.clinicSettings?.profile?.mode === "one_chair" ||
    (dashboard?.clinicSettings?.profile?.mode as string) === "solo_practice";

  const isZeroChairs =
    Array.isArray(rawChairs) && chairs.length === 0 && !isSoloMode;

  const effectiveChairs = useMemo(() => {
    return chairs && chairs.length > 0 ? chairs : [DEFAULT_SOLO_CHAIR];
  }, [chairs]);

  const isSoloDoctor =
    isSoloMode ||
    (doctors.length <= 1 && effectiveChairs.length <= 1) ||
    doctors.length === 1;

  const [localChairAssignments, setLocalChairAssignments] = useState<
    Record<string, ChairDoctorShiftAssignment>
  >(() => {
    if (chairDoctorAssignments) return chairDoctorAssignments;
    return safeLocalStorageGetJson<Record<string, ChairDoctorShiftAssignment>>(
      `dente_chair_doctor_assignments_${dateKey}`,
      {},
    );
  });

  const [activeHeaderDoctorPopoverChairId, setActiveHeaderDoctorPopoverChairId] =
    useState<string | null>(null);
  const [activeHeaderMaintenanceChairId, setActiveHeaderMaintenanceChairId] =
    useState<string | null>(null);

  useEffect(() => {
    const incoming = chairDoctorAssignments;
    if (incoming) {
      setLocalChairAssignments((prev) => {
        if (prev === incoming) return prev;
        if (
          prev &&
          Object.keys(prev).length === 0 &&
          Object.keys(incoming).length === 0
        )
          return prev;
        return incoming;
      });
      return;
    }
    if (typeof window !== "undefined") {
      const parsed = safeLocalStorageGetJson<Record<
        string,
        ChairDoctorShiftAssignment
      > | null>(`dente_chair_doctor_assignments_${dateKey}`, null);
      if (parsed) {
        setLocalChairAssignments(parsed);
        return;
      }
    }
    setLocalChairAssignments({});
  }, [dateKey, chairDoctorAssignments]);

  const effectiveChairAssignments = useMemo(() => {
    const assignments: Record<string, ChairDoctorShiftAssignment> = {
      ...(chairDoctorAssignments || {}),
      ...localChairAssignments,
    };

    // If chair has defaultDoctorId or clinic is solo doctor, auto-bind that doctor to the chair(s)
    for (const chair of effectiveChairs) {
      if (
        assignments[chair.id]?.doctorId === "" ||
        (assignments[chair.id] as any)?.unassigned
      ) {
        continue;
      }
      if (!assignments[chair.id]) {
        const chairDefaultDocId = (chair as any)?.defaultDoctorId;
        const defaultDoc = chairDefaultDocId
          ? doctors.find((d) => d.id === chairDefaultDocId)
          : isSoloDoctor && doctors.length >= 1
            ? doctors[0]
            : null;

        if (defaultDoc) {
          const specialty =
            defaultDoc.specialties && defaultDoc.specialties.length > 0
              ? specialtyLabels[defaultDoc.specialties[0] as DentalSpecialty] ||
                defaultDoc.specialties[0]
              : defaultDoc.role === "doctor"
                ? "Стоматолог"
                : "";
          assignments[chair.id] = {
            chairId: chair.id,
            doctorId: defaultDoc.id,
            doctorName: defaultDoc.fullName,
            doctorSpecialty: specialty,
            shiftPreset: "full",
            shiftLabel: chairDefaultDocId ? "Основной врач" : "Полный день",
            shiftHours: "08:00–20:00",
            startHour: 8,
            endHour: 20,
          };
        }
      }
    }

    return assignments;
  }, [
    localChairAssignments,
    chairDoctorAssignments,
    isSoloDoctor,
    doctors,
    effectiveChairs,
  ]);

  const [assigningChairId, setAssigningChairId] = useState<string | null>(null);
  const [modalDoctorId, setModalDoctorId] = useState<string>("");
  const [modalEveningDoctorId, setModalEveningDoctorId] = useState<string>("");
  const [modalShiftPreset, setModalShiftPreset] = useState<
    "morning" | "evening" | "full" | "two_shifts"
  >("full");
  const [isInternalAddChairModalOpen, setIsInternalAddChairModalOpen] =
    useState<boolean>(false);
  const [isQuickAddDoctorOpen, setIsQuickAddDoctorOpen] =
    useState<boolean>(false);

  const handleOpenAddChair = useCallback(() => {
    if (typeof onOpenAddChair === "function") {
      onOpenAddChair();
    } else {
      setIsInternalAddChairModalOpen(true);
    }
  }, [onOpenAddChair]);

  const getSuggestedDoctorForChair = useCallback(
    (targetChairId: string) => {
      if (doctors.length === 0) return null;
      const targetChair = effectiveChairs.find((c) => c.id === targetChairId);
      const defaultDocId = (targetChair as any)?.defaultDoctorId;
      if (defaultDocId) {
        const defaultDoc = doctors.find((d) => d.id === defaultDocId);
        if (defaultDoc) return defaultDoc;
      }
      const chairSpec = (targetChair as { specialization?: string })
        ?.specialization;
      if (chairSpec) {
        const matchingDoc = doctors.find(
          (d) =>
            d.specialties &&
            d.specialties.some(
              (s) => s.toLowerCase() === chairSpec.toLowerCase(),
            ),
        );
        if (matchingDoc) return matchingDoc;
      }
      const chairIdx = effectiveChairs.findIndex((c) => c.id === targetChairId);
      if (chairIdx >= 0 && chairIdx < doctors.length) {
        return doctors[chairIdx] || doctors[0] || null;
      }
      return doctors[0] || null;
    },
    [doctors, effectiveChairs],
  );

  const getDoctorForChairAndHour = useCallback(
    (targetChairId: string, hourStr: string): string | null => {
      const assignment = effectiveChairAssignments[targetChairId];
      if (!assignment) return null;
      const hourNum = parseInt(hourStr.slice(0, 2), 10) || 8;

      // 1. Two-shift chair handling: morning (< 14:00) vs evening (>= 14:00)
      if (
        (assignment.subShifts && assignment.subShifts.length > 1) ||
        assignment.shiftPreset === "two_shifts"
      ) {
        const mornSub = assignment.subShifts?.[0];
        const eveSub = assignment.subShifts?.[1];
        const mornStart = mornSub?.startHour ?? 8;
        const eveEnd = eveSub?.endHour ?? 20;
        const splitHour = mornSub?.endHour ?? eveSub?.startHour ?? 14;
        if (
          hourNum < mornStart ||
          (hourNum >= eveEnd && (eveEnd < 20 || hourNum > 20))
        ) {
          return null;
        }
        const mornDocId = mornSub?.doctorId || assignment.doctorId;
        const eveDocId =
          eveSub?.doctorId || mornSub?.doctorId || assignment.doctorId;
        if (hourNum < splitHour) {
          return mornDocId || null;
        }
        return eveDocId || null;
      }

      // 2. Custom sub-shifts array
      if (assignment.subShifts && assignment.subShifts.length > 0) {
        const matching = assignment.subShifts.find(
          (s) =>
            hourNum >= s.startHour &&
            (hourNum < s.endHour || (s.endHour >= 20 && hourNum <= s.endHour)),
        );
        if (matching) return matching.doctorId;
        return null;
      }

      // 3. Preset bounds: morning only vs evening only (including 09-15 and 15-21)
      if (assignment.shiftPreset === "morning") {
        if (hourNum >= 8 && hourNum < 14) return assignment.doctorId || null;
        return null;
      }
      if (assignment.shiftPreset === "morning_9") {
        if (hourNum >= 9 && hourNum < 15) return assignment.doctorId || null;
        return null;
      }
      if (assignment.shiftPreset === "evening") {
        if (hourNum >= 14 && hourNum <= 20) return assignment.doctorId || null;
        return null;
      }
      if (assignment.shiftPreset === "evening_15") {
        if (hourNum >= 15 && hourNum <= 21) return assignment.doctorId || null;
        return null;
      }
      if (assignment.shiftPreset === "full_9_21") {
        if (hourNum >= 9 && hourNum <= 21) return assignment.doctorId || null;
        return null;
      }

      // 4. Numerical start/end hour range
      if (
        assignment.startHour !== undefined &&
        assignment.endHour !== undefined
      ) {
        if (
          hourNum >= assignment.startHour &&
          (hourNum < assignment.endHour ||
            (assignment.endHour >= 20 && hourNum <= assignment.endHour))
        ) {
          return assignment.doctorId || null;
        }
        return null;
      }
      return assignment.doctorId || null;
    },
    [effectiveChairAssignments],
  );

  const openAssignModal = useCallback(
    (chairId: string) => {
      const existing = effectiveChairAssignments[chairId];
      const suggested = getSuggestedDoctorForChair(chairId);
      setAssigningChairId(chairId);

      if (existing?.subShifts && existing.subShifts.length > 1) {
        setModalShiftPreset("two_shifts");
        setModalDoctorId(existing.subShifts[0]?.doctorId || "");
        setModalEveningDoctorId(existing.subShifts[1]?.doctorId || "");
      } else {
        setModalDoctorId(
          existing?.doctorId ||
            (suggested
              ? suggested.id
              : doctors.length > 0
                ? doctors[0]!.id
                : ""),
        );
        const otherDoc =
          doctors.find((d) => d.id !== (existing?.doctorId || suggested?.id)) ||
          doctors[1] ||
          doctors[0];
        setModalEveningDoctorId(otherDoc?.id || "");
        setModalShiftPreset(
          existing?.shiftPreset === "morning" ||
            existing?.shiftPreset === "evening"
            ? existing.shiftPreset
            : "full",
        );
      }
    },
    [effectiveChairAssignments, doctors, getSuggestedDoctorForChair],
  );

  const handleConfirmAssignDoctor = useCallback(
    (
      chairId: string,
      docId: string,
      shiftPreset:
        | "morning"
        | "morning_9"
        | "evening"
        | "evening_15"
        | "full"
        | "full_9_21"
        | "two_shifts",
      eveningDocId?: string,
    ) => {
      const doc = doctors.find((d) => d.id === docId);
      const chair = effectiveChairs.find((c) => c.id === chairId) || {
        id: chairId,
        name: "Кресло",
      };
      const specialty =
        doc?.specialties && doc.specialties.length > 0
          ? specialtyLabels[doc.specialties[0] as DentalSpecialty] ||
            doc.specialties[0]
          : doc?.role === "doctor"
            ? "Стоматолог"
            : "";
      const doctorName = doc?.fullName || "Врач";

      let assignment: ChairDoctorShiftAssignment;

      if (shiftPreset === "two_shifts") {
        const evDoc =
          doctors.find((d) => d.id === (eveningDocId || docId)) || doc;
        const evDocName = evDoc?.fullName || "Врач";
        const evDocSpecialty =
          evDoc?.specialties && evDoc.specialties.length > 0
            ? specialtyLabels[evDoc.specialties[0] as DentalSpecialty] ||
              evDoc.specialties[0]
            : evDoc?.role === "doctor"
              ? "Стоматолог"
              : "";

        const subShifts: ChairDoctorSubShift[] = [
          {
            doctorId: docId,
            doctorName,
            doctorSpecialty: specialty,
            startHour: 8,
            endHour: 14,
            shiftHours: "08:00–14:00",
          },
          {
            doctorId: evDoc?.id || docId,
            doctorName: evDocName,
            doctorSpecialty: evDocSpecialty,
            startHour: 14,
            endHour: 20,
            shiftHours: "14:00–20:00",
          },
        ];

        assignment = {
          chairId,
          doctorId: docId,
          doctorName,
          doctorSpecialty: specialty,
          shiftPreset: "custom",
          shiftLabel: `Утро: ${formatDoctorShortName(doctorName)} · Вечер: ${formatDoctorShortName(evDocName)}`,
          shiftHours: "08:00–20:00",
          startHour: 8,
          endHour: 20,
          subShifts,
        };
      } else if (shiftPreset === "morning") {
        const existing = effectiveChairAssignments[chairId];
        const existingEvening =
          existing?.shiftPreset === "evening"
            ? {
                doctorId: existing.doctorId,
                doctorName: existing.doctorName,
                doctorSpecialty: existing.doctorSpecialty,
                startHour: existing.startHour ?? 14,
                endHour: existing.endHour ?? 20,
                shiftHours: existing.shiftHours || "14:00–20:00",
              }
            : existing?.subShifts?.find((s) => s.startHour >= 14);

        const morningSubShift: ChairDoctorSubShift = {
          doctorId: docId,
          doctorName,
          doctorSpecialty: specialty,
          startHour: 8,
          endHour: 14,
          shiftHours: "08:00–14:00",
        };

        if (existingEvening && existingEvening.doctorId) {
          assignment = {
            chairId,
            doctorId: docId,
            doctorName: `${formatDoctorShortName(doctorName)} / ${formatDoctorShortName(existingEvening.doctorName)}`,
            doctorSpecialty: specialty,
            shiftPreset: "custom",
            shiftLabel: `Утро: ${formatDoctorShortName(doctorName)} · Вечер: ${formatDoctorShortName(existingEvening.doctorName)}`,
            shiftHours: "08:00–14:00 & 14:00–20:00",
            startHour: 8,
            endHour: existingEvening.endHour || 20,
            subShifts: [morningSubShift, existingEvening],
          };
        } else {
          const preset = CHAIR_SHIFT_PRESETS.find((p) => p.id === "morning")!;
          assignment = {
            chairId,
            doctorId: docId,
            doctorName,
            doctorSpecialty: specialty,
            shiftPreset: "morning",
            shiftLabel: preset.label,
            shiftHours: preset.hours,
            startHour: preset.startHour,
            endHour: preset.endHour,
            subShifts: [morningSubShift],
          };
        }
      } else if (shiftPreset === "morning_9") {
        const existing = effectiveChairAssignments[chairId];
        const existingEvening =
          existing?.shiftPreset === "evening_15"
            ? {
                doctorId: existing.doctorId,
                doctorName: existing.doctorName,
                doctorSpecialty: existing.doctorSpecialty,
                startHour: existing.startHour ?? 15,
                endHour: existing.endHour ?? 21,
                shiftHours: existing.shiftHours || "15:00–21:00",
              }
            : existing?.subShifts?.find((s) => s.startHour >= 15);

        const morningSubShift: ChairDoctorSubShift = {
          doctorId: docId,
          doctorName,
          doctorSpecialty: specialty,
          startHour: 9,
          endHour: 15,
          shiftHours: "09:00–15:00",
        };

        if (existingEvening && existingEvening.doctorId) {
          assignment = {
            chairId,
            doctorId: docId,
            doctorName: `${formatDoctorShortName(doctorName)} / ${formatDoctorShortName(existingEvening.doctorName)}`,
            doctorSpecialty: specialty,
            shiftPreset: "custom",
            shiftLabel: `1 см: ${formatDoctorShortName(doctorName)} · 2 см: ${formatDoctorShortName(existingEvening.doctorName)}`,
            shiftHours: "09:00–15:00 & 15:00–21:00",
            startHour: 9,
            endHour: existingEvening.endHour || 21,
            subShifts: [morningSubShift, existingEvening],
          };
        } else {
          const preset = CHAIR_SHIFT_PRESETS.find(
            (p) => p.id === "morning_9",
          )!;
          assignment = {
            chairId,
            doctorId: docId,
            doctorName,
            doctorSpecialty: specialty,
            shiftPreset: "morning_9",
            shiftLabel: preset.label,
            shiftHours: preset.hours,
            startHour: preset.startHour,
            endHour: preset.endHour,
            subShifts: [morningSubShift],
          };
        }
      } else if (shiftPreset === "evening") {
        const existing = effectiveChairAssignments[chairId];
        const existingMorning =
          existing?.shiftPreset === "morning"
            ? {
                doctorId: existing.doctorId,
                doctorName: existing.doctorName,
                doctorSpecialty: existing.doctorSpecialty,
                startHour: existing.startHour ?? 8,
                endHour: existing.endHour ?? 14,
                shiftHours: existing.shiftHours || "08:00–14:00",
              }
            : existing?.subShifts?.find((s) => s.startHour < 14);

        const eveningSubShift: ChairDoctorSubShift = {
          doctorId: docId,
          doctorName,
          doctorSpecialty: specialty,
          startHour: 14,
          endHour: 20,
          shiftHours: "14:00–20:00",
        };

        if (existingMorning && existingMorning.doctorId) {
          assignment = {
            chairId,
            doctorId: existingMorning.doctorId,
            doctorName: `${formatDoctorShortName(existingMorning.doctorName)} / ${formatDoctorShortName(doctorName)}`,
            doctorSpecialty: existingMorning.doctorSpecialty || specialty,
            shiftPreset: "custom",
            shiftLabel: `Утро: ${formatDoctorShortName(existingMorning.doctorName)} · Вечер: ${formatDoctorShortName(doctorName)}`,
            shiftHours: existingMorning.shiftHours + " & 14:00–20:00",
            startHour: existingMorning.startHour || 8,
            endHour: 20,
            subShifts: [existingMorning, eveningSubShift],
          };
        } else {
          const preset = CHAIR_SHIFT_PRESETS.find((p) => p.id === "evening")!;
          assignment = {
            chairId,
            doctorId: docId,
            doctorName,
            doctorSpecialty: specialty,
            shiftPreset: "evening",
            shiftLabel: preset.label,
            shiftHours: preset.hours,
            startHour: preset.startHour,
            endHour: preset.endHour,
            subShifts: [eveningSubShift],
          };
        }
      } else if (shiftPreset === "evening_15") {
        const existing = effectiveChairAssignments[chairId];
        const existingMorning =
          existing?.shiftPreset === "morning_9"
            ? {
                doctorId: existing.doctorId,
                doctorName: existing.doctorName,
                doctorSpecialty: existing.doctorSpecialty,
                startHour: existing.startHour ?? 9,
                endHour: existing.endHour ?? 15,
                shiftHours: existing.shiftHours || "09:00–15:00",
              }
            : existing?.subShifts?.find((s) => s.startHour < 15);

        const eveningSubShift: ChairDoctorSubShift = {
          doctorId: docId,
          doctorName,
          doctorSpecialty: specialty,
          startHour: 15,
          endHour: 21,
          shiftHours: "15:00–21:00",
        };

        if (existingMorning && existingMorning.doctorId) {
          assignment = {
            chairId,
            doctorId: existingMorning.doctorId,
            doctorName: `${formatDoctorShortName(existingMorning.doctorName)} / ${formatDoctorShortName(doctorName)}`,
            doctorSpecialty: existingMorning.doctorSpecialty || specialty,
            shiftPreset: "custom",
            shiftLabel: `1 см: ${formatDoctorShortName(existingMorning.doctorName)} · 2 см: ${formatDoctorShortName(doctorName)}`,
            shiftHours: existingMorning.shiftHours + " & 15:00–21:00",
            startHour: existingMorning.startHour || 9,
            endHour: 21,
            subShifts: [existingMorning, eveningSubShift],
          };
        } else {
          const preset = CHAIR_SHIFT_PRESETS.find(
            (p) => p.id === "evening_15",
          )!;
          assignment = {
            chairId,
            doctorId: docId,
            doctorName,
            doctorSpecialty: specialty,
            shiftPreset: "evening_15",
            shiftLabel: preset.label,
            shiftHours: preset.hours,
            startHour: preset.startHour,
            endHour: preset.endHour,
            subShifts: [eveningSubShift],
          };
        }
      } else {
        const preset =
          CHAIR_SHIFT_PRESETS.find((p) => p.id === shiftPreset) ||
          CHAIR_SHIFT_PRESETS[2]!;
        assignment = {
          chairId,
          doctorId: docId,
          doctorName,
          doctorSpecialty: specialty,
          shiftPreset,
          shiftLabel: preset.label,
          shiftHours: preset.hours,
          startHour: preset.startHour,
          endHour: preset.endHour,
          subShifts: [
            {
              doctorId: docId,
              doctorName,
              doctorSpecialty: specialty,
              startHour: preset.startHour,
              endHour: preset.endHour,
              shiftHours: preset.hours,
            },
          ],
        };
      }

      setLocalChairAssignments((prev) => {
        const next = { ...prev, [chairId]: assignment };
        if (typeof window !== "undefined") {
          safeLocalStorageSetJson(
            `dente_chair_doctor_assignments_${dateKey}`,
            next,
          );
        }
        return next;
      });

      if (typeof onAssignChairDoctor === "function") {
        onAssignChairDoctor(chairId, assignment);
      }

      if (shiftPreset === "two_shifts") {
        const evDoc = doctors.find((d) => d.id === (eveningDocId || docId));
        showToast(
          `Кресло «${chair.name}»: 2 смены (Утро: ${formatDoctorShortName(doctorName)}, Вечер: ${formatDoctorShortName(evDoc?.fullName || "Врач")})`,
          "success",
          3500,
        );
      } else {
        const shortName = formatDoctorShortName(doctorName);
        showToast(
          `Врач ${shortName} закреплен за креслом «${chair.name}» (${assignment.shiftHours})`,
          "success",
          3000,
        );
      }
    },
    [doctors, effectiveChairs, dateKey, onAssignChairDoctor, effectiveChairAssignments],
  );

  const handleBindDoctorToChair = useCallback(
    (chairId: string, doctorId: string) => {
      const targetChair = effectiveChairs.find((c) => c.id === chairId);
      const chairName = targetChair?.name || chairId;
      const targetDoc =
        doctors.find((d) => d.id === doctorId) ||
        (dashboard?.clinicSettings?.staff ?? []).find((s) => s.id === doctorId);
      const doctorName = targetDoc
        ? formatDoctorShortName(targetDoc.fullName)
        : doctorId;

      if (typeof window !== "undefined") {
        const storedPref = safeLocalStorageGetJson<Record<string, string>>(
          "dente_doctor_preferred_chairs",
          {},
        );
        storedPref[doctorId] = chairId;
        safeLocalStorageSetJson("dente_doctor_preferred_chairs", storedPref);

        const storedChairDef = safeLocalStorageGetJson<Record<string, string>>(
          "dente_chair_default_doctors",
          {},
        );
        storedChairDef[chairId] = doctorId;
        safeLocalStorageSetJson("dente_chair_default_doctors", storedChairDef);
      }

      if (targetDoc) {
        (targetDoc as any).preferredChairId = chairId;
      }
      if (targetChair) {
        (targetChair as any).defaultDoctorId = doctorId;
      }

      handleConfirmAssignDoctor(chairId, doctorId, "full");

      showToast(
        `Врач ${doctorName} закреплен за креслом «${chairName}»`,
        "success",
        3500,
      );
    },
    [
      effectiveChairs,
      doctors,
      dashboard?.clinicSettings?.staff,
      handleConfirmAssignDoctor,
    ],
  );

  const {
    handleAssignDoctorWeek,
    handleAssignDoctorMonth,
    handleQuickSubstituteDoctor,
    handleCopyWeekShiftsToNextWeek,
    handleUnassignDoctor,
  } = useScheduleChairShiftBulkOps({
    doctors,
    effectiveChairs,
    effectiveChairAssignments,
    dateKey,
    dashboard,
    setLocalChairAssignments,
    onAssignChairDoctor,
  });

  return {
    staff,
    doctors,
    chairs,
    rawChairs,
    isSoloMode,
    isZeroChairs,
    effectiveChairs,
    isSoloDoctor,
    localChairAssignments,
    setLocalChairAssignments,
    effectiveChairAssignments,
    assigningChairId,
    setAssigningChairId,
    modalDoctorId,
    setModalDoctorId,
    modalEveningDoctorId,
    setModalEveningDoctorId,
    modalShiftPreset,
    setModalShiftPreset,
    isInternalAddChairModalOpen,
    setIsInternalAddChairModalOpen,
    handleOpenAddChair,
    isQuickAddDoctorOpen,
    setIsQuickAddDoctorOpen,
    activeHeaderDoctorPopoverChairId,
    setActiveHeaderDoctorPopoverChairId,
    activeHeaderMaintenanceChairId,
    setActiveHeaderMaintenanceChairId,
    getSuggestedDoctorForChair,
    getDoctorForChairAndHour,
    openAssignModal,
    handleConfirmAssignDoctor,
    handleBindDoctorToChair,
    handleUnassignDoctor,
    handleAssignDoctorWeek,
    handleAssignDoctorMonth,
    handleQuickSubstituteDoctor,
    handleCopyWeekShiftsToNextWeek,
  };
}
