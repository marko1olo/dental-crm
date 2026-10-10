/**
 * DENTE Dental CRM — Schedule Quantum Time Engine & O(1) Collision Index
 *
 * Low-End GPU & Celeron Optimization Mandate:
 * 1. Smart 15-Minute Slot Snapping: mathematical quantization of time without DOM coordinates.
 * 2. O(1) Collision & Availability Index: instant hash-map lookups over 15-min slot quanta
 *    without iterating through 50+ appointments or triggering synchronous layout reflows.
 * 3. Fast Slot Alternative Finder: O(1) window checking for immediate suggestions.
 */

import type { Appointment } from "@dental/shared";
import type { ChairMaintenanceBlock } from "../../../utils/scheduleCollisionUtils";

export const QUANTUM_MINUTES = 15;
export const CLINIC_DAY_START_MINUTES = 8 * 60; // 08:00 = 480
export const CLINIC_DAY_END_MINUTES = 21 * 60; // 21:00 = 1260

/**
 * Parses time string (e.g. "09:30", "09:30:00", "9:15") or ISO timestamp into minutes from midnight (0..1440).
 */
export function parseTimeToMinutes(timeStr: string | null | undefined): number {
  if (!timeStr) return CLINIC_DAY_START_MINUTES;

  // If ISO string like 2026-08-25T09:30:00.000Z
  if (timeStr.includes("T")) {
    const timePart = timeStr.slice(11, 16);
    const [h, m] = timePart.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  }

  const parts = timeStr.trim().split(":").map(Number);
  const h = parts[0] ?? 8;
  const m = parts[1] ?? 0;
  return h * 60 + m;
}

/**
 * Formats minutes from midnight (e.g. 570) to 24h slot string ("09:30").
 */
export function formatMinutesToTime(minutes: number): string {
  const safeMinutes = Math.max(0, Math.min(1439, Math.round(minutes)));
  const h = Math.floor(safeMinutes / 60);
  const m = safeMinutes % 60;
  const hh = h < 10 ? `0${h}` : `${h}`;
  const mm = m < 10 ? `0${m}` : `${m}`;
  return `${hh}:${mm}`;
}

/**
 * Quantizes arbitrary minutes to the nearest 15-minute slot boundary.
 * Clamps within clinic operating hours [08:00, 20:45].
 */
export function snapMinutesTo15Min(minutes: number): number {
  const rounded = Math.round(minutes / QUANTUM_MINUTES) * QUANTUM_MINUTES;
  return Math.max(
    CLINIC_DAY_START_MINUTES,
    Math.min(CLINIC_DAY_END_MINUTES - QUANTUM_MINUTES, rounded),
  );
}

/**
 * Converts any arbitrary time string ("09:37", "11:22", "14:05") into quantized 15-min slot ("09:30", "11:15", "14:00").
 */
export function snapSlotHourTo15Min(hourStr: string): string {
  const mins = parseTimeToMinutes(hourStr);
  return formatMinutesToTime(snapMinutesTo15Min(mins));
}

export interface QuantumCollisionResult {
  hasCollision: boolean;
  conflictType: "chair" | "doctor" | "patient" | "chair_maintenance" | null;
  conflictingEntity: Appointment | ChairMaintenanceBlock | null;
  message: string | null;
  isCitoOverbooking?: boolean;
}

export interface QuantumSlotAlternative {
  timeDisplay: string;
  label?: string;
  startsAt: string;
  endsAt: string;
}

function isMaintenanceBlock(entity: any): entity is ChairMaintenanceBlock {
  return (
    Boolean(entity) &&
    !("status" in entity) &&
    "reason" in entity &&
    !("patientId" in entity)
  );
}

/**
 * Fast O(1) Collision Index for a given day's schedule.
 * Pre-populates 15-min slot buckets in a single pass over day's appointments and maintenance blocks.
 */
export class ScheduleQuantumCollisionIndex {
  // Map<chairId, Map<quantumMinute, Appointment | ChairMaintenanceBlock>>
  private readonly chairOccupancy = new Map<
    string,
    Map<number, Appointment | ChairMaintenanceBlock>
  >();

  // Map<doctorUserId, Map<quantumMinute, Appointment>>
  private readonly doctorOccupancy = new Map<string, Map<number, Appointment>>();

