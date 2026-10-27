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
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-[var(--muted)]">
          Длительность: <strong className="text-[var(--ink)]">{durationMinutes} мин</strong>
        </span>
      </div>
      <div data-testid="quick-booking-duration-presets" className="mt-1">
        <span className="text-xs font-bold text-[var(--muted)] block mb-1.5">
          Быстрый выбор длительности:
        </span>
        <div
          className="dente-segmented-bar w-full flex items-center p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] overflow-x-auto gap-1"
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
                className={`dente-segmented-item flex-1 min-w-[54px] min-h-[44px] sm:min-h-[36px] sm:h-9 px-2 rounded-lg text-xs font-medium transition-all inline-flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 cursor-pointer select-none active:scale-95 border ${
                  isSelected
                    ? "active bg-[var(--paper)] text-[var(--ink)] border-[var(--line-strong,var(--line))] shadow-2xs font-semibold"
                    : "border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50"
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
                        ? "text-[var(--muted)] font-normal"
                        : "text-[var(--muted)] opacity-80"
                    }`}
                  >
                    <span className="hidden sm:inline">· </span>{displayHint}
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
