import type { Appointment } from "@dental/shared";
import type { ChairMaintenanceBlock } from "../../../utils/scheduleCollisionUtils";
import {
  QUANTUM_MINUTES,
  CLINIC_DAY_START_MINUTES,
  CLINIC_DAY_END_MINUTES,
  parseTimeToMinutes,
  formatMinutesToTime,
  snapMinutesTo15Min,
  snapSlotHourTo15Min,
} from "./quantumTimeUtils";
import {
  type QuantumCollisionResult,
  type QuantumSlotAlternative,
  type QuantumCollisionParams,
  isMaintenanceBlock,
} from "./quantumEngineTypes";
import { buildQuantumBuckets } from "./quantumIndexBuilder";
import { checkQuantumQuanta } from "./quantumCollisionChecker";
import { safeBuildSlotIso } from "./gridSlotMath";

export {
  QUANTUM_MINUTES,
  CLINIC_DAY_START_MINUTES,
  CLINIC_DAY_END_MINUTES,
  parseTimeToMinutes,
  formatMinutesToTime,
  snapMinutesTo15Min,
  snapSlotHourTo15Min,
  type QuantumCollisionResult,
  type QuantumSlotAlternative,
  type QuantumCollisionParams,
  isMaintenanceBlock,
};

export function findQuantumFreeWindow(
  dateKey: string,
  checkFn: (hour: string) => QuantumCollisionResult,
  startingHour: string,
  durationMinutes: number,
  timezone = "Europe/Moscow",
): QuantumSlotAlternative | null {
  const startMin = snapMinutesTo15Min(parseTimeToMinutes(startingHour));

  for (
    let candidateMin = startMin;
    candidateMin + durationMinutes <= CLINIC_DAY_END_MINUTES;
    candidateMin += QUANTUM_MINUTES
  ) {
    const candHour = formatMinutesToTime(candidateMin);
    const res = checkFn(candHour);

    if (!res.hasCollision) {
      const endHour = formatMinutesToTime(candidateMin + durationMinutes);
      const { startIso, endIso } = safeBuildSlotIso(
        dateKey,
        candHour,
        durationMinutes,
        timezone,
      );
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

export class ScheduleQuantumCollisionIndex {
  private readonly chairOccupancy: Map<string, Map<number, Appointment | ChairMaintenanceBlock>>;
  private readonly doctorOccupancy: Map<string, Map<number, Appointment>>;
  private readonly patientOccupancy: Map<string, Map<number, Appointment>>;
  private readonly inactiveChairIds: Set<string>;

  public readonly dateKey: string;
  public readonly timezone: string;

  constructor(options: {
    dateKey: string;
    appointments?: readonly Appointment[] | null;
    chairMaintenanceBlocks?: readonly ChairMaintenanceBlock[] | null;
    chairs?: ReadonlyArray<{ id: string; name?: string; active?: boolean }> | null;
    timezone?: string;
    toDateTimeLocalValue?: (iso: string, tz?: string | null) => string;
  }) {
    this.dateKey = options.dateKey;
    this.timezone = options.timezone ?? "Europe/Moscow";

    const buckets = buildQuantumBuckets(this.dateKey, this.timezone, options);
    this.chairOccupancy = buckets.chairOccupancy;
    this.doctorOccupancy = buckets.doctorOccupancy;
    this.patientOccupancy = buckets.patientOccupancy;
    this.inactiveChairIds = buckets.inactiveChairIds;
  }

  public checkCollision(params: QuantumCollisionParams): QuantumCollisionResult {
    return checkQuantumQuanta(
      this.chairOccupancy, this.doctorOccupancy, this.patientOccupancy,
      this.inactiveChairIds, params,
    );
  }

  public isChairFree(chairId: string, slotHour: string, durationMinutes = 30, excludeApptId?: string): boolean {
    return !this.checkCollision({ chairId, slotHour, durationMinutes, excludeAppointmentId: excludeApptId ?? null }).hasCollision;
  }

  public isDoctorFree(doctorUserId: string, slotHour: string, durationMinutes = 30, excludeApptId?: string): boolean {
    return !this.checkCollision({ doctorUserId, slotHour, durationMinutes, excludeAppointmentId: excludeApptId ?? null }).hasCollision;
  }

  public findNearestFreeWindow(params: {
    chairId?: string | null | undefined; doctorUserId?: string | null | undefined; patientId?: string | null | undefined;
    startingHour: string; durationMinutes: number; excludeAppointmentId?: string | null | undefined;
  }): QuantumSlotAlternative | null {
    return findQuantumFreeWindow(
      this.dateKey,
      (hour) => this.checkCollision({ ...params, slotHour: hour }),
      params.startingHour,
      params.durationMinutes,
      this.timezone,
    );
  }

  public findNextFreeSlot(params: {
    chairId?: string | null | undefined; doctorUserId?: string | null | undefined; patientId?: string | null | undefined;
    preferredStartHour?: string | undefined; durationMinutes?: number | undefined; excludeAppointmentId?: string | null | undefined;
  }): QuantumSlotAlternative | null {
    return this.findNearestFreeWindow({
      chairId: params.chairId, doctorUserId: params.doctorUserId, patientId: params.patientId,
      startingHour: params.preferredStartHour || "08:00", durationMinutes: params.durationMinutes || 30,
      excludeAppointmentId: params.excludeAppointmentId,
    });
  }
}
