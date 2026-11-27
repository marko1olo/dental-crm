import { useState, useEffect, useCallback, useMemo } from "react";
import { generateUuidV7, type Appointment, type Dashboard } from "@dental/shared";
import {
  safeLocalStorageGetItem,
  safeLocalStorageSetItem,
  safeLocalStorageRemoveItem,
} from "../../../lib/safeLocalStorage";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";
import type {
  DoctorShift,
  StaffMember as RosterStaffMember,
  CabinetDefinition as RosterCabinetDefinition,
} from "../roster/DoctorShiftRosterModal";
import type { MedicalStaffRole } from "../roster/doctorShiftRosterPresets";
import {
  DEFAULT_CLINIC_STAFF,
  CLINIC_CABINETS_CATALOG,
} from "../roster/doctorShiftRosterPresets";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { buildChairDoctorAssignmentsByDate } from "./scheduleViewShifts";

export interface UseScheduleRosterDataParams {
  dashboard: Dashboard | null | undefined;
  sortedAppointments?: Appointment[] | undefined;
  auth?: { denteClinicalMutationHeaders?: () => Record<string, string>; [key: string]: unknown } | null | undefined;
  currentDateKey: string;
}

export function useScheduleRosterData({
  dashboard,
  sortedAppointments,
  auth,
  currentDateKey,
}: UseScheduleRosterDataParams) {
  const [savedDoctorShifts, setSavedDoctorShifts] = useState<DoctorShift[]>(
    () => {
      try {
        const stored = safeLocalStorageGetItem("dente_doctor_shifts");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {
        /* ignore parse error */
      }
      return [];
    },
  );

  useEffect(() => {
    let isMounted = true;
    async function hydratePersistedShifts() {
      try {
        if (typeof fetch === "undefined") return;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          ...(auth?.denteClinicalMutationHeaders
            ? auth.denteClinicalMutationHeaders()
            : {}),
        };
        const res = await fetch("/api/schedule/shifts", { headers }).catch(
          () => null,
        );
        if (res && res.ok) {
          const data = await res.json().catch(() => null);
          if (
            isMounted &&
            data &&
            Array.isArray(data.shifts)
          ) {
            if (data.shifts.length > 0) {
              try {
                safeLocalStorageSetItem(
                  "dente_doctor_shifts",
                  JSON.stringify(data.shifts),
                );
              } catch (storageErr: unknown) {
                logger.warn(
                  "[ScheduleView] Error saving dente_doctor_shifts to storage:",
                  storageErr,
                );
              }
              setSavedDoctorShifts(data.shifts);
            } else {
              try {
                safeLocalStorageRemoveItem("dente_doctor_shifts");
              } catch (storageErr: unknown) {
                logger.warn(
                  "[ScheduleView] Error removing dente_doctor_shifts from storage:",
                  storageErr,
                );
              }
              setSavedDoctorShifts([]);
            }
          }
        }
      } catch (fetchErr: unknown) {
        logger.warn(
          "[ScheduleView] hydratePersistedShifts fetch error:",
          fetchErr,
        );
      }
    }
    hydratePersistedShifts();
    return () => {
      isMounted = false;
    };
  }, [auth]);

  const handleSaveDoctorShifts = useCallback(async (shifts: DoctorShift[]) => {
    setSavedDoctorShifts(shifts);
    try {
      if (shifts.length > 0) {
        safeLocalStorageSetItem("dente_doctor_shifts", JSON.stringify(shifts));
      } else {
        safeLocalStorageRemoveItem("dente_doctor_shifts");
      }

      const shiftsByDate = buildChairDoctorAssignmentsByDate(shifts);
      for (const [dateIso, dateAssignments] of Object.entries(shiftsByDate)) {
        safeLocalStorageSetItem(
          `dente_chair_doctor_assignments_${dateIso}`,
          JSON.stringify(dateAssignments),
        );
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("dente_chair_doctor_assignments_updated", {
            detail: { shifts },
          }),
        );
      }
    } catch (storageErr: unknown) {
      logger.warn(
        "[ScheduleView] Error saving dente_doctor_shifts to storage:",
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
        const res = await fetch("/api/schedule/shifts", {
          method: "POST",
          headers,
          body: JSON.stringify({ shifts }),
        });
        if (!res.ok) {
          logger.warn("[ScheduleView] Roster shift save failed with HTTP", res.status);
          showToast("Не удалось сохранить график смен врачей", "error");
        }
      }
    } catch (apiErr: unknown) {
      logger.warn("[ScheduleView] Error saving shifts to API:", apiErr);
      showToast("Ошибка сети при сохранении графика смен", "error");
    }
  }, [auth]);

  const rosterStaffList: RosterStaffMember[] = useMemo(() => {
    const rawStaff = (dashboard?.clinicSettings?.staff ?? []).filter(
      (s) => s.active !== false,
    );
    if (rawStaff.length === 0) return isDemoShowcaseMode() ? DEFAULT_CLINIC_STAFF : [];

    return rawStaff.map((s, index) => {
      const isDoctor =
        s.role === "doctor" ||
        s.role === "owner" ||
        (Array.isArray(s.specialties) &&
          s.specialties.length > 0 &&
          s.role !== "assistant");
      const isAssistant = s.role === "assistant";

      let role: MedicalStaffRole = "therapist";
      if (isAssistant) {
        role = "assistant";
      } else if (s.specialties?.includes("surgeon")) {
        role = "surgeon";
      } else if (s.specialties?.includes("orthopedist")) {
        role = "orthopedist";
      } else if (s.specialties?.includes("orthodontist")) {
        role = "orthodontist";
      } else if (s.specialties?.includes("pediatric")) {
        role = "pediatric";
      } else if (
        s.specialties?.includes("hygienist") ||
        (s.role as string) === "hygienist"
      ) {
        role = "hygienist";
      } else {
        role = isDoctor ? "therapist" : "assistant";
      }

      const cleanName = (s.fullName || "")
        .trim()
        .replace(/^(д-р|доктор|врач)\s+/i, "");
      const parts = cleanName.trim().split(/\s+/);
      const lastName = parts[0] || (isDoctor ? "Врач" : "Сотрудник");
      let shortName = lastName;
      if (parts.length > 1 && parts[1]?.includes(".")) {
        shortName = `${lastName} ${parts.slice(1).join(" ")}`.trim();
      } else {
        const initials = parts
          .slice(1)
          .map((p) => (p[0] ? `${p[0].toUpperCase()}.` : ""))
          .join("");
        shortName = `${lastName}${initials ? ` ${initials}` : ""}`;
      }
      if (isDoctor) {
        shortName = `Д-р ${shortName}`;
      }

      const extStaff = s as typeof s & {
        tabNumber?: string;
        preferredChairId?: string;
        defaultAssistantId?: string;
      };

      const tabNumber =
        extStaff.tabNumber ||
        String(101 + index).padStart(5, "0");

      return {
        id: s.id,
        fullName: s.fullName,
        shortName,
        role,
        tabNumber,
        isDoctor,
        isAssistant,
        preferredChairId: extStaff.preferredChairId,
        defaultAssistantId: extStaff.defaultAssistantId,
        weeklyHourLimit: isDoctor ? 33 : 39,
        avatarColor: s.color || (isDoctor ? "#0d9488" : "#64748b"),
      };
    });
  }, [dashboard?.clinicSettings?.staff]);

  const scheduleDoctors = useMemo(() => {
    return (dashboard?.clinicSettings?.staff ?? [])
      .filter(
        (s) =>
          s.active !== false &&
          (s.role === "doctor" ||
            s.role === "owner" ||
            (Array.isArray(s.specialties) &&
              s.specialties.length > 0 &&
              s.role !== "assistant")),
      )
      .map((s) => ({
        id: s.id,
        fullName: s.fullName,
        role: s.role,
        specialties: s.specialties,
        active: s.active !== false,
      }));
  }, [dashboard?.clinicSettings?.staff]);

  const rosterCabinets: RosterCabinetDefinition[] = useMemo(() => {
    const rawChairs = (dashboard?.clinicSettings?.chairs ?? []).filter(
      (c) => c.active !== false,
    );
    if (rawChairs.length === 0) return isDemoShowcaseMode() ? CLINIC_CABINETS_CATALOG : [];

    const roomMap = new Map<string, typeof rawChairs>();
    rawChairs.forEach((chair, idx) => {
      const roomKey = chair.room?.trim() || `Кабинет ${idx + 1}`;
      const existing = roomMap.get(roomKey);
      if (existing) {
        existing.push(chair);
      } else {
        roomMap.set(roomKey, [chair]);
      }
    });

    let cabNum = 1;
    const result: RosterCabinetDefinition[] = [];
    for (const [roomName, chairsInRoom] of roomMap.entries()) {
      const primarySpec = chairsInRoom[0]?.specialization;
      const specialtyLabel =
        primarySpec === "surgeon"
          ? "Хирургия"
          : primarySpec === "orthopedist"
            ? "Ортопедия"
            : primarySpec === "orthodontist"
              ? "Ортодонтия"
              : primarySpec === "pediatric"
                ? "Детство"
                : primarySpec === "hygienist"
                  ? "Гигиена"
                  : "Терапия";

      result.push({
        id: `cab-${cabNum}`,
        number: cabNum,
        name: roomName.startsWith("Кабинет") ? roomName : `Кабинет ${roomName}`,
        specialty: specialtyLabel,
        chairs: chairsInRoom.map((ch) => {
          const equipmentParts = [
            ch.hasMicroscope ? "Микроскоп" : "",
            ch.hasSurgeryKit ? "Хирургический набор" : "",
            ch.hasXraySensor ? "Визиограф" : "",
            ch.notes || "",
          ].filter(Boolean);
          const equipment =
            equipmentParts.length > 0
              ? equipmentParts.join(", ")
              : "Стоматологическая установка";

          return {
            id: ch.id,
            name: ch.name,
            equipment,
          };
        }),
      });
      cabNum++;
    }
    return result;
  }, [dashboard?.clinicSettings?.chairs]);

  const rosterAppointments = useMemo(() => {
    return (dashboard?.appointments ?? sortedAppointments ?? []).map((app) => ({
      chairId: app.chairId,
      startsAt: app.startsAt,
      endsAt: app.endsAt,
      status: app.status,
    }));
  }, [dashboard?.appointments, sortedAppointments]);

  return {
    savedDoctorShifts,
    setSavedDoctorShifts,
    handleSaveDoctorShifts,
    rosterStaffList,
    scheduleDoctors,
    rosterCabinets,
    rosterAppointments,
  };
}
