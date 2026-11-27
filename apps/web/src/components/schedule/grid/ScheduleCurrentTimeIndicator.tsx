import React, { useEffect, useState, useMemo } from "react";
import {
  extractWallTimePartsInTimeZone,
  resolveValidIanaTimeZone,
} from "@dental/shared";

export interface ScheduleCurrentTimeIndicatorProps {
  timeSlots: string[];
  gridStep: number;
  dateKey: string;
  timezone?: string;
  baseSlotHeightPx?: number;
  leftOffset?: string;
  now?: Date | undefined;
}

function parseSlotMinutes(slot: string): number {
  const [hStr, mStr] = slot.split(":");
  const h = Number.parseInt(hStr || "0", 10);
  const m = Number.parseInt(mStr || "0", 10);
  return h * 60 + m;
}

export function getCurrentTimeInfo(
  dateKey: string,
  timezone?: string,
  nowInput?: Date,
) {
  const now = nowInput ?? new Date();
  const tz = resolveValidIanaTimeZone(timezone);
  const wall = extractWallTimePartsInTimeZone(now, tz);
  const todayStr = wall?.dateKey ?? now.toISOString().slice(0, 10);
  const nowHours = wall?.hours ?? now.getUTCHours();
  const nowMinutes = wall?.minutes ?? now.getUTCMinutes();

  const isToday = !dateKey || dateKey === "today" || dateKey === todayStr;
  const currentTotalMinutes = nowHours * 60 + nowMinutes;
  const timeFormatted = `${String(nowHours).padStart(2, "0")}:${String(nowMinutes).padStart(2, "0")}`;

  return { isToday, currentTotalMinutes, timeFormatted };
}

/**
 * ScheduleCurrentTimeIndicator — DENTE Realtime Schedule Timeline Indicator.
 * Renders a crisp red horizontal line across all chairs at the exact current time (e.g. 09:50)
 * with a red time pill on the time axis and a pulsing marker.
 */
export const ScheduleCurrentTimeIndicator: React.FC<ScheduleCurrentTimeIndicatorProps> = ({
  timeSlots,
  gridStep,
  dateKey,
  timezone,
  baseSlotHeightPx = 52,
  leftOffset = "clamp(88px, 6.5vw, 96px)",
  now,
}) => {
  const [timeInfo, setTimeInfo] = useState(() =>
    getCurrentTimeInfo(dateKey, timezone, now),
  );

  // Ticking update every 30 seconds
  useEffect(() => {
    setTimeInfo(getCurrentTimeInfo(dateKey, timezone, now));
    if (now) return undefined;
    const interval = setInterval(() => {
      setTimeInfo(getCurrentTimeInfo(dateKey, timezone));
    }, 30_000);
    if (
      typeof interval === "object" &&
      interval !== null &&
      "unref" in interval &&
      typeof (interval as { unref: () => void }).unref === "function"
    ) {
      (interval as { unref: () => void }).unref();
    }
    return () => clearInterval(interval);
  }, [dateKey, timezone, now]);

  const indicatorLayout = useMemo(() => {
    if (!timeInfo.isToday || timeSlots.length === 0) return null;

    const firstSlot = timeSlots[0];
    const lastSlot = timeSlots[timeSlots.length - 1];
    if (!firstSlot || !lastSlot) return null;

    const firstSlotMinutes = parseSlotMinutes(firstSlot);
    const lastSlotMinutes = parseSlotMinutes(lastSlot);
    const totalSlotRangeEnd = lastSlotMinutes + gridStep;

    const currentMinutes = timeInfo.currentTotalMinutes;
    if (currentMinutes < firstSlotMinutes || currentMinutes > totalSlotRangeEnd) {
      return null;
    }

    const slotIndex = Math.min(
      timeSlots.length - 1,
      Math.max(0, Math.floor((currentMinutes - firstSlotMinutes) / gridStep)),
    );
    const slotStartMin = firstSlotMinutes + slotIndex * gridStep;
    const minutesIntoSlot = currentMinutes - slotStartMin;
    const fraction = Math.max(0, Math.min(1, minutesIntoSlot / gridStep));

    return {
      rowIndex: slotIndex + 1,
      offsetPx: fraction * baseSlotHeightPx,
      timeFormatted: timeInfo.timeFormatted,
    };
  }, [timeInfo, timeSlots, gridStep, baseSlotHeightPx]);

  if (!indicatorLayout) return null;

  return (
    <div
      className="schedule-current-time-indicator pointer-events-none z-30 relative w-full flex items-center select-none"
      style={{
        gridColumn: "1 / -1",
        gridRow: indicatorLayout.rowIndex,
        height: 0,
        marginTop: `${indicatorLayout.offsetPx}px`,
      }}
      data-testid="schedule-current-time-indicator"
      data-time-formatted={indicatorLayout.timeFormatted}
      role="presentation"
      aria-hidden="true"
    >
      {/* 1. Red Time Pill on the left time axis */}
      <div className="absolute left-1 flex items-center gap-1 -translate-y-1/2 z-40 pointer-events-auto">
        <span
          className="bg-rose-500 hover:bg-rose-600 text-white font-mono font-bold text-[10px] px-1.5 py-0.5 rounded-full shadow-md flex items-center gap-1 transition-all"
          title={`Текущее время в клинике: ${indicatorLayout.timeFormatted}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span>{indicatorLayout.timeFormatted}</span>
        </span>
      </div>

      {/* 2. Red Axis Intersection Dot */}
      <div
        className="absolute -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-[var(--paper)] shadow-md z-40"
        style={{ left: leftOffset }}
      />

      {/* 3. Red Line spanning across all chair tracks */}
      <div className="w-full h-[2px] bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
    </div>
  );
};
