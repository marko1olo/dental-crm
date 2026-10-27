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
        <div
          className="dente-segmented-bar w-full flex items-center p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] overflow-x-auto"
          role="group"
          aria-label="Быстрый выбор длительности"
        >
          {DURATION_PRESETS.map((preset) => {
            const isSelected = durationMinutes === preset.minutes;
            const displayHint = (preset as any).serviceHint || (preset as any).hint || "";
            const displayLabel = (preset as any).label || `${preset.minutes} мин`;
            return (
              <button
                key={preset.minutes}
                type="button"
                onClick={() => handleSelectDuration(preset.minutes)}
                className={`dente-segmented-item flex-1 min-w-0 !h-9 sm:!h-9 !min-h-[36px] px-2 rounded-lg text-xs font-medium transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 ${
                  isSelected
                    ? "active !bg-[var(--paper)] !text-[var(--teal)] !border-[var(--teal)] shadow-xs font-semibold"
                    : "!text-[var(--muted)] hover:!text-[var(--ink)]"
                }`}
                data-testid={`duration-preset-${preset.minutes}`}
                data-active={isSelected}
                aria-pressed={isSelected}
              >
                <span className="font-semibold whitespace-nowrap">{displayLabel}</span>
                {displayHint ? (
                  <span
                    className={`text-[10px] whitespace-nowrap ${
                      isSelected
                        ? "text-[var(--teal)] opacity-90 font-medium"
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
