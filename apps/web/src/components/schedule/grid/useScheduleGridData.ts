import { useMemo } from "react";
import {
  type Appointment,
  type Dashboard,
  type EmergencyReserveSlot,
  type DoctorShiftSchedule,
  calculateEmergencyReserveSlots,
} from "@dental/shared";
import { DEFAULT_SOLO_CHAIR } from "./gridConstants";
import { calculateDailyChairDoctorTally } from "../doctorFreeSlotsEngine";
import type { ChairMaintenanceBlock } from "../../../utils/scheduleCollisionUtils";

export interface UseScheduleGridDataProps {
  appointments: Appointment[];
  dateKey: string;
  toDateTimeLocalValue: (iso: string, timezone?: string | null) => string;
  timezone: string;
  timeSlots: string[];
  effectiveChairs: Array<any>;
  gridStep: 15 | 30 | 60;
  effectiveMaintenanceBlocks: ChairMaintenanceBlock[];
  selectedDoctorId?: string | null | undefined;
  doctors: Array<any>;
  dashboard: Dashboard;
}

export function useScheduleGridData({
  appointments = [],
  dateKey,
  toDateTimeLocalValue,
  timezone,
  timeSlots,
  effectiveChairs,
  gridStep,
  effectiveMaintenanceBlocks,
  selectedDoctorId,
  doctors,
  dashboard,
}: UseScheduleGridDataProps) {
  // Group appointments by chair and day
  const dayAppointments = useMemo(() => {
    const safeAppts = appointments || [];
    return safeAppts.filter((a) => {
      const localDate = toDateTimeLocalValue
        ? toDateTimeLocalValue(a.startsAt, timezone).slice(0, 10)
        : a.startsAt.slice(0, 10);
      return localDate === dateKey;
    });
  }, [appointments, dateKey, toDateTimeLocalValue, timezone]);

  // Low-Spec Laptop Optimization: Precalculate slot minutes for dayAppointments
  // to eliminate 16,000+ date parsing calls in the nested timeSlots.map x effectiveChairs.map loop
  const parsedDayAppointments = useMemo(() => {
    return dayAppointments.map((a) => {
      const startStr = toDateTimeLocalValue
        ? toDateTimeLocalValue(a.startsAt, timezone).slice(11, 16)
        : a.startsAt.slice(11, 16);
      const [sH, sM] = startStr.split(":").map(Number);
      const startMin = (sH ?? 0) * 60 + (sM ?? 0);

      const endStr = a.endsAt
        ? toDateTimeLocalValue
          ? toDateTimeLocalValue(a.endsAt, timezone).slice(11, 16)
          : a.endsAt.slice(11, 16)
        : startStr;
      const [eH, eM] = endStr.split(":").map(Number);
      const endMin = (eH ?? 0) * 60 + (eM ?? 0);

      return {
        appointment: a,
        chairId: a.chairId,
        startMin,
        endMin,
      };
    });
  }, [dayAppointments, toDateTimeLocalValue, timezone]);

  // Precalculate maintenance block minutes for dateKey
  const parsedDayMaintenanceBlocks = useMemo(() => {
    const safeBlocks = effectiveMaintenanceBlocks || [];
    return safeBlocks
      .filter((m) => {
        const mDate = m.startsAt
          ? toDateTimeLocalValue
            ? toDateTimeLocalValue(m.startsAt, timezone).slice(0, 10)
            : m.startsAt.slice(0, 10)
          : dateKey;
        return mDate === dateKey;
      })
      .map((m) => {
        const mTime = m.startsAt
          ? toDateTimeLocalValue
            ? toDateTimeLocalValue(m.startsAt, timezone).slice(11, 16)
            : m.startsAt.slice(11, 16)
          : "13:00";
        const [mH, mM] = mTime.split(":").map(Number);
        const startMin = (mH ?? 0) * 60 + (mM ?? 0);
        return {
          block: m,
          chairId: m.chairId,
          startMin,
        };
      });
  }, [effectiveMaintenanceBlocks, dateKey, toDateTimeLocalValue, timezone]);

  // Low-Spec Celeron & HDD 5400 RPM Optimization:
  // O(1) Slot Lookup Maps by `${chairId}_${slotStartMin}` and `${doctorId}_${timeSlot}`.
  // Populated in a single pass without any .filter() allocations in render loops.
  const { chairSlotCellMap, doctorSlotMap } = useMemo(() => {
    const chairMap = new Map<
      string,
      {
        cellAppointments: Appointment[];
        continuingAppointments: Appointment[];
        cellMaintenance: NonNullable<
          typeof effectiveMaintenanceBlocks
        >[number][];
      }
    >();

    const docMap = new Map<string, Appointment[]>();

    // Pre-populate empty slot containers for O(1) direct access
    for (const hour of timeSlots) {
      const [sH, sM] = hour.split(":").map(Number);
      const slotStartMin = (sH ?? 0) * 60 + (sM ?? 0);

      for (const chair of effectiveChairs) {
        chairMap.set(`${chair.id}_${slotStartMin}`, {
          cellAppointments: [],
          continuingAppointments: [],
          cellMaintenance: [],
        });
      }
    }

    // Single pass over parsedDayAppointments (Zero .filter() GC pressure)
    for (const p of parsedDayAppointments) {
      const a = p.appointment;
      const docId = a.doctorUserId || "unassigned";

      for (const hour of timeSlots) {
        const [sH, sM] = hour.split(":").map(Number);
        const slotStartMin = (sH ?? 0) * 60 + (sM ?? 0);
        const slotEndMin = slotStartMin + gridStep;

        if (p.startMin >= slotStartMin && p.startMin < slotEndMin) {
          // Starts in this slot
          for (const chair of effectiveChairs) {
            const isSolo = chair.id === DEFAULT_SOLO_CHAIR.id;
            if (isSolo || p.chairId === chair.id) {
              const cell = chairMap.get(`${chair.id}_${slotStartMin}`);
              if (cell) cell.cellAppointments.push(a);
            }
          }
          // Index by ${doctorId}_${timeSlot} for O(1) lookup
          const docKey = `${docId}_${hour}`;
          let docList = docMap.get(docKey);
          if (!docList) {
            docList = [];
            docMap.set(docKey, docList);
          }
          docList.push(a);
        } else if (p.startMin < slotStartMin && p.endMin > slotStartMin) {
          // Continues through this slot
          for (const chair of effectiveChairs) {
            const isSolo = chair.id === DEFAULT_SOLO_CHAIR.id;
            if (isSolo || p.chairId === chair.id) {
              const cell = chairMap.get(`${chair.id}_${slotStartMin}`);
              if (cell) cell.continuingAppointments.push(a);
            }
          }
        }
      }
    }

    // Single pass over parsedDayMaintenanceBlocks (Zero .filter() GC pressure)
    for (const m of parsedDayMaintenanceBlocks) {
      for (const hour of timeSlots) {
        const [sH, sM] = hour.split(":").map(Number);
        const slotStartMin = (sH ?? 0) * 60 + (sM ?? 0);
        const slotEndMin = slotStartMin + gridStep;

        if (m.startMin >= slotStartMin && m.startMin < slotEndMin) {
          const cell = chairMap.get(`${m.chairId}_${slotStartMin}`);
          if (cell) cell.cellMaintenance.push(m.block);
        }
      }
    }

    return { chairSlotCellMap: chairMap, doctorSlotMap: docMap };
  }, [
    timeSlots,
    effectiveChairs,
    parsedDayAppointments,
    parsedDayMaintenanceBlocks,
    gridStep,
  ]);

  // Calculate dedicated 30-min emergency reserve buffers per doctor shift
  const emergencyReserveSlots = useMemo(() => {
    const targetDocs = selectedDoctorId
      ? doctors.filter((d) => d.id === selectedDoctorId)
      : doctors;

    const mappedEmergencyAppts = dayAppointments.map((a) => ({
      id: a.id,
      clinicId:
        dashboard?.clinicSettings?.profile?.organizationId || "clinic-1",
      doctorId: a.doctorUserId || "doc-1",
      cabinetId: a.chairId || "chair-1",
      patientId: a.patientId || "pat-1",
      startTime: a.startsAt,
      endTime: a.endsAt,
      status: (a.status === "cancelled" ? "cancelled" : "scheduled") as
        "cancelled" | "scheduled",
      isEmergency: Boolean((a as any)?.isCito || (a as any)?.isEmergency),
    }));

    const slots: EmergencyReserveSlot[] = [];
    for (const doc of targetDocs) {
      const shift: DoctorShiftSchedule = {
        id: `shift-${doc.id}-${dateKey}`,
        clinicId:
          dashboard?.clinicSettings?.profile?.organizationId || "clinic-1",
        doctorId: doc.id,
        doctorFullName: doc.fullName,
        shiftDate: dateKey,
        startTime: `${dateKey}T08:00:00.000Z`,
        endTime: `${dateKey}T20:00:00.000Z`,
        isEmergencyReserveEnabled: true,
        emergencyReserveMinutes: 30,
      };
      const res = calculateEmergencyReserveSlots(shift, mappedEmergencyAppts);
      slots.push(...res);
    }
    return slots;
  }, [
    dashboard?.clinicSettings?.profile,
    selectedDoctorId,
    doctors,
    dateKey,
    dayAppointments,
  ]);

  // Calculate cross-chair and intra-chair collisions on the active date
  const collisionMap = useMemo(() => {
    const collisions = new Map<
      string,
      {
        sameDoctor: boolean;
        sameChair: boolean;
        sameAssistant: boolean;
        samePatient: boolean;
        conflictWith: string;
      }
    >();
    const occupyingAppointments = dayAppointments
      .filter((a) => a.status !== "cancelled" && a.status !== "no_show")
      .map((a) => ({
        appt: a,
        sMs: Date.parse(a.startsAt),
        eMs: Date.parse(a.endsAt),
      }));

    for (let i = 0; i < occupyingAppointments.length; i++) {
      const item1 = occupyingAppointments[i]!;
      const a1 = item1.appt;
      const s1 = item1.sMs;
      const e1 = item1.eMs;
      if (!Number.isFinite(s1) || !Number.isFinite(e1)) continue;

      for (let j = i + 1; j < occupyingAppointments.length; j++) {
        const item2 = occupyingAppointments[j]!;
        const a2 = item2.appt;
        const s2 = item2.sMs;
        const e2 = item2.eMs;
        if (!Number.isFinite(s2) || !Number.isFinite(e2)) continue;

        const overlapMs = Math.min(e1, e2) - Math.max(s1, s2);
        if (overlapMs > 0) {
          const sameDoctor = Boolean(
            a1.doctorUserId && a1.doctorUserId === a2.doctorUserId,
          );
          const sameChair = Boolean(a1.chairId && a1.chairId === a2.chairId);
          const sameAssistant = Boolean(
            a1.assistantUserId && a1.assistantUserId === a2.assistantUserId,
          );
          const samePatient = Boolean(
            a1.patientId && a1.patientId === a2.patientId,
          );

          if (sameDoctor || sameChair || sameAssistant || samePatient) {
            const prev1 = collisions.get(a1.id);
            collisions.set(a1.id, {
              sameDoctor: Boolean(prev1?.sameDoctor || sameDoctor),
              sameChair: Boolean(prev1?.sameChair || sameChair),
              sameAssistant: Boolean(prev1?.sameAssistant || sameAssistant),
              samePatient: Boolean(prev1?.samePatient || samePatient),
              conflictWith: a2.id,
            });
            const prev2 = collisions.get(a2.id);
            collisions.set(a2.id, {
              sameDoctor: Boolean(prev2?.sameDoctor || sameDoctor),
              sameChair: Boolean(prev2?.sameChair || sameChair),
              sameAssistant: Boolean(prev2?.sameAssistant || sameAssistant),
              samePatient: Boolean(prev2?.samePatient || samePatient),
              conflictWith: a1.id,
            });
          }
        }
      }
    }
    return collisions;
  }, [dayAppointments]);

  const patientLookupMap = useMemo(() => {
    const map = new Map<string, Dashboard["patients"][number]>();
    for (const p of dashboard?.patients ?? []) {
      if (p.id) map.set(p.id, p);
    }
    return map;
  }, [dashboard?.patients]);

  const staffLookupMap = useMemo(() => {
    const map = new Map<
      string,
      NonNullable<Dashboard["clinicSettings"]>["staff"][number]
    >();
    for (const s of dashboard?.clinicSettings?.staff ?? []) {
      if (s.id) map.set(s.id, s);
    }
    return map;
  }, [dashboard?.clinicSettings?.staff]);

  const dailyTally = useMemo(() => {
    return calculateDailyChairDoctorTally({
      dateKey,
      appointments,
      chairs: (dashboard?.clinicSettings?.chairs &&
      dashboard.clinicSettings.chairs.length > 0
        ? dashboard.clinicSettings.chairs
        : effectiveChairs) as any,
      doctors: ((dashboard?.clinicSettings as any)?.staff ?? []) as any[],
    });
  }, [
    dateKey,
    appointments,
    dashboard?.clinicSettings?.chairs,
    effectiveChairs,
    (dashboard?.clinicSettings as any)?.staff,
  ]);

  return {
    dayAppointments,
    parsedDayAppointments,
    parsedDayMaintenanceBlocks,
    chairSlotCellMap,
    doctorSlotMap,
    emergencyReserveSlots,
    collisionMap,
    patientLookupMap,
    staffLookupMap,
    dailyTally,
  };
}