  // Map<patientId, Map<quantumMinute, Appointment>>
  private readonly patientOccupancy = new Map<string, Map<number, Appointment>>();

  // Set of inactive chair IDs
  private readonly inactiveChairIds = new Set<string>();

  public readonly dateKey: string;
  public readonly timezone: string;

  constructor(options: {
    dateKey: string;
    appointments?: readonly Appointment[] | null | undefined;
    chairMaintenanceBlocks?: readonly ChairMaintenanceBlock[] | null | undefined;
    chairs?: ReadonlyArray<{ id: string; name?: string; active?: boolean }> | null | undefined;
    timezone?: string | undefined;
    toDateTimeLocalValue?: ((iso: string, tz?: string | null) => string) | undefined;
  }) {
    this.dateKey = options.dateKey;
    this.timezone = options.timezone ?? "Europe/Moscow";

    const toLocal =
      options.toDateTimeLocalValue ??
      ((iso: string) => (iso ? iso.slice(0, 16) : ""));

    // 1. Record inactive chairs
    if (options.chairs) {
      for (const c of options.chairs) {
        if (c.active === false) {
          this.inactiveChairIds.add(c.id);
        }
      }
    }

    // 2. Index scheduled chair maintenance blocks
    if (options.chairMaintenanceBlocks) {
      for (const block of options.chairMaintenanceBlocks) {
        if (!block.startsAt || !block.endsAt) continue;
        const blockDate = toLocal(block.startsAt, this.timezone).slice(0, 10);
        if (blockDate !== this.dateKey) continue;

        const startMin = parseTimeToMinutes(
          toLocal(block.startsAt, this.timezone).slice(11, 16),
        );
        const endMin = parseTimeToMinutes(
          toLocal(block.endsAt, this.timezone).slice(11, 16),
        );

        let chairMap = this.chairOccupancy.get(block.chairId);
        if (!chairMap) {
          chairMap = new Map();
          this.chairOccupancy.set(block.chairId, chairMap);
        }

        const snappedStart = snapMinutesTo15Min(startMin);
        const snappedEnd = Math.max(snappedStart + QUANTUM_MINUTES, snapMinutesTo15Min(endMin));

        for (let q = snappedStart; q < snappedEnd; q += QUANTUM_MINUTES) {
          chairMap.set(q, block);
        }
      }
    }

    // 3. Index appointments
    if (options.appointments) {
      for (const appt of options.appointments) {
        if (appt.status === "cancelled" || appt.status === "no_show") continue;
        if (!appt.startsAt) continue;

        const apptDate = toLocal(appt.startsAt, this.timezone).slice(0, 10);
        if (apptDate !== this.dateKey) continue;

        const startMin = parseTimeToMinutes(
          toLocal(appt.startsAt, this.timezone).slice(11, 16),
        );
        const rawDur =
          Number((appt as any).durationMinutes) ||
          Math.round(
            (Date.parse(appt.endsAt) - Date.parse(appt.startsAt)) / 60000,
          ) ||
          30;
        const endMin = startMin + Math.max(15, rawDur);

        const snappedStart = snapMinutesTo15Min(startMin);
        const snappedEnd = Math.max(snappedStart + QUANTUM_MINUTES, snapMinutesTo15Min(endMin));

        // Chair bucket
        if (appt.chairId) {
          let cMap = this.chairOccupancy.get(appt.chairId);
          if (!cMap) {
            cMap = new Map();
            this.chairOccupancy.set(appt.chairId, cMap);
          }
          for (let q = snappedStart; q < snappedEnd; q += QUANTUM_MINUTES) {
            cMap.set(q, appt);
          }
        }

        // Doctor bucket
        if (appt.doctorUserId) {
          let dMap = this.doctorOccupancy.get(appt.doctorUserId);
          if (!dMap) {
            dMap = new Map();
            this.doctorOccupancy.set(appt.doctorUserId, dMap);
          }
          for (let q = snappedStart; q < snappedEnd; q += QUANTUM_MINUTES) {
            dMap.set(q, appt);
          }
        }

        // Patient bucket
        if (appt.patientId) {
          let pMap = this.patientOccupancy.get(appt.patientId);
          if (!pMap) {
            pMap = new Map();
            this.patientOccupancy.set(appt.patientId, pMap);
          }
          for (let q = snappedStart; q < snappedEnd; q += QUANTUM_MINUTES) {
            pMap.set(q, appt);
          }
        }
      }
    }
  }

