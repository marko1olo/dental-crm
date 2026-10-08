import { Flame, Sparkles, X } from "lucide-react";
import React from "react";

export interface QuickBookingDrawerHeaderProps {
  isEmergencyMode: boolean;
  startsAtLocal: string;
  durationMinutes: number;
  onClose: () => void;
}

export function QuickBookingDrawerHeader({
  isEmergencyMode,
  startsAtLocal,
  durationMinutes,
  onClose,
}: QuickBookingDrawerHeaderProps) {
  return (
    <div
      className={`p-5 border-b flex items-center justify-between transition-colors ${
        isEmergencyMode
          ? "bg-rose-500/15 dark:bg-rose-950/50 border-rose-500/40 text-rose-900 dark:text-rose-100"
          : "bg-[var(--paper-soft)] border-[var(--line)]"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`p-2.5 rounded-xl border transition-all ${
            isEmergencyMode
              ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/50 ring-2 ring-rose-500/40 animate-pulse"
              : "bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal,var(--brand-primary))] border-[var(--teal,var(--brand-primary))]/20"
          }`}
        >
          {isEmergencyMode ? (
            <Flame size={22} className="text-rose-600 dark:text-rose-400" />
          ) : (
            <Sparkles size={20} />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold tracking-tight text-[var(--ink)] m-0">
              {isEmergencyMode
                ? "Срочная запись: острая боль"
                : "Быстрая запись на прием"}
            </h3>
            {isEmergencyMode && (
              <span
                className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-extrabold uppercase tracking-wider animate-pulse shadow-xs"
                data-testid="cito-header-badge"
              >
                Острая боль
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--muted)] m-0 mt-0.5">
            {startsAtLocal
              ? `${startsAtLocal.slice(0, 10)} в ${startsAtLocal.slice(11, 16)}`
              : "Быстрая запись"}{" "}
            · {durationMinutes} мин
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-colors cursor-pointer"
        aria-label="Закрыть"
        data-testid="quick-booking-close-btn"
      >
        <X size={20} />
      </button>
    </div>
  );
}
