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
                className={`h-8 min-h-[32px] max-h-[32px] px-2.5 rounded-lg text-xs font-medium transition-all inline-flex items-center gap-1 cursor-pointer select-none active:scale-95 ${
                  isSelected
                    ? "primary-button shadow-sm font-semibold"
                    : "quick-chip text-[var(--ink)]"
                }`}
                data-testid={`duration-preset-${preset.minutes}`}
              >
                <span className="font-semibold">{displayLabel}</span>
                {displayHint ? (
                  <span
                    className={`text-[10px] ${
                      isSelected
                        ? "text-teal-100 font-medium"
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