  /**
   * O(1) Collision Check.
   * Checks strictly the quanta [startMin, endMin) for chair, doctor, and patient availability.
   */
  public checkCollision(params: {
    chairId?: string | null | undefined;
    doctorUserId?: string | null | undefined;
    patientId?: string | null | undefined;
    slotHour?: string | undefined;
    startsAt?: string | null | undefined;
    endsAt?: string | null | undefined;
    durationMinutes?: number | undefined;
    excludeAppointmentId?: string | null | undefined;
    isCito?: boolean | undefined;
    allowCitoOverbooking?: boolean | undefined;
    doctorName?: string | undefined;
    chairName?: string | undefined;
    patientName?: string | undefined;
  }): QuantumCollisionResult {
    const {
      chairId,
      doctorUserId,
      patientId,
      slotHour,
      startsAt,
      endsAt,
      durationMinutes,
      excludeAppointmentId,
      isCito = false,
      allowCitoOverbooking = false,
      doctorName = "Врач",
      chairName = "Кресло",
      patientName = "Пациент",
    } = params;

    // 1. Inactive chair check
    if (chairId && this.inactiveChairIds.has(chairId)) {
      return {
        hasCollision: true,
        conflictType: "chair",
        conflictingEntity: null,
        message: `Кресло «${chairName}» заблокировано (отключено в настройках).`,
      };
    }

    // Resolve slotHour from startsAt if omitted
    const effectiveSlotHour =
      slotHour ?? (startsAt ? startsAt.slice(11, 16) : "08:00");
    const startMin = snapMinutesTo15Min(parseTimeToMinutes(effectiveSlotHour));

    let effectiveDuration = durationMinutes;
    if (!effectiveDuration && startsAt && endsAt) {
      const diffMs = Date.parse(endsAt) - Date.parse(startsAt);
      if (Number.isFinite(diffMs) && diffMs > 0) {
        effectiveDuration = Math.round(diffMs / 60000);
      }
    }
    const finalDuration = Math.max(
      15,
      Math.round((effectiveDuration || 30) / QUANTUM_MINUTES) * QUANTUM_MINUTES,
    );
    const endMin = startMin + finalDuration;

    // Check quanta in O(1)
    for (let q = startMin; q < endMin; q += QUANTUM_MINUTES) {
      // A. Chair check
      if (chairId) {
        const chairEntity = this.chairOccupancy.get(chairId)?.get(q);
        if (chairEntity && (!excludeAppointmentId || chairEntity.id !== excludeAppointmentId)) {
          // Maintenance block?
          if (isMaintenanceBlock(chairEntity)) {
            const m = chairEntity;
            const rLabel =
              m.note ||
              (m.reason === "sanitation"
                ? "санитарную обработку"
                : m.reason === "maintenance"
                  ? "техобслуживание"
                  : "технический перерыв");
            return {
              hasCollision: true,
              conflictType: "chair_maintenance",
              conflictingEntity: m,
              message: `Кресло «${chairName}» заблокировано: ${rLabel} (Технический перерыв).`,
            };
          }

          // Occupied by appointment
          if (isCito || allowCitoOverbooking) {
            return {
              hasCollision: true,
              isCitoOverbooking: true,
              conflictType: "chair",
              conflictingEntity: chairEntity,
              message: `Острая боль (CITO): наложение на кресле «${chairName}» допустимо`,
            };
          }

          const chairTitle = chairName && chairName !== "Кресло" ? `Кресло «${chairName}»` : "Кресло";
          return {
            hasCollision: true,
            conflictType: "chair",
            conflictingEntity: chairEntity,
            message: `${chairTitle} уже занято в ${formatMinutesToTime(q)}.`,
          };
        }
      }

      // B. Doctor check
      if (doctorUserId) {
        const docAppt = this.doctorOccupancy.get(doctorUserId)?.get(q);
        if (docAppt && (!excludeAppointmentId || docAppt.id !== excludeAppointmentId)) {
          if (isCito || allowCitoOverbooking) {
            return {
              hasCollision: true,
              isCitoOverbooking: true,
              conflictType: "doctor",
              conflictingEntity: docAppt,
              message: `Острая боль (CITO): наложение приёма врача ${doctorName} допустимо`,
            };
          }
          const docTitle = doctorName && doctorName !== "Врач" ? `Врач ${doctorName}` : "Врач";
          return {
            hasCollision: true,
            conflictType: "doctor",
            conflictingEntity: docAppt,
            message: `${docTitle} уже ведет прием (занят) в ${formatMinutesToTime(q)}.`,
          };
        }
      }

      // C. Patient check
      if (patientId) {
        const patAppt = this.patientOccupancy.get(patientId)?.get(q);
        if (patAppt && (!excludeAppointmentId || patAppt.id !== excludeAppointmentId)) {
          const patTitle = patientName && patientName !== "Пациент" ? `Пациент ${patientName}` : "Пациент";
          return {
            hasCollision: true,
            conflictType: "patient",
            conflictingEntity: patAppt,
            message: `${patTitle} уже записан(а) на прием в ${formatMinutesToTime(q)}.`,
          };
        }
      }
    }

    return {
      hasCollision: false,
      conflictType: null,
      conflictingEntity: null,
      message: null,
    };
  }

