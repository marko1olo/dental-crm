import {
  QUANTUM_MINUTES,
  CLINIC_DAY_END_MINUTES,
  parseTimeToMinutes,
  formatMinutesToTime,
  snapMinutesTo15Min,
} from "./quantumTimeUtils";
import type { QuantumCollisionResult, QuantumSlotAlternative } from "./quantumEngineTypes";

export function findQuantumFreeWindow(
  dateKey: string,
  checkFn: (hour: string) => QuantumCollisionResult,
  startingHour: string,
  durationMinutes: number,
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
      const startIso = `${dateKey}T${candHour}:00.000Z`;
      const endHour = formatMinutesToTime(candidateMin + durationMinutes);
      const endIso = `${dateKey}T${endHour}:00.000Z`;
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
