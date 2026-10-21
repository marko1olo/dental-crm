import React from "react";
import { DURATION_PRESETS } from "./quickServicePresets";

export function QuickDurationPresetsRow({
  durationMinutes,
  handleSelectDuration,
}: {
  durationMinutes: number;
  handleSelectDuration: (mins: number) => void;
}) {
  return (
    <div className="sm:col-span-2">
      <span className="text-xs font-semibold text-[var(--muted)] block mb-1">
        Длительность: {durationMinutes} мин
      </span>
      <div data-testid="quick-booking-duration-presets" className="mt-1">
        <span className="text-xs font-bold text-[var(--muted)] block mb-1.5">
          Быстрый выбор длительности:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {DURATION_PRESETS.map((preset) => {
            const isSelected = durationMinutes === preset.minutes;
            const displayHint = (preset as any).serviceHint || (preset as any).hint || "";
            const displayLabel = (preset as any).label || `${preset.minutes} мин`;
            return (
              <button
                key={preset.minutes}
                type="button"
                onClick={() => handleSelectDuration(preset.minutes)}
                className={`min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all inline-flex items-center gap-1.5 cursor-pointer select-none active:scale-95 border ${
                  isSelected
                    ? "bg-[linear-gradient(180deg,var(--teal-fill),var(--teal-dark))] text-[var(--on-teal)] border-[var(--teal-dark)] shadow-sm font-semibold"
                    : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
                }`}
                data-testid={`duration-preset-${preset.minutes}`}
              >
                <span className="font-semibold">{displayLabel}</span>
                {displayHint ? (
                  <span
                    className={`text-[10px] ${
                      isSelected
                        ? "text-[var(--on-teal)] opacity-90 font-medium"
                        : "text-[var(--muted)]"
                    }`}
                  >
                    · {displayHint}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
