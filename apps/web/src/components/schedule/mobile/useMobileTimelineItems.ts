import { useMemo } from "react";
import type { Appointment } from "@dental/shared";
import type { TimelineItem } from "./scheduleMobileAgendaTypes";

export interface UseMobileTimelineItemsParams {
  filteredDayAppointments: Appointment[];
  toDateTimeLocalValue: (iso: string, tz?: string) => string;
  timezone: string;
}

export function useMobileTimelineItems({
  filteredDayAppointments,
  toDateTimeLocalValue,
  timezone,
}: UseMobileTimelineItemsParams): TimelineItem[] {
  return useMemo(() => {
    const items: TimelineItem[] = [];
    if (filteredDayAppointments.length === 0) return items;

    let prev: Appointment | undefined;
    for (const current of filteredDayAppointments) {
      const currentStartLocal = toDateTimeLocalValue(current.startsAt, timezone);
      const currentEndLocal = toDateTimeLocalValue(current.endsAt, timezone);
      const currentStartDate = new Date(current.startsAt);
      const currentEndDate = new Date(current.endsAt);
      const durationMinutes = Math.max(15, Math.round((currentEndDate.getTime() - currentStartDate.getTime()) / 60000));

      if (prev) {
        const prevEndDate = new Date(prev.endsAt);
        const gapMinutes = Math.round((currentStartDate.getTime() - prevEndDate.getTime()) / 60000);
        if (gapMinutes >= 15) {
          const prevEndLocal = toDateTimeLocalValue(prev.endsAt, timezone);
          items.push({
            type: "gap",
            startsAt: prev.endsAt,
            endsAt: current.startsAt,
            durationMinutes: gapMinutes,
            startsAtLocal: prevEndLocal.slice(11, 16),
            endsAtLocal: currentStartLocal.slice(11, 16),
          });
        }
      }

      items.push({
        type: "appointment",
        appointment: current,
        startsAtLocal: currentStartLocal.slice(11, 16),
        endsAtLocal: currentEndLocal.slice(11, 16),
        durationMinutes,
      });

      prev = current;
    }
    return items;
  }, [filteredDayAppointments, toDateTimeLocalValue, timezone]);
}
