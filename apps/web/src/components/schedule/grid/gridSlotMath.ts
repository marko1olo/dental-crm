import type { Appointment } from "@dental/shared";

export function extractTeethList(appointment: Appointment): string[] {
  if (!appointment) return [];
  const explicitTeeth = (appointment as any)?.teeth;
  if (Array.isArray(explicitTeeth) && explicitTeeth.length > 0) {
    return explicitTeeth.map(String);
  }
  const singleTooth =
    (appointment as any)?.toothNumber || (appointment as any)?.tooth;
  if (singleTooth) {
    return [String(singleTooth)];
  }
  const text = `${appointment.reason || ""} ${appointment.comment || ""}`;
  if (!text.trim()) return [];
  const matches = text.match(/\b([1-4][1-8]|[5-8][1-5])\b/g);
  if (matches && matches.length > 0) {
    return Array.from(new Set(matches));
  }
  return [];
}

export function generateTimeSlots(stepMinutes: 15 | 30 | 60 = 60): string[] {
  const slots: string[] = [];
  for (let h = 8; h <= 20; h++) {
    for (let m = 0; m < 60; m += stepMinutes) {
      if (h === 20 && m > 0) break;
      const hh = h < 10 ? `0${h}` : `${h}`;
      const mm = m < 10 ? `0${m}` : `${m}`;
      slots.push(`${hh}:${mm}`);
    }
  }
  return slots;
}

/**
 * Безопасная сборка ISO дат слота (Мандат 8e / 8n) без вылетов RangeError: Invalid time value.
 * Корректно нормализует dateKey (YYYY-MM-DD) и hour (H, HH, HH:mm, HH:mm:ss).
 */
export function safeBuildSlotIso(
  dateKey: string,
  hour: string,
  durationMinutes = 30,
): { startIso: string; endIso: string } {
  const cleanDate = dateKey
    ? dateKey.slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const dur =
    Number.isFinite(durationMinutes) && durationMinutes > 0
      ? durationMinutes
      : 30;

  let cleanHour = "09:00:00";
  if (typeof hour === "string" && hour.trim()) {
    const parts = hour
      .trim()
      .split(":")
      .map((p) => p.trim());
    const p0 = (parts[0] || "09").padStart(2, "0");
    const p1 = (parts[1] || "00").padStart(2, "0");
    const p2 = (parts[2] ? parts[2].slice(0, 2) : "00").padStart(2, "0");
    if (parts.length === 1) {
      cleanHour = `${p0}:00:00`;
    } else if (parts.length === 2) {
      cleanHour = `${p0}:${p1}:00`;
    } else if (parts.length >= 3) {
      cleanHour = `${p0}:${p1}:${p2}`;
    }
  }

  const candidateStartIso = `${cleanDate}T${cleanHour}.000Z`;
  const parsedMs = Date.parse(candidateStartIso);
  const startMs = Number.isFinite(parsedMs) ? parsedMs : Date.now();
  const startIso = new Date(startMs).toISOString();
  const endIso = new Date(startMs + dur * 60_000).toISOString();

  return { startIso, endIso };
}

/**
 * O(1) Slot Lookup Map by `${doctorId}_${timeSlot}`.
 * Single-pass indexing of appointments into a Map to eliminate thousands of .filter()
 * and temporary array allocations in render loops on low-spec Celeron CPUs.
 */
export function buildDoctorSlotAppointmentsMap(
  appointments: Appointment[],
  dateKey: string,
  timeSlots: string[],
  gridStep = 30,
  toDateTimeLocalValue?:
    ((iso: string, tz?: string | null) => string) | undefined,
  timezone = "Europe/Moscow",
): Map<string, Appointment[]> {
  const map = new Map<string, Appointment[]>();
  const validSlotsSet = new Set(timeSlots);

  const safeAppts = appointments || [];
  for (const a of safeAppts) {
    const localDate = toDateTimeLocalValue
      ? toDateTimeLocalValue(a.startsAt, timezone).slice(0, 10)
      : a.startsAt.slice(0, 10);
    if (localDate !== dateKey) continue;

    const startStr = toDateTimeLocalValue
      ? toDateTimeLocalValue(a.startsAt, timezone).slice(11, 16)
      : a.startsAt.slice(11, 16);
    const [sH, sM] = startStr.split(":").map(Number);
    const startMin = (sH ?? 0) * 60 + (sM ?? 0);

    const docId = a.doctorUserId || "unassigned";

    // Direct O(1) mathematical slot key calculation
    const slotStartMin = Math.floor(startMin / gridStep) * gridStep;
    const h = Math.floor(slotStartMin / 60);
    const m = slotStartMin % 60;
    const slotStr = `${h < 10 ? `0${h}` : h}:${m < 10 ? `0${m}` : m}`;

    if (validSlotsSet.has(slotStr)) {
      const key = `${docId}_${slotStr}`;
      let list = map.get(key);
      if (!list) {
        list = [];
        map.set(key, list);
      }
      list.push(a);
    }
  }

  return map;
}
