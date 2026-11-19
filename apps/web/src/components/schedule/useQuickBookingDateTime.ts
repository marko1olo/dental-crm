import { useCallback } from "react";
import {
  fromDateTimeLocalValue as canonicalFromDateTimeLocalValue,
  toDateTimeLocalValue as canonicalToDateTimeLocalValue,
} from "../../utils/dateTimeUtils";

export function useQuickBookingDateTime(
  timezone: string,
  toDateTimeLocalValue?: ((iso: string, tz?: string | null) => string) | undefined,
  fromDateTimeLocalValue?: ((local: string, tz?: string | null) => string) | undefined,
) {
  const toLocal = useCallback(
    (iso: string) =>
      typeof toDateTimeLocalValue === "function"
        ? toDateTimeLocalValue(iso, timezone)
        : canonicalToDateTimeLocalValue(iso, timezone),
    [toDateTimeLocalValue, timezone],
  );

  const fromLocal = useCallback(
    (local: string) => {
      if (typeof fromDateTimeLocalValue === "function") {
        return fromDateTimeLocalValue(local, timezone);
      }
      if (!local) return new Date().toISOString();
      return canonicalFromDateTimeLocalValue(local, timezone);
    },
    [fromDateTimeLocalValue, timezone],
  );

  return { toLocal, fromLocal };
}
