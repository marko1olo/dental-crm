const WEEKDAY_NAMES: Readonly<Record<string, number>> = {
  вс: 0, воскресенье: 0, sunday: 0, sun: 0,
  пн: 1, понедельник: 1, monday: 1, mon: 1,
  вт: 2, вторник: 2, tuesday: 2, tue: 2,
  ср: 3, среда: 3, wednesday: 3, wed: 3,
  чт: 4, четверг: 4, thursday: 4, thu: 4,
  пт: 5, пятница: 5, friday: 5, fri: 5,
  сб: 6, суббота: 6, saturday: 6, sat: 6,
};

export function parsePreferredWeekday(raw: unknown): number | null {
  if (typeof raw === "number") {
    return Number.isInteger(raw) && raw >= 0 && raw <= 6 ? raw : null;
  }
  if (typeof raw !== "string") return null;
  const value = raw.trim().toLowerCase();
  if (!value) return null;
  const byName = WEEKDAY_NAMES[value];
  if (byName !== undefined) return byName;
  if (/^[0-6]$/.test(value)) return Number(value);
  const asDate = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : null;
  if (asDate && !Number.isNaN(asDate.getTime())) return asDate.getDay();
  return null;
}

export function parseTimeToMinutes(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  const clean = raw.trim();
  const m = /(\d{1,2}):(\d{2})/.exec(clean);
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
}

export function checkTimeWindowFit(
  slotStartsAt: string,
  preferredTimeRanges?: Array<{ day?: string; slot?: string }> | any,
): boolean {
  if (!slotStartsAt) return true;
  if (!Array.isArray(preferredTimeRanges) || preferredTimeRanges.length === 0) return true;

  const date = new Date(slotStartsAt);
  const timeMatch = /T(\d{2}):(\d{2})/.exec(slotStartsAt);
  const hour = timeMatch ? Number(timeMatch[1]) : !Number.isNaN(date.getTime()) ? date.getHours() : 10;
  const minute = timeMatch ? Number(timeMatch[2]) : !Number.isNaN(date.getTime()) ? date.getMinutes() : 0;
  const slotMinute = hour * 60 + minute;
  const slotWeekday = !Number.isNaN(date.getTime()) ? date.getDay() : null;
  const isWeekend = slotWeekday === 0 || slotWeekday === 6;
  const dateStrMatch = /^(\d{4}-\d{2}-\d{2})/.exec(slotStartsAt);
  const slotDateStr = dateStrMatch ? dateStrMatch[1] : null;

  const isMorning = slotMinute >= 8 * 60 && slotMinute < 12 * 60;
  const isDay = slotMinute >= 12 * 60 && slotMinute < 17 * 60;
  const isEvening = slotMinute >= 17 * 60 && slotMinute <= 21 * 60;

  return preferredTimeRanges.some((tr) => {
    if (!tr || typeof tr !== "object") return true;
    const dayStr = String(tr.day || "").trim().toLowerCase();
    const slotStr = String(tr.slot || "").trim().toLowerCase();

    let dayFits = true;
    if (dayStr && !dayStr.includes("any") && !dayStr.includes("любой") && !dayStr.includes("all")) {
      if (dayStr.includes("weekend") || dayStr.includes("выходн")) dayFits = isWeekend;
      else if (dayStr.includes("weekdays") || dayStr.includes("будни")) dayFits = !isWeekend;
      else if (slotDateStr && dayStr === slotDateStr) dayFits = true;
      else {
        const parsedDay = parsePreferredWeekday(dayStr);
        if (parsedDay !== null && slotWeekday !== null) dayFits = parsedDay === slotWeekday;
      }
    }
    if (!dayFits) return false;

    if (!slotStr || slotStr.includes("any") || slotStr.includes("любое") || slotStr.includes("весь")) return true;

    const intervalParts = slotStr.split(/[-–—]/);
    if (intervalParts.length === 2) {
      const fromMin = parseTimeToMinutes(intervalParts[0]);
      const toMin = parseTimeToMinutes(intervalParts[1]);
      if (fromMin !== null && toMin !== null && toMin > fromMin) {
        return slotMinute >= fromMin && slotMinute < toMin;
      }
    }

    const singleMin = parseTimeToMinutes(slotStr);
    if (singleMin !== null) return slotMinute >= singleMin && slotMinute < singleMin + 30;

    if (isMorning && (slotStr.includes("утр") || slotStr.includes("morning") || slotStr.includes("09:00"))) return true;
    if (isDay && (slotStr.includes("день") || slotStr.includes("day") || slotStr.includes("12:00"))) return true;
    if (isEvening && (slotStr.includes("вечер") || slotStr.includes("evening") || slotStr.includes("17:00"))) return true;

    return false;
  });
}
