import type { Appointment } from "@dental/shared";
import type { ChairMaintenanceBlock } from "../../../utils/scheduleCollisionUtils";
import { QUANTUM_MINUTES, parseTimeToMinutes, snapMinutesTo15Min } from "./quantumTimeUtils";

export interface QuantumIndexBuckets {
  chairOccupancy: Map<string, Map<number, Appointment | ChairMaintenanceBlock>>;
  doctorOccupancy: Map<string, Map<number, Appointment>>;
  patientOccupancy: Map<string, Map<number, Appointment>>;
  inactiveChairIds: Set<string>;
}

export function buildQuantumBuckets(
  dateKey: string,
  timezone: string,
  options: {
    appointments?: readonly Appointment[] | null;
    chairMaintenanceBlocks?: readonly ChairMaintenanceBlock[] | null;
    chairs?: ReadonlyArray<{ id: string; name?: string; active?: boolean }> | null;
    toDateTimeLocalValue?: (iso: string, tz?: string | null) => string;
  },
): QuantumIndexBuckets {
  const chairOccupancy = new Map<string, Map<number, Appointment | ChairMaintenanceBlock>>();
  const doctorOccupancy = new Map<string, Map<number, Appointment>>();
  const patientOccupancy = new Map<string, Map<number, Appointment>>();
  const inactiveChairIds = new Set<string>();

  const toLocal = options.toDateTimeLocalValue ?? ((iso: string) => (iso ? iso.slice(0, 16) : ""));

  if (options.chairs) {
    for (const c of options.chairs) if (c.active === false) inactiveChairIds.add(c.id);
  }

  if (options.chairMaintenanceBlocks) {
    for (const block of options.chairMaintenanceBlocks) {
      if (!block.startsAt || !block.endsAt) continue;
      if (toLocal(block.startsAt, timezone).slice(0, 10) !== dateKey) continue;
      const startMin = parseTimeToMinutes(toLocal(block.startsAt, timezone).slice(11, 16));
      const endMin = parseTimeToMinutes(toLocal(block.endsAt, timezone).slice(11, 16));
      let cMap = chairOccupancy.get(block.chairId);
      if (!cMap) { cMap = new Map(); chairOccupancy.set(block.chairId, cMap); }
      const sStart = snapMinutesTo15Min(startMin);
      const sEnd = Math.max(sStart + QUANTUM_MINUTES, snapMinutesTo15Min(endMin));
      for (let q = sStart; q < sEnd; q += QUANTUM_MINUTES) cMap.set(q, block);
    }
  }

  if (options.appointments) {
    for (const appt of options.appointments) {
      if (appt.status === "cancelled" || appt.status === "no_show" || !appt.startsAt) continue;
      if (toLocal(appt.startsAt, timezone).slice(0, 10) !== dateKey) continue;
      const startMin = parseTimeToMinutes(toLocal(appt.startsAt, timezone).slice(11, 16));
      const rawDur = Number((appt as any).durationMinutes) || Math.round((Date.parse(appt.endsAt) - Date.parse(appt.startsAt)) / 60000) || 30;
      const sStart = snapMinutesTo15Min(startMin);
      const sEnd = Math.max(sStart + QUANTUM_MINUTES, snapMinutesTo15Min(startMin + Math.max(15, rawDur)));

      if (appt.chairId) {
        let m = chairOccupancy.get(appt.chairId);
        if (!m) { m = new Map(); chairOccupancy.set(appt.chairId, m); }
        for (let q = sStart; q < sEnd; q += QUANTUM_MINUTES) m.set(q, appt);
      }
      if (appt.doctorUserId) {
        let m = doctorOccupancy.get(appt.doctorUserId);
        if (!m) { m = new Map(); doctorOccupancy.set(appt.doctorUserId, m); }
        for (let q = sStart; q < sEnd; q += QUANTUM_MINUTES) m.set(q, appt);
      }
      if (appt.patientId) {
        let m = patientOccupancy.get(appt.patientId);
        if (!m) { m = new Map(); patientOccupancy.set(appt.patientId, m); }
        for (let q = sStart; q < sEnd; q += QUANTUM_MINUTES) m.set(q, appt);
      }
    }
  }

  return { chairOccupancy, doctorOccupancy, patientOccupancy, inactiveChairIds };
}
