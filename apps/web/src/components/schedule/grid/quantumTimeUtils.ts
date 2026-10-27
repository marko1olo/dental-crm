export const QUANTUM_MINUTES = 15;
export const CLINIC_DAY_START_MINUTES = 8 * 60; // 08:00 = 480
export const CLINIC_DAY_END_MINUTES = 21 * 60; // 21:00 = 1260

/**
 * Parses time string (e.g. "09:30", "09:30:00", "9:15") or ISO timestamp into minutes from midnight (0..1440).
 */
export function parseTimeToMinutes(timeStr: string | null | undefined): number {
  if (!timeStr) return CLINIC_DAY_START_MINUTES;

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