  /**
   * Fast O(1) Check: Is the chair free for the duration?
   */
  public isChairFree(
    chairId: string,
    slotHour: string,
    durationMinutes = 30,
    excludeApptId?: string,
  ): boolean {
    const res = this.checkCollision({
      chairId,
      slotHour,
      durationMinutes,
      excludeAppointmentId: excludeApptId ?? null,
    });
    return !res.hasCollision;
  }

  /**
   * Fast O(1) Check: Is the doctor free for the duration?
   */
  public isDoctorFree(
    doctorUserId: string,
    slotHour: string,
    durationMinutes = 30,
    excludeApptId?: string,
  ): boolean {
    const res = this.checkCollision({
      doctorUserId,
      slotHour,
      durationMinutes,
      excludeAppointmentId: excludeApptId ?? null,
    });
    return !res.hasCollision;
  }

  /**
   * Finds the nearest free 15-min window on the same day by scanning forward in 15-min quanta.
   */
  public findNearestFreeWindow(params: {
    chairId?: string | null | undefined;
    doctorUserId?: string | null | undefined;
    patientId?: string | null | undefined;
    startingHour: string;
    durationMinutes: number;
    excludeAppointmentId?: string | null | undefined;
  }): QuantumSlotAlternative | null {
    const { startingHour, durationMinutes, chairId, doctorUserId, patientId, excludeAppointmentId } = params;
    const startMin = snapMinutesTo15Min(parseTimeToMinutes(startingHour));

    for (let candidateMin = startMin; candidateMin + durationMinutes <= CLINIC_DAY_END_MINUTES; candidateMin += QUANTUM_MINUTES) {
      const candHour = formatMinutesToTime(candidateMin);
      const res = this.checkCollision({
        chairId,
        doctorUserId,
        patientId,
        slotHour: candHour,
        durationMinutes,
        excludeAppointmentId: excludeAppointmentId ?? null,
      });

      if (!res.hasCollision) {
        const startIso = `${this.dateKey}T${candHour}:00.000Z`;
        const endHour = formatMinutesToTime(candidateMin + durationMinutes);
        const endIso = `${this.dateKey}T${endHour}:00.000Z`;
        return {
          timeDisplay: candHour,
          label: `${candHour} – ${endHour}`,
          startsAt: startIso,
          endsAt: endIso,
        };
      }
    }

    return null;
  }

  /**
   * Alias for findNearestFreeWindow with flexible parameter names.
   */
  public findNextFreeSlot(params: {
    chairId?: string | null | undefined;
    doctorUserId?: string | null | undefined;
    patientId?: string | null | undefined;
    preferredStartHour?: string | undefined;
    durationMinutes?: number | undefined;
    excludeAppointmentId?: string | null | undefined;
  }): QuantumSlotAlternative | null {
    return this.findNearestFreeWindow({
      chairId: params.chairId,
      doctorUserId: params.doctorUserId,
      patientId: params.patientId,
      startingHour: params.preferredStartHour || "08:00",
      durationMinutes: params.durationMinutes || 30,
      excludeAppointmentId: params.excludeAppointmentId,
    });
  }
}
