import React from "react";
import { Clock, Zap } from "lucide-react";
import type { TargetSlotInfo } from "../waitlistCancellationEngine";

export interface WaitlistTargetSlotBannerProps {
  targetSlot: TargetSlotInfo;
}

export function WaitlistTargetSlotBanner({ targetSlot }: WaitlistTargetSlotBannerProps) {
  return (
    <div
      className="p-3 mx-3.5 sm:mx-4 mt-3 rounded-xl bg-gradient-to-r from-[var(--teal)]/15 via-[var(--teal)]/10 to-teal-500/5 border border-[var(--teal)]/30 flex flex-col gap-2 shrink-0 shadow-2xs"
      data-testid="waitlist-target-slot-banner"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--teal-dark,var(--teal))]">
          <Zap className="w-4 h-4 text-amber-400 fill-current shrink-0" />
          <span>Освободившийся слот для автозаполнения:</span>
        </div>
        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/30">
          Горящее окно
        </span>
      </div>

      <div className="text-xs text-[var(--ink)] font-semibold flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
          {new Date(targetSlot.startsAt).toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "short",
            weekday: "short",
          })}{" "}
          {new Date(targetSlot.startsAt).toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
          })}
          –
          {new Date(targetSlot.endsAt).toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        {targetSlot.doctorName && (
          <span className="truncate max-w-[200px]">
            · Врач: {targetSlot.doctorName}
          </span>
        )}
        {targetSlot.chairName && (
          <span className="truncate max-w-[140px]">
            · {targetSlot.chairName}
          </span>
        )}
      </div>

      {targetSlot.freedBecause && (
        <div className="text-[11px] text-[var(--muted)] italic truncate">
          Причина освобождения: {targetSlot.freedBecause}
        </div>
      )}
    </div>
  );
}
