import { useCallback } from "react";

export function useQuickBookingDateTime(
  timezone: string,
  toDateTimeLocalValue?: ((iso: string, tz?: string | null) => string) | undefined,
  fromDateTimeLocalValue?: ((local: string, tz?: string | null) => string) | undefined,
) {
  const toLocal = useCallback(
    (iso: string) => (typeof toDateTimeLocalValue === "function" ? toDateTimeLocalValue(iso, timezone) : new Date(iso).toISOString().slice(0, 16)),
    [toDateTimeLocalValue, timezone],
  );

  const fromLocal = useCallback(
    (local: string) => {
      if (typeof fromDateTimeLocalValue === "function") return fromDateTimeLocalValue(local, timezone);
      if (!local) return new Date().toISOString();
      const withZ = local.includes("Z") ? local : `${local}:00.000Z`;
      const parsed = new Date(withZ);
      return Number.isNaN(parsed.getTime()) ? new Date(local).toISOString() : parsed.toISOString();
    },
    [fromDateTimeLocalValue, timezone],
  );

  return { toLocal, fromLocal };
}
